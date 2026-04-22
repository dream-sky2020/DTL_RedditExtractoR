import subprocess
import json
import os
import requests
import re
from datetime import datetime
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 允许跨域请求

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CACHE_PUBLIC_BASE_URL = 'http://127.0.0.1:5000/cache'

ALLOWED_AUDIO_EXTENSIONS = ('.mp3', '.wav', '.ogg', '.m4a', '.aac')
MANIFEST_FILENAME = 'audio-manifest.json'
IMAGE_BLOCK_RE = re.compile(r'(\[image[^\]]*\])(.+?)(\[/image\])', re.IGNORECASE | re.DOTALL)
GALLERY_BLOCK_RE = re.compile(r'(\[gallery[^\]]*\])(.+?)(\[/gallery\])', re.IGNORECASE | re.DOTALL)


def project_path(*parts):
    return os.path.join(PROJECT_ROOT, *parts)


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

@app.route('/fetch_reddit', methods=['GET'])
def fetch_reddit():
    target_url = request.args.get('url')
    if not target_url:
        return jsonify({"success": False, "message": "未提供目标 URL"}), 400
    
    try:
        print(f"📡 正在代理抓取: {target_url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        }
        response = requests.get(target_url, headers=headers, timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        print(f"❌ 抓取失败: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/render', methods=['POST'])
def render_video():
    try:
        # 1. 接收前端传来的配置
        video_config = request.json
        if not video_config:
            return jsonify({"success": False, "message": "未提供配置数据"}), 400
            
        print(f"🚀 收到渲染请求: {video_config.get('title')}")

        # --- 新增资源预下载逻辑 ---
        cache_dir = get_cache_dir()
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)
            print(f"📁 已创建缓存目录: {cache_dir}")

        download_failures = []

        def download_resource(url, context='unknown'):
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
                        f.write(chunk)
                return f"{CACHE_PUBLIC_BASE_URL}/{filename}"
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

            return jsonify({
                "success": False,
                "message": "资源预下载失败，已中断渲染。请检查网络后重试。",
                "failedCount": len(deduped_failures),
                "failedResources": deduped_failures,
            }), 400
        # --- 资源预处理结束 ---

        # 2. 写入配置文件
        config_path = project_path('video-config.json')
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(video_config, f, ensure_ascii=False, indent=2)

        # 3. 准备执行渲染命令
        script_path = project_path('scripts', 'render.js')
        print("🎬 正在启动渲染引擎...")
        
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        env["NODE_SKIP_PLATFORM_CHECK"] = "1"

        # 匹配 Remotion 的进度格式
        re_bundle = re.compile(r'Bundling\s+(\d+)%')
        re_render = re.compile(r'Rendered\s+(\d+)/(\d+)')

        def generate_logs():
            try:
                process = subprocess.Popen(
                    ['node', script_path],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    shell=False,
                    env=env,
                    bufsize=0,
                    cwd=PROJECT_ROOT
                )
                
                while True:
                    line = process.stdout.readline()
                    if not line and process.poll() is not None:
                        break
                    if line:
                        text = line.decode('utf-8', errors='replace').strip()
                        if not text: continue

                        data = {"type": "log", "message": text}

                        bundle_match = re_bundle.search(text)
                        render_match = re_render.search(text)
                        
                        if bundle_match:
                            percent = int(bundle_match.group(1))
                            data = {"type": "progress", "percent": percent, "task": "正在打包视频资源...", "detail": text}
                        elif render_match:
                            current = int(render_match.group(1))
                            total = int(render_match.group(2))
                            percent = int((current / total) * 100)
                            data = {"type": "progress", "percent": percent, "task": "正在渲染视频帧...", "detail": f"{current}/{total}"}
                        elif "Encoding" in text:
                            data = {"type": "progress", "percent": 95, "task": "正在编码合成视频...", "detail": "即将完成"}
                        elif any(kw in text for kw in ["Génération", "Generation", "Starting"]):
                            data = {"type": "progress", "percent": 5, "task": "初始化渲染引擎...", "detail": text}

                        if data["type"] == "progress":
                            print(f"\r[进度 {data['percent']}%] {data['task']} {data.get('detail', '')}", end='', flush=True)
                        else:
                            print(f"\n{text}", end='', flush=True)

                        yield json.dumps(data, ensure_ascii=False) + "\n"
                
                process.stdout.close()
                process.wait()

                if process.returncode == 0:
                    abs_path = os.path.abspath(project_path('out', 'video.mp4'))
                    yield json.dumps({"type": "success", "message": "渲染成功", "path": abs_path}, ensure_ascii=False) + "\n"
                else:
                    yield json.dumps({"type": "error", "message": f"渲染失败，错误码: {process.returncode}"}, ensure_ascii=False) + "\n"
                    
            except Exception as e:
                print(f"🔥 生成器内部错误: {str(e)}")
                yield json.dumps({"type": "error", "message": f"服务器内部错误: {str(e)}"}, ensure_ascii=False) + "\n"

        return Response(generate_logs(), mimetype='application/x-ndjson')

    except Exception as e:
        print(f"💥 系统错误: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


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
    print("--------------------------------------")
    app.run(port=5000)
