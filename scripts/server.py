import json
import os
import requests
import re
import uuid
import shutil
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
try:
    from scripts.filter_history import generic_filter_history, filter_reddit_history
except ImportError:
    from filter_history import generic_filter_history, filter_reddit_history

app = Flask(__name__)
CORS(app)  # 允许跨域请求

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TASKS_DIR = os.path.join(PROJECT_ROOT, 'tasks')
CACHE_DIR = os.path.join(PROJECT_ROOT, 'public', 'cache')
AUDIO_DIR = os.path.join(PROJECT_ROOT, 'public', 'audio')
BGM_DIR = os.path.join(PROJECT_ROOT, 'public', 'audio', 'bgm')
AVATAR_DIR = os.path.join(PROJECT_ROOT, 'public', 'avatar')
BACKGROUND_VIDEO_DIR = os.path.join(PROJECT_ROOT, 'public', 'background-videos')
GREEN_SCREEN_VIDEO_DIR = os.path.join(PROJECT_ROOT, 'public', 'green-screen-videos')
AD_VIDEO_DIR = os.path.join(PROJECT_ROOT, 'public', 'ad-videos')
OUTPUT_VIDEO_DIR = os.path.join(PROJECT_ROOT, 'out')
MANIFEST_FILENAME = 'audio-manifest.json'
AVATAR_MANIFEST_FILENAME = 'avatar-manifest.json'
ALLOWED_AUDIO_EXTENSIONS = ('.mp3', '.wav', '.ogg', '.m4a', '.aac')
ALLOWED_IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')
ALLOWED_BACKGROUND_VIDEO_EXTENSIONS = ('.mp4', '.webm', '.mov')
SNAPSHOT_DIR = os.path.join(PROJECT_ROOT, 'snapshots')
ENABLE_REQUEST_DEBUG_LOG = os.environ.get('SERVER_DEBUG_LOG', '1') == '1'

# 确保目录存在
for d in ['queued', 'running', 'success', 'error', 'cancelled']:
    os.makedirs(os.path.join(TASKS_DIR, d), exist_ok=True)
os.makedirs(SNAPSHOT_DIR, exist_ok=True)
os.makedirs(GREEN_SCREEN_VIDEO_DIR, exist_ok=True)
os.makedirs(AD_VIDEO_DIR, exist_ok=True)
os.makedirs(OUTPUT_VIDEO_DIR, exist_ok=True)

def project_path(*parts):
    return os.path.join(PROJECT_ROOT, *parts)

def normalize_path(path):
    return path.replace('\\', '/')

def resolve_local_video_path(path):
    if not isinstance(path, str) or not path.strip():
        return None
    candidate = path.strip()
    if not os.path.isabs(candidate):
        candidate = os.path.join(PROJECT_ROOT, candidate.lstrip('/\\'))
    candidate = os.path.abspath(os.path.normpath(candidate))
    if not candidate.lower().endswith(ALLOWED_BACKGROUND_VIDEO_EXTENSIONS):
        return None
    if not os.path.isfile(candidate):
        return None
    return candidate

def resolve_local_audio_path(path):
    if not isinstance(path, str) or not path.strip():
        return None
    candidate = path.strip()
    if not os.path.isabs(candidate):
        candidate = os.path.join(PROJECT_ROOT, candidate.lstrip('/\\'))
    candidate = os.path.abspath(os.path.normpath(candidate))
    if not candidate.lower().endswith(ALLOWED_AUDIO_EXTENSIONS):
        return None
    if not os.path.isfile(candidate):
        return None
    return candidate

def build_video_item(path, base_dir=None):
    absolute_path = os.path.abspath(path)
    stored_path = os.path.relpath(absolute_path, PROJECT_ROOT) if base_dir else absolute_path
    return {
        "name": os.path.basename(absolute_path),
        "path": normalize_path(stored_path),
        "url": f"http://localhost:5000/proxy_local_video?path={requests.utils.quote(absolute_path)}",
        "size": os.path.getsize(absolute_path),
        "updatedAt": datetime.fromtimestamp(os.path.getmtime(absolute_path)).isoformat(),
    }

def build_audio_item(path, base_dir=None):
    absolute_path = os.path.abspath(path)
    stored_path = os.path.relpath(absolute_path, PROJECT_ROOT) if base_dir else absolute_path
    return {
        "name": os.path.basename(absolute_path),
        "path": normalize_path(stored_path),
        "url": f"http://localhost:5000/proxy_local_audio?path={requests.utils.quote(absolute_path)}",
        "size": os.path.getsize(absolute_path),
        "updatedAt": datetime.fromtimestamp(os.path.getmtime(absolute_path)).isoformat(),
    }

@app.before_request
def debug_log_request():
    if not ENABLE_REQUEST_DEBUG_LOG:
        return
    origin = request.headers.get('Origin', '')
    acrm = request.headers.get('Access-Control-Request-Method', '')
    acrh = request.headers.get('Access-Control-Request-Headers', '')
    try:
        print(
            f"[REQ] {datetime.now().isoformat()} "
            f"{request.method} {request.path} "
            f"origin={origin or '-'} "
            f"preflight_method={acrm or '-'} "
            f"preflight_headers={acrh or '-'}"
        )
    except (OSError, ValueError):
        # 后台启动时 stdout 可能已经关闭；日志失败不能让正常 API 返回 500。
        pass

def get_audio_manifest_path():
    return os.path.join(AUDIO_DIR, MANIFEST_FILENAME)

def get_avatar_manifest_path():
    return os.path.join(AVATAR_DIR, AVATAR_MANIFEST_FILENAME)

def is_valid_audio_path(path):
    normalized = normalize_path(path)
    if '..' in normalized:
        return False
    if not normalized.startswith('public/audio/'):
        return False
    return normalized.lower().endswith(ALLOWED_AUDIO_EXTENSIONS)

# --- 任务管理助手 ---

def get_all_tasks():
    tasks = []
    for status in ['queued', 'running', 'success', 'error', 'cancelled']:
        status_dir = os.path.join(TASKS_DIR, status)
        for filename in os.listdir(status_dir):
            if filename.endswith('.json'):
                try:
                    with open(os.path.join(status_dir, filename), 'r', encoding='utf-8') as f:
                        task_data = json.load(f)
                        tasks.append(task_data)
                except Exception as e:
                    print(f"读取任务文件失败 {filename}: {e}")
    
    # 按创建时间排序（降序）
    return sorted(tasks, key=lambda x: x.get('createdAt', ''), reverse=True)

def find_task_file(task_id):
    for status in ['queued', 'running', 'success', 'error', 'cancelled']:
        path = os.path.join(TASKS_DIR, status, f"{task_id}.json")
        if os.path.exists(path):
            return path, status
    return None, None

# --- API 路由 ---

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
def create_render_task():
    try:
        video_config = request.json
        if not video_config:
            return jsonify({"success": False, "message": "未提供配置数据"}), 400
            
        task_id = str(uuid.uuid4())[:8]
        title = video_config.get('title', f'Task_{task_id}')
        
        task = {
            "id": task_id,
            "taskType": "video_render",
            "title": title,
            "status": "queued",
            "config": video_config,
            "progress": {"percent": 0, "task": "等待中...", "detail": ""},
            "createdAt": datetime.now().isoformat(),
            "message": "任务已加入队列"
        }
        
        task_path = os.path.join(TASKS_DIR, 'queued', f"{task_id}.json")
        with open(task_path, 'w', encoding='utf-8') as f:
            json.dump(task, f, ensure_ascii=False, indent=2)
            
        print(f"✅ 任务已创建: {task_id} ({title})")
        return jsonify({"success": True, "task": task})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/ad/render', methods=['POST'])
def create_ad_render_task():
    try:
        payload = request.json or {}
        source_path = resolve_local_video_path(payload.get('sourceVideo'))
        ad_video_path = resolve_local_video_path(payload.get('adVideo') or payload.get('greenScreenVideo'))
        mode = str(payload.get('mode', 'chroma-key'))
        if mode == 'insert':
            mode = 'plain-overlay'
        if mode not in ('chroma-key', 'plain-overlay'):
            return jsonify({"success": False, "message": "不支持的广告合成模式"}), 400
        if not source_path:
            return jsonify({"success": False, "message": "请选择存在的无广告母版视频"}), 400
        if not ad_video_path:
            return jsonify({"success": False, "message": "请选择存在的广告视频"}), 400
        if os.path.samefile(source_path, ad_video_path):
            return jsonify({"success": False, "message": "母版视频与广告视频不能是同一个文件"}), 400

        placement = payload.get('placement') or {}
        chroma_key = payload.get('chromaKey') or {}
        audio = payload.get('audio') or {}
        ad_range = payload.get('adRange') or {}
        lead_in = payload.get('leadInAudio') or {}
        lead_in_path = resolve_local_audio_path(lead_in.get('path')) if lead_in.get('path') else None
        if lead_in.get('path') and not lead_in_path:
            return jsonify({"success": False, "message": "请选择存在且格式受支持的广告引导音频"}), 400
        lead_mode = str(lead_in.get('mode', 'prelude'))
        if lead_mode not in ('prelude', 'voiceover'):
            return jsonify({"success": False, "message": "不支持的引导音频模式"}), 400
        if not lead_in_path:
            lead_mode = 'prelude'
        start_at = max(0.0, float(payload.get('startAt', 0)))
        ad_range_start = max(0.0, float(ad_range.get('start', 0.0)))
        ad_range_end_value = ad_range.get('end')
        ad_range_end = max(0.0, float(ad_range_end_value)) if ad_range_end_value not in (None, '') else None
        if ad_range_end is not None and ad_range_end <= ad_range_start:
            return jsonify({"success": False, "message": "广告片段结束时间必须大于开始时间"}), 400
        x = min(1.0, max(-5.0, float(placement.get('x', 0.7))))
        y = min(1.0, max(-5.0, float(placement.get('y', 0.65))))
        width = min(5.0, max(0.02, float(placement.get('width', 0.25))))
        similarity = min(1.0, max(0.01, float(chroma_key.get('similarity', 0.3))))
        blend = min(1.0, max(0.0, float(chroma_key.get('blend', 0.08))))
        color = str(chroma_key.get('color', '0x00FF00')).strip()
        if not re.fullmatch(r'(?:0x|#)[0-9a-fA-F]{6}', color):
            return jsonify({"success": False, "message": "绿幕颜色必须是 0xRRGGBB 或 #RRGGBB"}), 400
        color = color.replace('#', '0x')

        task_id = str(uuid.uuid4())[:8]
        source_name = os.path.splitext(os.path.basename(source_path))[0]
        config = {
            "mode": mode,
            "sourceVideo": normalize_path(source_path),
            "adVideo": normalize_path(ad_video_path),
            "startAt": start_at,
            "adRange": {"start": ad_range_start, "end": ad_range_end},
            "pauseSource": bool(payload.get('pauseSource', False)),
            "placement": {"x": x, "y": y, "width": width},
            "chromaKey": {"color": color, "similarity": similarity, "blend": blend},
            "audio": {
                "enabled": bool(audio.get('enabled', True)),
                "volume": min(2.0, max(0.0, float(audio.get('volume', 1.0)))),
                "sourceVolumeDuringAd": min(1.0, max(0.0, float(audio.get('sourceVolumeDuringAd', 0.25)))),
            },
            "leadInAudio": {
                "path": normalize_path(lead_in_path) if lead_in_path else "",
                "mode": lead_mode,
                "adVideoDelay": min(3600.0, max(0.0, float(lead_in.get('adVideoDelay', 0.0)))),
                "pauseSource": bool(lead_in.get('pauseSource', False)),
                "volume": min(2.0, max(0.0, float(lead_in.get('volume', 1.0)))),
                "playbackRate": min(2.0, max(0.5, float(lead_in.get('playbackRate', 1.0)))),
            },
        }
        task = {
            "id": task_id,
            "taskType": "ad_composite",
            "title": f"广告版 · {source_name}",
            "status": "queued",
            "config": config,
            "progress": {"percent": 0, "task": "等待广告合成...", "detail": ""},
            "createdAt": datetime.now().isoformat(),
            "message": "广告合成任务已加入队列",
        }
        task_path = os.path.join(TASKS_DIR, 'queued', f"{task_id}.json")
        with open(task_path, 'w', encoding='utf-8') as f:
            json.dump(task, f, ensure_ascii=False, indent=2)
        return jsonify({"success": True, "task": task})
    except (TypeError, ValueError) as e:
        return jsonify({"success": False, "message": f"广告参数无效: {e}"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/render/tasks', methods=['GET'])
def list_tasks():
    tasks = get_all_tasks()
    active_task = next((t for t in tasks if t['status'] == 'running'), None)
    return jsonify({
        "success": True,
        "tasks": tasks,
        "activeTaskId": active_task['id'] if active_task else None
    })

@app.route('/render/tasks/<task_id>/cancel', methods=['POST'])
def cancel_task(task_id):
    path, status = find_task_file(task_id)
    if not path:
        return jsonify({"success": False, "message": "任务不存在"}), 404
    
    if status in ['success', 'error', 'cancelled']:
        return jsonify({"success": False, "message": "任务已结束，无法取消"}), 400
        
    try:
        with open(path, 'r', encoding='utf-8') as f:
            task = json.load(f)
        
        task['status'] = 'cancelled'
        task['cancelRequested'] = True
        task['endedAt'] = datetime.now().isoformat()
        task['message'] = "任务已由用户取消"
        
        # 移动文件到 cancelled 目录
        new_path = os.path.join(TASKS_DIR, 'cancelled', f"{task_id}.json")
        with open(new_path, 'w', encoding='utf-8') as f:
            json.dump(task, f, ensure_ascii=False, indent=2)
        
        os.remove(path)
        return jsonify({"success": True, "message": "任务已取消"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/render/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    path, status = find_task_file(task_id)
    if not path:
        return jsonify({"success": False, "message": "任务不存在"}), 404
        
    try:
        os.remove(path)
        return jsonify({"success": True, "message": "任务记录已删除"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/render/tasks/cleanup', methods=['POST'])
def cleanup_tasks():
    try:
        statuses = request.json.get('statuses', ['success', 'error', 'cancelled'])
        count = 0
        for status in statuses:
            status_dir = os.path.join(TASKS_DIR, status)
            if os.path.exists(status_dir):
                for filename in os.listdir(status_dir):
                    os.remove(os.path.join(status_dir, filename))
                    count += 1
        return jsonify({"success": True, "message": f"已清理 {count} 个任务"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/cache/<path:filename>', methods=['GET'])
def serve_cached_file(filename):
    return send_from_directory(CACHE_DIR, filename)

@app.route('/list_audio', methods=['GET'])
def list_audio():
    try:
        # 扫描音频文件
        audio_files = []
        if os.path.exists(AUDIO_DIR):
            for root, _, files in os.walk(AUDIO_DIR):
                for file in files:
                    if file.lower().endswith(ALLOWED_AUDIO_EXTENSIONS):
                        full_path = os.path.join(root, file)
                        relative_path = os.path.relpath(full_path, PROJECT_ROOT)
                        audio_files.append(normalize_path(relative_path))
        
        audio_files.sort()

        # 加载 manifest
        manifest_path = get_audio_manifest_path()
        manifest = {"version": 1, "items": {}}
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
        
        items = manifest.get('items', {})
        merged_items = []
        for path in audio_files:
            meta = items.get(path, {})
            merged_items.append({
                "path": path,
                "alias": meta.get('alias', ''),
                "tags": meta.get('tags', []),
                "category": meta.get('category', ''),
                "previewVolume": meta.get('previewVolume', 0.5),
                "exists": True
            })
            
        return jsonify({
            "success": True,
            "files": audio_files,
            "items": merged_items,
            "manifest": manifest
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/list_background_videos', methods=['GET'])
def list_background_videos():
    try:
        video_files = []
        if os.path.exists(BACKGROUND_VIDEO_DIR):
            for root, _, files in os.walk(BACKGROUND_VIDEO_DIR):
                for file in files:
                    if file.lower().endswith(ALLOWED_BACKGROUND_VIDEO_EXTENSIONS):
                        full_path = os.path.join(root, file)
                        relative_path = os.path.relpath(full_path, os.path.join(PROJECT_ROOT, 'public'))
                        public_relative_path = normalize_path(relative_path)
                        video_files.append({
                            "name": file,
                            "path": public_relative_path,
                            "url": f"/{public_relative_path}",
                        })

        video_files.sort(key=lambda item: item["path"])
        return jsonify({
            "success": True,
            "files": video_files,
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/ad/videos', methods=['GET'])
def list_ad_videos():
    try:
        rendered = []
        green_screens = []
        ad_videos = []
        guide_audios = []
        for root, _, files in os.walk(OUTPUT_VIDEO_DIR):
            for filename in files:
                if filename.lower().endswith(ALLOWED_BACKGROUND_VIDEO_EXTENSIONS) and '.silent.' not in filename.lower():
                    rendered.append(build_video_item(os.path.join(root, filename), OUTPUT_VIDEO_DIR))
        for root, _, files in os.walk(GREEN_SCREEN_VIDEO_DIR):
            for filename in files:
                if filename.lower().endswith(ALLOWED_BACKGROUND_VIDEO_EXTENSIONS):
                    green_screens.append(build_video_item(os.path.join(root, filename), GREEN_SCREEN_VIDEO_DIR))
        for root, _, files in os.walk(AD_VIDEO_DIR):
            for filename in files:
                if filename.lower().endswith(ALLOWED_BACKGROUND_VIDEO_EXTENSIONS):
                    ad_videos.append(build_video_item(os.path.join(root, filename), AD_VIDEO_DIR))
        for root, _, files in os.walk(AUDIO_DIR):
            for filename in files:
                if filename.lower().endswith(ALLOWED_AUDIO_EXTENSIONS):
                    guide_audios.append(build_audio_item(os.path.join(root, filename), AUDIO_DIR))
        rendered.sort(key=lambda item: item['updatedAt'], reverse=True)
        green_screens.sort(key=lambda item: item['path'])
        ad_videos.sort(key=lambda item: item['path'])
        guide_audios.sort(key=lambda item: item['path'])
        return jsonify({
            "success": True,
            "rendered": rendered,
            "greenScreens": green_screens,
            "adVideos": ad_videos + green_screens,
            "guideAudios": guide_audios,
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/list_bgm', methods=['GET'])
def list_bgm():
    try:
        bgm_files = []
        if not os.path.exists(BGM_DIR):
            os.makedirs(BGM_DIR, exist_ok=True)
            
        for root, _, files in os.walk(BGM_DIR):
            for file in files:
                if file.lower().endswith(ALLOWED_AUDIO_EXTENSIONS):
                    full_path = os.path.join(root, file)
                    relative_path = os.path.relpath(full_path, os.path.join(PROJECT_ROOT, 'public'))
                    public_relative_path = normalize_path(relative_path)
                    bgm_files.append({
                        "name": file,
                        "path": public_relative_path,
                        "url": f"/{public_relative_path}",
                    })

        bgm_files.sort(key=lambda item: item["path"])
        return jsonify({
            "success": True,
            "files": bgm_files,
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/audio_manifest', methods=['POST'])
def update_audio_manifest():
    try:
        body = request.json or {}
        incoming_items = body.get('items', {})
        
        manifest_path = get_audio_manifest_path()
        current_manifest = {"version": 1, "items": {}}
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as f:
                current_manifest = json.load(f)
        
        current_items = current_manifest.get('items', {})
        for path, meta in incoming_items.items():
            if meta is None:
                current_items.pop(path, None)
            else:
                current_items[path] = meta
                
        current_manifest['items'] = current_items
        current_manifest['updatedAt'] = datetime.now().isoformat()
        
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(current_manifest, f, ensure_ascii=False, indent=2)
            
        return jsonify({"success": True, "manifest": current_manifest})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/list_avatars', methods=['GET'])
def list_avatars():
    try:
        avatar_files = []
        if os.path.exists(AVATAR_DIR):
            for root, _, files in os.walk(AVATAR_DIR):
                for file in files:
                    if file.lower().endswith(ALLOWED_IMAGE_EXTENSIONS):
                        full_path = os.path.join(root, file)
                        relative_path = os.path.relpath(full_path, PROJECT_ROOT)
                        avatar_files.append(normalize_path(relative_path))
        
        avatar_files.sort()

        manifest_path = get_avatar_manifest_path()
        manifest = {"version": 1, "items": {}}
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
        
        items = manifest.get('items', {})
        merged_items = []
        for path in avatar_files:
            meta = items.get(path, {})
            merged_items.append({
                "path": path,
                "enabled": meta.get('enabled', True),
                "tags": meta.get('tags', []),
                "exists": True
            })
            
        return jsonify({
            "success": True,
            "files": avatar_files,
            "items": merged_items,
            "manifest": manifest
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/avatar_manifest', methods=['POST'])
def update_avatar_manifest():
    try:
        body = request.json or {}
        incoming_items = body.get('items', {})
        
        manifest_path = get_avatar_manifest_path()
        current_manifest = {"version": 1, "items": {}}
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as f:
                current_manifest = json.load(f)
        
        current_items = current_manifest.get('items', {})
        for path, meta in incoming_items.items():
            if meta is None:
                current_items.pop(path, None)
            else:
                current_items[path] = meta
                
        current_manifest['items'] = current_items
        current_manifest['updatedAt'] = datetime.now().isoformat()
        
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(current_manifest, f, ensure_ascii=False, indent=2)
            
        return jsonify({"success": True, "manifest": current_manifest})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/pick_file', methods=['GET'])
def pick_file():
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        file_path = filedialog.askopenfilename(
            title="选择图片文件",
            filetypes=[("图片文件", "*.png *.jpg *.jpeg *.gif *.webp *.bmp"), ("所有文件", "*.*")]
        )
        root.destroy()
        return jsonify({"success": True, "path": normalize_path(file_path) if file_path else ""})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/pick_video_file', methods=['GET'])
def pick_video_file():
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        file_path = filedialog.askopenfilename(
            title="选择视频文件",
            filetypes=[("视频文件", "*.mp4 *.webm *.mov"), ("所有文件", "*.*")]
        )
        root.destroy()
        resolved = resolve_local_video_path(file_path) if file_path else None
        return jsonify({
            "success": True,
            "path": normalize_path(resolved) if resolved else "",
            "item": build_video_item(resolved) if resolved else None,
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/pick_audio_file', methods=['GET'])
def pick_audio_file():
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        file_path = filedialog.askopenfilename(
            title="选择广告引导音频",
            filetypes=[("音频文件", "*.mp3 *.wav *.ogg *.m4a *.aac"), ("所有文件", "*.*")]
        )
        root.destroy()
        resolved = resolve_local_audio_path(file_path) if file_path else None
        return jsonify({
            "success": True,
            "path": normalize_path(resolved) if resolved else "",
            "item": build_audio_item(resolved) if resolved else None,
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/proxy_local_video', methods=['GET'])
def proxy_local_video():
    file_path = resolve_local_video_path(request.args.get('path'))
    if not file_path:
        return "Video file not found or unsupported", 404
    try:
        return send_from_directory(
            os.path.dirname(file_path),
            os.path.basename(file_path),
            conditional=True,
            max_age=3600,
        )
    except Exception as e:
        return str(e), 500

@app.route('/proxy_local_audio', methods=['GET'])
def proxy_local_audio():
    file_path = resolve_local_audio_path(request.args.get('path'))
    if not file_path:
        return "Audio file not found or unsupported", 404
    try:
        return send_from_directory(
            os.path.dirname(file_path),
            os.path.basename(file_path),
            conditional=True,
            max_age=3600,
        )
    except Exception as e:
        return str(e), 500

@app.route('/proxy_local_file', methods=['GET'])
def proxy_local_file():
    file_path = request.args.get('path')
    if not file_path:
        return "Missing path", 400
    
    # 转换路径分隔符并标准化
    file_path = os.path.abspath(os.path.normpath(file_path))
    
    # 安全检查：仅允许常见的图片格式
    if not file_path.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg')):
        return "Only image files are allowed", 403

    if not os.path.exists(file_path):
        return f"File not found: {file_path}", 404
        
    try:
        directory = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        # add_etags=True 和 max_age 能够利用浏览器缓存，减少重复读取磁盘
        return send_from_directory(directory, filename, last_modified=datetime.now(), max_age=3600)
    except Exception as e:
        return str(e), 500

@app.route('/snapshot/save_file', methods=['POST', 'OPTIONS'])
def save_snapshot_file():
    try:
        if request.method == 'OPTIONS':
            return jsonify({"success": True, "message": "preflight ok"}), 200

        body = request.json or {}
        scenes = body.get('scenes')
        if not isinstance(scenes, list):
            return jsonify({"success": False, "message": "无效的快照数据，scenes 必须为数组"}), 400

        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = filedialog.asksaveasfilename(
            title="保存 DSL 快照",
            initialdir=SNAPSHOT_DIR,
            initialfile=f"dsl_snapshot_{timestamp}.json",
            defaultextension=".json",
            filetypes=[("JSON 文件", "*.json"), ("所有文件", "*.*")]
        )
        root.destroy()

        if not file_path:
            return jsonify({"success": False, "cancelled": True, "message": "用户已取消保存"})

        file_path = os.path.abspath(os.path.normpath(file_path))
        parent_dir = os.path.dirname(file_path)
        os.makedirs(parent_dir, exist_ok=True)

        payload = {
            "version": 1,
            "createdAt": datetime.now().isoformat(),
            "scenes": scenes
        }
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        return jsonify({
            "success": True,
            "path": normalize_path(file_path),
            "sceneCount": len(scenes)
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/snapshot/load_file', methods=['GET', 'OPTIONS'])
def load_snapshot_file():
    try:
        if request.method == 'OPTIONS':
            return jsonify({"success": True, "message": "preflight ok"}), 200

        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        file_path = filedialog.askopenfilename(
            title="读取 DSL 快照",
            initialdir=SNAPSHOT_DIR,
            filetypes=[("JSON 文件", "*.json"), ("所有文件", "*.*")]
        )
        root.destroy()

        if not file_path:
            return jsonify({"success": False, "cancelled": True, "message": "用户已取消读取"})

        file_path = os.path.abspath(os.path.normpath(file_path))

        with open(file_path, 'r', encoding='utf-8') as f:
            payload = json.load(f)

        scenes = payload.get('scenes') if isinstance(payload, dict) else None
        if not isinstance(scenes, list):
            return jsonify({"success": False, "message": "快照文件格式无效，缺少 scenes 数组"}), 400

        return jsonify({
            "success": True,
            "path": normalize_path(file_path),
            "sceneCount": len(scenes),
            "scenes": scenes
        })
    except json.JSONDecodeError:
        return jsonify({"success": False, "message": "快照文件不是有效的 JSON"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/filter_history', methods=['POST'])
def filter_history():
    try:
        body = request.json
        if not body:
            return jsonify({"success": False, "message": "未提供数据"}), 400
        
        # 支持两种格式：
        # 1. 直接发送数组 (兼容旧版，使用默认 Reddit 规则)
        # 2. 发送 { "data": [...], "rules": {...} }
        
        if isinstance(body, list):
            history_data = body
            subreddit = request.args.get('subreddit', 'limbuscompany')
            results = filter_reddit_history(history_data, subreddit)
        else:
            history_data = body.get('data', [])
            rules = body.get('rules', {})
            
            # 如果没有提供 rules 但提供了 subreddit 参数，使用 Reddit 预设
            subreddit = request.args.get('subreddit')
            if subreddit and not rules:
                results = filter_reddit_history(history_data, subreddit)
            else:
                results = generic_filter_history(history_data, rules)
        
        return jsonify({
            "success": True,
            "results": results,
            "count": len(results)
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/debug/server_info', methods=['GET'])
def debug_server_info():
    routes = sorted([rule.rule for rule in app.url_map.iter_rules()])
    return jsonify({
        "success": True,
        "scriptFile": normalize_path(os.path.abspath(__file__)),
        "cwd": normalize_path(os.getcwd()),
        "projectRoot": normalize_path(PROJECT_ROOT),
        "hasSnapshotSaveRoute": '/snapshot/save_file' in routes,
        "hasSnapshotLoadRoute": '/snapshot/load_file' in routes,
        "routesCount": len(routes),
        "routes": routes
    })

# --- Qwen3-TTS（可选依赖：pip install -r scripts/requirements-qwen-tts.txt） ---

def import_qwen_tts_wrapper():
    try:
        from scripts import qwen_tts_wrapper
    except ImportError:
        import qwen_tts_wrapper
    return qwen_tts_wrapper


def import_qwen_tts_manifest():
    try:
        from scripts import qwen_tts_manifest
    except ImportError:
        import qwen_tts_manifest
    return qwen_tts_manifest


@app.route('/qwen_tts/status', methods=['GET'])
def qwen_tts_status():
    try:
        wrapper = import_qwen_tts_wrapper()
        ok, err = wrapper.check_dependencies()
        return jsonify({
            "success": True,
            "dependencies_ok": ok,
            "dependency_error": err or None,
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/qwen_tts/synthesize', methods=['POST'])
def qwen_tts_synthesize():
    try:
        wrapper = import_qwen_tts_wrapper()
        manifest = import_qwen_tts_manifest()
    except ImportError as e:
        return jsonify({"success": False, "message": f"封装模块加载失败: {e}"}), 500

    body = request.json or {}
    text = (body.get('text') or '').strip()
    if not text:
        return jsonify({"success": False, "message": "text 不能为空"}), 400
    if len(text) > 4000:
        return jsonify({"success": False, "message": "text 过长（上限 4000 字符）"}), 400

    language = body.get('language') or 'Chinese'
    speaker = body.get('speaker') or 'Vivian'
    instruct = body.get('instruct')
    if isinstance(instruct, str):
        instruct = instruct.strip() or None

    os.makedirs(CACHE_DIR, exist_ok=True)
    digest = wrapper.cache_digest(text, language, speaker, instruct)
    filename = wrapper.cache_filename(text, language, speaker, instruct)
    out_path = os.path.join(CACHE_DIR, filename)
    model_id = wrapper.current_tts_model_id()

    def respond_ok(sample_rate, cached):
        manifest.upsert_item(
            CACHE_DIR,
            digest=digest,
            filename=filename,
            text=text,
            language=language,
            speaker=speaker,
            instruct=instruct,
            model_id=model_id,
            sample_rate=sample_rate,
        )
        return jsonify({
            "success": True,
            "url": f"/cache/{filename}",
            "sample_rate": sample_rate,
            "filename": filename,
            "digest": digest,
            "cached": cached,
        })

    # 缓存命中时无需导入或加载 Qwen/PyTorch 模型。
    if os.path.isfile(out_path) and os.path.getsize(out_path) > 0:
        sample_rate = 0
        try:
            import soundfile as sf
            sample_rate = int(sf.info(out_path).samplerate)
        except Exception:
            pass
        return respond_ok(sample_rate, True)

    ok, err = wrapper.check_dependencies()
    if not ok:
        return jsonify({"success": False, "message": f"依赖未安装: {err}"}), 503

    try:
        sample_rate, _ = wrapper.synthesize_custom_voice_wav(
            text,
            out_path,
            language=language,
            speaker=speaker,
            instruct=instruct,
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    return respond_ok(sample_rate, False)


@app.route('/qwen_tts/index', methods=['GET'])
def qwen_tts_index():
    try:
        manifest = import_qwen_tts_manifest()
        rows = manifest.build_index_response(CACHE_DIR)
        return jsonify({"success": True, "entries": rows, "count": len(rows)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/qwen_tts/cache/<digest>', methods=['DELETE'])
def qwen_tts_delete_cache(digest):
    try:
        manifest = import_qwen_tts_manifest()
        ok, message = manifest.delete_digest_entry(CACHE_DIR, digest)
        if not ok:
            return jsonify({"success": False, "message": message}), 400
        return jsonify({"success": True, "message": message})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    print("--------------------------------------")
    print("RedditExtractor API Server 已启动")
    print("监听地址: http://localhost:5000")
    print("--------------------------------------")
    app.run(port=5000)
