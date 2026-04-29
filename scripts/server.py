import subprocess
import json
import os
import requests
import re
import uuid
import threading
import traceback
import time
from collections import deque
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 允许跨域请求

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CACHE_PUBLIC_BASE_URL = 'http://127.0.0.1:5000/cache'

ALLOWED_AUDIO_EXTENSIONS = ('.mp3', '.wav', '.ogg', '.m4a', '.aac')
MANIFEST_FILENAME = 'audio-manifest.json'
IMAGE_BLOCK_RE = re.compile(r'(\[image[^\]]*\])(.+?)(\[/image\])', re.IGNORECASE | re.DOTALL)
GALLERY_BLOCK_RE = re.compile(r'(\[gallery[^\]]*\])(.+?)(\[/gallery\])', re.IGNORECASE | re.DOTALL)
RE_BUNDLE = re.compile(r'Bundling\s+(\d+)%')
RE_RENDER = re.compile(r'Rendered\s+(\d+)/(\d+)')

tasks_lock = threading.RLock()
state_file_lock = threading.Lock()
tasks = {}
task_queue = deque()
active_task_id = None
active_processes = {}
worker_event = threading.Event()


class RenderCancelled(Exception):
    pass


def project_path(*parts):
    return os.path.join(PROJECT_ROOT, *parts)


TASKS_STATE_PATH = project_path('out', 'render-tasks.json')
TASK_CONFIG_DIR = project_path('out', 'render-task-configs')
TASK_OUTPUT_DIR = project_path('out', 'render-task-outputs')


def get_cache_dir():
    return project_path('public', 'cache')


def get_audio_dir():
    return project_path('public', 'audio')


def get_audio_manifest_path():
    return os.path.join(get_audio_dir(), MANIFEST_FILENAME)


def normalize_path(path):
    return path.replace('\\', '/')


def is_valid_audio_path(path):
    normalized = normalize_path(path)
    if '..' in normalized:
        return False
    if not normalized.startswith('public/audio/'):
        return False
    return normalized.lower().endswith(ALLOWED_AUDIO_EXTENSIONS)


def scan_audio_files():
    audio_dir = get_audio_dir()
    if not os.path.exists(audio_dir):
        return []

    audio_files = []
    for root, dirs, files in os.walk(audio_dir):
        _ = dirs  # 明确保留目录遍历行为
        for file in files:
            if file.lower().endswith(ALLOWED_AUDIO_EXTENSIONS):
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, PROJECT_ROOT)
                audio_files.append(normalize_path(relative_path))

    return sorted(audio_files)


def normalize_manifest_item(item):
    alias = item.get('alias', '')
    category = item.get('category', '')
    tags = item.get('tags', [])

    if not isinstance(alias, str):
        alias = str(alias)
    if not isinstance(category, str):
        category = str(category)
    if not isinstance(tags, list):
        tags = [str(tags)]

    cleaned_tags = []
    for tag in tags:
        tag_text = str(tag).strip()
        if tag_text:
            cleaned_tags.append(tag_text)

    return {
        "alias": alias.strip(),
        "tags": cleaned_tags,
        "category": category.strip(),
        "previewVolume": normalize_preview_volume(item.get('previewVolume', 0.5)),
    }


def normalize_preview_volume(value):
    try:
        volume = float(value)
    except (TypeError, ValueError):
        return 0.5
    if volume < 0:
        return 0.0
    if volume > 1:
        return 1.0
    return round(volume, 3)


def load_audio_manifest():
    manifest_path = get_audio_manifest_path()
    if not os.path.exists(manifest_path):
        return {"version": 1, "items": {}}

    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception:
        return {"version": 1, "items": {}}

    if not isinstance(data, dict):
        return {"version": 1, "items": {}}

    raw_items = data.get('items', {})
    if not isinstance(raw_items, dict):
        raw_items = {}

    normalized_items = {}
    for path, item in raw_items.items():
        if not isinstance(path, str) or not isinstance(item, dict):
            continue
        normalized_path = normalize_path(path)
        if not is_valid_audio_path(normalized_path):
            continue
        normalized_items[normalized_path] = normalize_manifest_item(item)

    return {
        "version": int(data.get('version', 1)),
        "updatedAt": data.get('updatedAt'),
        "items": dict(sorted(normalized_items.items(), key=lambda x: x[0])),
    }


def save_audio_manifest(manifest):
    manifest_path = get_audio_manifest_path()
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)

    cleaned_manifest = {
        "version": int(manifest.get('version', 1)),
        "updatedAt": datetime.now().isoformat(timespec='seconds'),
        "items": dict(sorted(manifest.get('items', {}).items(), key=lambda x: x[0])),
    }

    temp_manifest_path = f"{manifest_path}.tmp"
    with open(temp_manifest_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_manifest, f, ensure_ascii=False, indent=2)
    os.replace(temp_manifest_path, manifest_path)
    return cleaned_manifest


def now_iso():
    return datetime.now().isoformat(timespec='seconds')


def ensure_task_dirs():
    os.makedirs(os.path.dirname(TASKS_STATE_PATH), exist_ok=True)
    os.makedirs(TASK_CONFIG_DIR, exist_ok=True)
    os.makedirs(TASK_OUTPUT_DIR, exist_ok=True)


def safe_write_json_file(target_path, payload, retries=6, base_delay=0.05):
    """
    Windows 下 os.replace 在目标文件被短暂占用时可能抛 PermissionError。
    这里用唯一临时文件 + 重试，提高并发写入稳定性。
    """
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    last_error = None
    for attempt in range(retries):
        temp_path = f"{target_path}.{uuid.uuid4().hex}.tmp"
        try:
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp_path, target_path)
            return
        except PermissionError as e:
            last_error = e
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass
            time.sleep(base_delay * (attempt + 1))
        except Exception:
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass
            raise
    raise last_error if last_error else RuntimeError(f"写入文件失败: {target_path}")


def write_tasks_state():
    with state_file_lock:
        ensure_task_dirs()
        serializable = {
            "tasks": list(tasks.values()),
            "queue": list(task_queue),
            "activeTaskId": active_task_id,
            "updatedAt": now_iso(),
        }
        safe_write_json_file(TASKS_STATE_PATH, serializable)


def load_tasks_state():
    if not os.path.exists(TASKS_STATE_PATH):
        return
    try:
        with open(TASKS_STATE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        loaded_tasks = data.get("tasks", [])
        loaded_queue = data.get("queue", [])
        if isinstance(loaded_tasks, list):
            for task in loaded_tasks:
                if not isinstance(task, dict):
                    continue
                task_id = task.get("id")
                if not isinstance(task_id, str):
                    continue
                status = task.get("status")
                if status == "running":
                    task["status"] = "error"
                    task["error"] = "服务重启导致任务中断，请重新提交任务。"
                    task["message"] = task["error"]
                    task["endedAt"] = now_iso()
                elif status == "queued":
                    # queued 状态可恢复并继续排队
                    pass
                task["lastUpdatedAt"] = now_iso()
                tasks[task_id] = task
        if isinstance(loaded_queue, list):
            for task_id in loaded_queue:
                if task_id in tasks and tasks[task_id].get("status") == "queued":
                    task_queue.append(task_id)
    except Exception as e:
        print(f"⚠️ 加载渲染任务状态失败: {str(e)}")


def sorted_tasks():
    return sorted(
        tasks.values(),
        key=lambda item: item.get('createdAt', ''),
        reverse=True
    )


def enqueue_render_task(video_config):
    task_id = uuid.uuid4().hex[:12]
    title = video_config.get('title') if isinstance(video_config, dict) else ''
    task = {
        "id": task_id,
        "title": (title or '').strip() or f"渲染任务 {task_id}",
        "status": "queued",
        "progress": {"percent": 0, "task": "等待队列中"},
        "message": "任务已加入队列",
        "detail": "",
        "createdAt": now_iso(),
        "startedAt": None,
        "endedAt": None,
        "lastUpdatedAt": now_iso(),
        "cancelRequested": False,
        "outputPath": None,
        "error": None,
        "requestConfig": video_config,
    }
    tasks[task_id] = task
    task_queue.append(task_id)
    write_tasks_state()
    worker_event.set()
    return task


def update_task(task_id, **kwargs):
    with tasks_lock:
        task = tasks.get(task_id)
        if not task:
            return None
        task.update(kwargs)
        task['lastUpdatedAt'] = now_iso()
        write_tasks_state()
        return task


def is_cancel_requested(task_id):
    task = tasks.get(task_id)
    return bool(task and task.get('cancelRequested'))


def assert_not_cancelled(task_id):
    if is_cancel_requested(task_id):
        raise RenderCancelled("任务已取消")


def preprocess_video_config(task_id, video_config):
    cache_dir = get_cache_dir()
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir, exist_ok=True)
        print(f"📁 已创建缓存目录: {cache_dir}")

    download_failures = []

    def download_resource(url, context='unknown'):
        assert_not_cancelled(task_id)
        if not url or not url.startswith('http'):
            return url

        import hashlib
        url_hash = hashlib.md5(url.encode()).hexdigest()
        ext = os.path.splitext(url.split('?')[0])[1] or '.png'
        filename = f"res_{url_hash}{ext}"
        filepath = os.path.join(cache_dir, filename)

        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            return f"{CACHE_PUBLIC_BASE_URL}/{filename}"

        try:
            print(f"📥 正在缓存资源: {url}")
            res = requests.get(url, timeout=10, stream=True)
            res.raise_for_status()
            with open(filepath, 'wb') as f:
                for chunk in res.iter_content(chunk_size=8192):
                    assert_not_cancelled(task_id)
                    f.write(chunk)
            return f"{CACHE_PUBLIC_BASE_URL}/{filename}"
        except RenderCancelled:
            raise
        except Exception as e:
            print(f"⚠️ 资源下载失败 ({url}): {str(e)}")
            download_failures.append({
                "url": url,
                "context": context,
                "error": str(e),
            })
            return url

    def rewrite_media_sequence(content, tag_name):
        segments = [seg.strip() for seg in content.split(',')]
        rebuilt = []
        for idx, seg in enumerate(segments):
            assert_not_cancelled(task_id)
            if not seg:
                continue
            parts = seg.split('|', 1)
            media_url = parts[0].strip()
            duration = parts[1].strip() if len(parts) > 1 else ''
            if media_url.startswith('http'):
                media_url = download_resource(media_url, context=f"{tag_name}[{idx}]")
            rebuilt.append(f"{media_url}|{duration}" if duration else media_url)
        return ', '.join(rebuilt)

    def rewrite_media_tags_in_text(text):
        assert_not_cancelled(task_id)
        if not isinstance(text, str):
            return text
        if '[image' not in text and '[gallery' not in text:
            return text

        def image_repl(match):
            return f"{match.group(1)}{rewrite_media_sequence(match.group(2), 'image')}{match.group(3)}"

        def gallery_repl(match):
            return f"{match.group(1)}{rewrite_media_sequence(match.group(2), 'gallery')}{match.group(3)}"

        text = IMAGE_BLOCK_RE.sub(image_repl, text)
        text = GALLERY_BLOCK_RE.sub(gallery_repl, text)
        return text

    def process_config_urls(data):
        assert_not_cancelled(task_id)
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str) and value.startswith('http') and any(k in key.lower() for k in ['url', 'avatar', 'image', 'src']):
                    data[key] = download_resource(value, context=f"field:{key}")
                elif isinstance(value, str):
                    data[key] = rewrite_media_tags_in_text(value)
                else:
                    process_config_urls(value)
        elif isinstance(data, list):
            for i in range(len(data)):
                process_config_urls(data[i])

    process_config_urls(video_config)

    if download_failures:
        deduped_failures = []
        seen = set()
        for item in download_failures:
            signature = f"{item.get('url', '')}|{item.get('context', '')}|{item.get('error', '')}"
            if signature in seen:
                continue
            seen.add(signature)
            deduped_failures.append(item)
        raise RuntimeError(json.dumps({
            "message": "资源预下载失败，已中断渲染。请检查网络后重试。",
            "failedCount": len(deduped_failures),
            "failedResources": deduped_failures,
        }, ensure_ascii=False))

    return video_config


def run_task_process(task_id):
    task = tasks.get(task_id)
    if not task:
        return

    output_filename = f"video_{task_id}.mp4"
    config_filename = f"video-config-{task_id}.json"
    config_path = os.path.join(TASK_CONFIG_DIR, config_filename)
    output_rel = os.path.join('out', 'render-task-outputs', output_filename).replace('\\', '/')
    output_abs = project_path('out', 'render-task-outputs', output_filename)

    video_config = json.loads(json.dumps(task.get('requestConfig', {}), ensure_ascii=False))
    preprocessed = preprocess_video_config(task_id, video_config)
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(preprocessed, f, ensure_ascii=False, indent=2)

    script_path = project_path('scripts', 'render.js')
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["NODE_SKIP_PLATFORM_CHECK"] = "1"

    process = subprocess.Popen(
        ['node', script_path, f'--config={config_path}', f'--output={output_rel}'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=False,
        env=env,
        bufsize=0,
        cwd=PROJECT_ROOT
    )
    active_processes[task_id] = process

    while True:
        assert_not_cancelled(task_id)
        line = process.stdout.readline()
        if not line and process.poll() is not None:
            break
        if not line:
            continue
        text = line.decode('utf-8', errors='replace').strip()
        if not text:
            continue

        progress = None
        bundle_match = RE_BUNDLE.search(text)
        render_match = RE_RENDER.search(text)
        if bundle_match:
            percent = int(bundle_match.group(1))
            progress = {"percent": percent, "task": "正在打包视频资源...", "detail": text}
        elif render_match:
            current = int(render_match.group(1))
            total = int(render_match.group(2))
            percent = int((current / total) * 100)
            progress = {"percent": percent, "task": "正在渲染视频帧...", "detail": f"{current}/{total}"}
        elif "Encoding" in text:
            progress = {"percent": 95, "task": "正在编码合成视频...", "detail": "即将完成"}
        elif any(kw in text for kw in ["Génération", "Generation", "Starting"]):
            progress = {"percent": 5, "task": "初始化渲染引擎...", "detail": text}

        if progress:
            update_task(task_id, progress=progress, detail=progress.get('detail', ''), message=progress.get('task', ''))

    process.stdout.close()
    process.wait()
    active_processes.pop(task_id, None)

    if is_cancel_requested(task_id):
        raise RenderCancelled("任务已取消")

    if process.returncode == 0:
        update_task(
            task_id,
            status='success',
            progress={"percent": 100, "task": "✅ 渲染完成", "detail": output_abs},
            message="渲染成功",
            outputPath=output_abs,
            endedAt=now_iso(),
            requestConfig=None
        )
    else:
        raise RuntimeError(f"渲染失败，错误码: {process.returncode}")


def rendering_worker():
    global active_task_id
    while True:
        worker_event.wait()
        task_id = None
        with tasks_lock:
            if task_queue:
                task_id = task_queue.popleft()
            else:
                worker_event.clear()
                continue
            task = tasks.get(task_id)
            if not task:
                continue
            if task.get('cancelRequested'):
                update_task(task_id, status='cancelled', message='任务已取消', endedAt=now_iso(), requestConfig=None)
                continue
            active_task_id = task_id
            update_task(
                task_id,
                status='running',
                startedAt=now_iso(),
                progress={"percent": 1, "task": "初始化渲染引擎...", "detail": ""},
                message='任务开始执行'
            )

        try:
            run_task_process(task_id)
        except RenderCancelled:
            update_task(
                task_id,
                status='cancelled',
                progress={"percent": tasks.get(task_id, {}).get('progress', {}).get('percent', 0), "task": "已取消", "detail": ""},
                message='任务已取消',
                endedAt=now_iso(),
                requestConfig=None
            )
            process = active_processes.get(task_id)
            if process and process.poll() is None:
                process.terminate()
            active_processes.pop(task_id, None)
        except Exception as e:
            err_msg = str(e)
            try:
                decoded = json.loads(err_msg)
                err_msg = decoded.get("message", err_msg)
                update_task(task_id, failedResources=decoded.get("failedResources", []), failedCount=decoded.get("failedCount", 0))
            except Exception:
                pass
            print(f"🔥 渲染任务失败 {task_id}: {traceback.format_exc()}")
            update_task(
                task_id,
                status='error',
                message=err_msg,
                error=err_msg,
                endedAt=now_iso(),
                requestConfig=None
            )
            process = active_processes.get(task_id)
            if process and process.poll() is None:
                process.terminate()
            active_processes.pop(task_id, None)
        finally:
            with tasks_lock:
                active_task_id = None
                if task_queue:
                    worker_event.set()


with tasks_lock:
    ensure_task_dirs()
    load_tasks_state()
    if task_queue:
        worker_event.set()

render_worker_thread = threading.Thread(target=rendering_worker, daemon=True)
render_worker_thread.start()

@app.route('/fetch_reddit', methods=['GET'])
def fetch_reddit():
    target_url = request.args.get('url')
    if not target_url:
        return jsonify({"success": False, "message": "未提供目标 URL"}), 400

    def normalize_cookie_input(raw_cookie):
        if not raw_cookie:
            return ''
        text = str(raw_cookie).strip()
        if not text:
            return ''
        # 兼容浏览器导出的 Cookie JSON 数组
        if text.startswith('['):
            try:
                data = json.loads(text)
                if isinstance(data, list):
                    pairs = []
                    for item in data:
                        if not isinstance(item, dict):
                            continue
                        name = str(item.get('name', '')).strip()
                        value = str(item.get('value', '')).strip()
                        if name:
                            pairs.append(f"{name}={value}")
                    return '; '.join(pairs)
            except Exception:
                pass
        return text

    def normalize_reddit_json_url(url):
        parsed = urlparse(url)
        path = (parsed.path or '').rstrip('/')
        if path and not path.endswith('.json'):
            path = f"{path}.json"
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        if "raw_json" not in query:
            query["raw_json"] = "1"
        return urlunparse(parsed._replace(path=path or parsed.path, query=urlencode(query)))

    def with_old_reddit(url):
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        if host.startswith('www.reddit.com'):
            return urlunparse(parsed._replace(netloc='old.reddit.com'))
        if host == 'reddit.com':
            return urlunparse(parsed._replace(netloc='old.reddit.com'))
        return url

    try:
        normalized_url = normalize_reddit_json_url(target_url)
        print(f"📡 正在代理抓取: {normalized_url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        # 优先使用前端传入的 Cookie（便于临时调试），其次使用环境变量
        reddit_cookie = normalize_cookie_input(request.headers.get('X-Reddit-Cookie', ''))
        if not reddit_cookie:
            reddit_cookie = os.environ.get('REDDIT_COOKIE', '').strip()
        reddit_bearer = os.environ.get('REDDIT_BEARER_TOKEN', '').strip()
        if reddit_cookie:
            headers['Cookie'] = reddit_cookie
        if reddit_bearer:
            headers['Authorization'] = f'Bearer {reddit_bearer}'
        response = requests.get(normalized_url, headers=headers, timeout=15, allow_redirects=True)
        content_type = response.headers.get('content-type', '')
        is_html = 'text/html' in content_type.lower()

        # 如果拿到 HTML（常见于 www.reddit.com 返回前端页面），尝试 old.reddit.com 兜底
        if response.status_code == 200 and is_html:
            fallback_url = with_old_reddit(normalized_url)
            if fallback_url != normalized_url:
                print(f"↪️ JSON 抓取回退至: {fallback_url}")
                fallback_response = requests.get(fallback_url, headers=headers, timeout=15, allow_redirects=True)
                if fallback_response.status_code == 200:
                    try:
                        return jsonify(fallback_response.json())
                    except Exception:
                        response = fallback_response
                        content_type = response.headers.get('content-type', '')

        body_text = response.text or ''
        body_preview = body_text[:300].replace('\n', ' ').replace('\r', ' ')

        blocked_by_security = (
            response.status_code in (401, 403, 429)
            and (
                'blocked by network security' in body_text.lower()
                or 'whoa there, pardner' in body_text.lower()
                or 'you\'ve been blocked' in body_text.lower()
            )
        )

        if response.status_code >= 400:
            if blocked_by_security:
                return jsonify({
                    "success": False,
                    "message": "Reddit 风控拦截（网络安全策略）。可尝试切换网络，或在后端环境变量设置 REDDIT_COOKIE / REDDIT_BEARER_TOKEN 后重试。",
                    "statusCode": response.status_code,
                    "contentType": content_type,
                    "url": normalized_url,
                    "bodyPreview": body_preview,
                }), 502
            return jsonify({
                "success": False,
                "message": f"Reddit 返回 HTTP {response.status_code}，可能触发限流或风控。",
                "statusCode": response.status_code,
                "contentType": content_type,
                "url": normalized_url,
                "bodyPreview": body_preview,
            }), 502

        try:
            payload = response.json()
        except Exception as parse_err:
            return jsonify({
                "success": False,
                "message": f"Reddit 返回内容不是有效 JSON: {str(parse_err)}",
                "statusCode": response.status_code,
                "contentType": content_type,
                "url": normalized_url,
                "bodyPreview": body_preview,
            }), 502

        return jsonify(payload)
    except Exception as e:
        print(f"❌ 抓取失败: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/render', methods=['POST'])
def render_video():
    try:
        video_config = request.json
        if not video_config:
            return jsonify({"success": False, "message": "未提供配置数据"}), 400
        with tasks_lock:
            task = enqueue_render_task(video_config)
            queue_position = len(task_queue)
        return jsonify({
            "success": True,
            "message": "渲染任务已加入队列",
            "task": task,
            "queuePosition": queue_position
        })
    except Exception as e:
        print(f"💥 系统错误: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/render/tasks', methods=['GET'])
def get_render_tasks():
    with tasks_lock:
        return jsonify({
            "success": True,
            "tasks": sorted_tasks(),
            "activeTaskId": active_task_id,
            "queue": list(task_queue),
        })


@app.route('/render/tasks/<task_id>', methods=['GET'])
def get_render_task(task_id):
    with tasks_lock:
        task = tasks.get(task_id)
        if not task:
            return jsonify({"success": False, "message": "任务不存在"}), 404
        return jsonify({"success": True, "task": task})


@app.route('/render/tasks/<task_id>/cancel', methods=['POST'])
def cancel_render_task(task_id):
    with tasks_lock:
        task = tasks.get(task_id)
        if not task:
            return jsonify({"success": False, "message": "任务不存在"}), 404

        status = task.get('status')
        if status in ['success', 'error', 'cancelled']:
            return jsonify({"success": False, "message": f"任务当前状态为 {status}，无需取消"}), 400

        task['cancelRequested'] = True
        if status == 'queued':
            try:
                task_queue.remove(task_id)
            except ValueError:
                pass
            update_task(
                task_id,
                status='cancelled',
                progress={"percent": task.get('progress', {}).get('percent', 0), "task": "已取消", "detail": ""},
                message='任务已取消',
                endedAt=now_iso(),
                requestConfig=None
            )
            return jsonify({"success": True, "message": "排队任务已取消", "task": tasks.get(task_id)})

        process = active_processes.get(task_id)
        if process and process.poll() is None:
            process.terminate()
        update_task(task_id, message='已请求取消，正在终止渲染进程...')
        return jsonify({"success": True, "message": "已发送取消请求", "task": tasks.get(task_id)})


def cleanup_task_artifacts(task):
    task_id = task.get('id')
    if not task_id:
        return
    config_path = os.path.join(TASK_CONFIG_DIR, f"video-config-{task_id}.json")
    output_path = task.get('outputPath')
    try:
        if os.path.exists(config_path):
            os.remove(config_path)
    except Exception as e:
        print(f"⚠️ 删除任务配置失败 {config_path}: {str(e)}")
    try:
        if output_path and isinstance(output_path, str) and os.path.exists(output_path):
            os.remove(output_path)
    except Exception as e:
        print(f"⚠️ 删除任务输出失败 {output_path}: {str(e)}")


@app.route('/render/tasks/<task_id>', methods=['DELETE'])
def delete_render_task(task_id):
    with tasks_lock:
        task = tasks.get(task_id)
        if not task:
            return jsonify({"success": False, "message": "任务不存在"}), 404
        if task.get('status') in ['queued', 'running']:
            return jsonify({"success": False, "message": "任务仍在执行或排队，请先取消"}), 400

        task_queue_snapshot = list(task_queue)
        if task_id in task_queue_snapshot:
            return jsonify({"success": False, "message": "任务仍在队列中，请先取消"}), 400

        cleanup_task_artifacts(task)
        tasks.pop(task_id, None)
        write_tasks_state()
        return jsonify({"success": True, "message": "任务已清除"})


@app.route('/render/tasks/cleanup', methods=['POST'])
def cleanup_render_tasks():
    body = request.json or {}
    statuses = body.get('statuses')
    if not isinstance(statuses, list):
        statuses = ['success', 'error', 'cancelled']
    statuses = [s for s in statuses if s in ['success', 'error', 'cancelled']]
    if not statuses:
        return jsonify({"success": False, "message": "无有效状态"}), 400

    removed_ids = []
    with tasks_lock:
        for task_id, task in list(tasks.items()):
            if task.get('status') in statuses:
                cleanup_task_artifacts(task)
                tasks.pop(task_id, None)
                removed_ids.append(task_id)
        write_tasks_state()

    return jsonify({
        "success": True,
        "message": f"已清理 {len(removed_ids)} 个任务",
        "removedTaskIds": removed_ids
    })


@app.route('/cache/<path:filename>', methods=['GET'])
def serve_cached_file(filename):
    cache_dir = get_cache_dir()
    return send_from_directory(cache_dir, filename)

@app.route('/list_audio', methods=['GET'])
def list_audio():
    try:
        audio_files = scan_audio_files()
        manifest = load_audio_manifest()
        manifest_items = manifest.get('items', {})

        merged_items = []
        for path in audio_files:
            metadata = manifest_items.get(path, {})
            merged_items.append({
                "path": path,
                "alias": metadata.get('alias', ''),
                "tags": metadata.get('tags', []),
                "category": metadata.get('category', ''),
                "previewVolume": normalize_preview_volume(metadata.get('previewVolume', 0.5)),
                "exists": True,
            })

        stale_items = []
        for path, metadata in manifest_items.items():
            if path not in audio_files:
                stale_items.append({
                    "path": path,
                    "alias": metadata.get('alias', ''),
                    "tags": metadata.get('tags', []),
                    "category": metadata.get('category', ''),
                    "previewVolume": normalize_preview_volume(metadata.get('previewVolume', 0.5)),
                    "exists": False,
                })

        return jsonify({
            "success": True,
            "files": audio_files,
            "items": merged_items,
            "staleItems": stale_items,
            "manifest": manifest,
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/audio_manifest', methods=['POST'])
def update_audio_manifest():
    try:
        body = request.json or {}
        if not isinstance(body, dict):
            return jsonify({"success": False, "message": "请求体必须是 JSON 对象"}), 400

        incoming_items = body.get('items')
        if incoming_items is None:
            return jsonify({"success": False, "message": "缺少 items 字段"}), 400
        if not isinstance(incoming_items, dict):
            return jsonify({"success": False, "message": "items 必须是对象"}), 400

        current_manifest = load_audio_manifest()
        merged_items = dict(current_manifest.get('items', {}))

        invalid_paths = []
        for raw_path, raw_metadata in incoming_items.items():
            if not isinstance(raw_path, str):
                invalid_paths.append(str(raw_path))
                continue

            path = normalize_path(raw_path)
            if not is_valid_audio_path(path):
                invalid_paths.append(path)
                continue

            if raw_metadata is None:
                merged_items.pop(path, None)
                continue

            if not isinstance(raw_metadata, dict):
                return jsonify({"success": False, "message": f"音频 {path} 的 metadata 必须是对象或 null"}), 400

            merged_items[path] = normalize_manifest_item(raw_metadata)

        if invalid_paths:
            return jsonify({
                "success": False,
                "message": "存在非法音频路径，仅允许 public/audio 下的音频文件",
                "invalidPaths": invalid_paths,
            }), 400

        if body.get('pruneMissingFiles') is True:
            disk_paths = set(scan_audio_files())
            merged_items = {path: meta for path, meta in merged_items.items() if path in disk_paths}

        saved_manifest = save_audio_manifest({
            "version": current_manifest.get('version', 1),
            "items": merged_items,
        })

        return jsonify({
            "success": True,
            "message": "音频 manifest 已保存",
            "manifest": saved_manifest,
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    print("--------------------------------------")
    print("RedditExtractor Python 后端已启动")
    print("监听地址: http://localhost:5000")
    print("并发模式: threaded=True")
    print("--------------------------------------")
    app.run(host='127.0.0.1', port=5000, threaded=True, use_reloader=False)
