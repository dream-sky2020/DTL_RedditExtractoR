import os
import json
import time
import subprocess
import requests
import re
import hashlib
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TASKS_DIR = os.path.join(PROJECT_ROOT, 'tasks')
CACHE_DIR = os.path.join(PROJECT_ROOT, 'public', 'cache')
CACHE_PUBLIC_BASE_URL = 'http://127.0.0.1:5000/cache'

IMAGE_BLOCK_RE = re.compile(r'(\[image[^\]]*\])(.+?)(\[/image\])', re.IGNORECASE | re.DOTALL)
GALLERY_BLOCK_RE = re.compile(r'(\[gallery[^\]]*\])(.+?)(\[/gallery\])', re.IGNORECASE | re.DOTALL)

def update_task_file(task_id, updates):
    """更新正在运行的任务文件内容"""
    path = os.path.join(TASKS_DIR, 'running', f"{task_id}.json")
    if not os.path.exists(path):
        return None
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            task = json.load(f)
        
        task.update(updates)
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(task, f, ensure_ascii=False, indent=2)
        return task
    except Exception as e:
        print(f"更新任务文件失败 {task_id}: {e}")
        return None

def download_resource(url, context='unknown'):
    if not url or not url.startswith('http'):
        return url
    
    url_hash = hashlib.md5(url.encode()).hexdigest()
    ext = os.path.splitext(url.split('?')[0])[1] or '.png'
    filename = f"res_{url_hash}{ext}"
    filepath = os.path.join(CACHE_DIR, filename)
    
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

def run_worker():
    print("--------------------------------------")
    print("RedditExtractor Render Worker 已启动")
    print("正在监听任务队列...")
    print("--------------------------------------")

    while True:
        # 1. 检查队列
        queued_dir = os.path.join(TASKS_DIR, 'queued')
        files = [f for f in os.listdir(queued_dir) if f.endswith('.json')]
        
        if not files:
            time.sleep(2)
            continue
        
        # 获取最老的一个任务
        files.sort()
        filename = files[0]
        task_id = filename.replace('.json', '')
        
        queued_path = os.path.join(queued_dir, filename)
        running_path = os.path.join(TASKS_DIR, 'running', filename)
        
        try:
            # 2. 移动到运行目录
            os.rename(queued_path, running_path)
            print(f"🚀 开始处理任务: {task_id}")
            
            with open(running_path, 'r', encoding='utf-8') as f:
                task = json.load(f)
            
            update_task_file(task_id, {
                "status": "running",
                "startedAt": datetime.now().isoformat(),
                "progress": {"percent": 5, "task": "准备资源...", "detail": ""}
            })
            
            # 3. 预处理资源
            video_config = task.get('config', {})
            process_config_urls(video_config)
            
            # 写入临时的 video-config.json 供 render.js 使用
            temp_config_path = os.path.join(PROJECT_ROOT, f"video-config-{task_id}.json")
            with open(temp_config_path, 'w', encoding='utf-8') as f:
                json.dump(video_config, f, ensure_ascii=False, indent=2)
            
            # 4. 调用渲染脚本
            script_path = os.path.join(PROJECT_ROOT, 'scripts', 'render.js')
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            env["NODE_SKIP_PLATFORM_CHECK"] = "1"
            
            re_bundle = re.compile(r'Bundling\s+(\d+)%')
            re_render = re.compile(r'Rendered\s+(\d+)/(\d+)')
            
            # 确保输出目录存在
            os.makedirs(os.path.join(PROJECT_ROOT, 'out'), exist_ok=True)
            output_filename = f"video-{task_id}.mp4"
            output_path = os.path.join(PROJECT_ROOT, 'out', output_filename)
            
            process = subprocess.Popen(
                ['node', script_path, f'--config=video-config-{task_id}.json', f'--output=out/{output_filename}'],
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
                    
                    # 检查是否被取消
                    if not os.path.exists(running_path):
                        print(f"🛑 任务 {task_id} 已被取消，正在停止进程...")
                        process.terminate()
                        break

                    bundle_match = re_bundle.search(text)
                    render_match = re_render.search(text)
                    
                    progress = None
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
                    
                    if progress:
                        update_task_file(task_id, {"progress": progress})
            
            process.wait()
            
            # 5. 处理结果
            # 如果任务还在 running 目录（没被取消）
            if os.path.exists(running_path):
                with open(running_path, 'r', encoding='utf-8') as f:
                    final_task = json.load(f)
                
                final_task['endedAt'] = datetime.now().isoformat()
                
                if process.returncode == 0:
                    final_task['status'] = 'success'
                    final_task['progress'] = {"percent": 100, "task": "渲染成功", "detail": ""}
                    final_task['outputPath'] = os.path.abspath(output_path)
                    target_dir = 'success'
                else:
                    final_task['status'] = 'error'
                    final_task['message'] = f"渲染失败，错误码: {process.returncode}"
                    target_dir = 'error'
                
                # 移动到最终目录
                final_path = os.path.join(TASKS_DIR, target_dir, filename)
                with open(final_path, 'w', encoding='utf-8') as f:
                    json.dump(final_task, f, ensure_ascii=False, indent=2)
                os.remove(running_path)
                print(f"🏁 任务 {task_id} 处理完成: {final_task['status']}")
            
            # 清理临时配置文件
            if os.path.exists(temp_config_path):
                os.remove(temp_config_path)
                
        except Exception as e:
            print(f"🔥 处理任务 {task_id} 时发生异常: {e}")
            # 尝试移动到错误目录
            if os.path.exists(running_path):
                try:
                    with open(running_path, 'r', encoding='utf-8') as f:
                        err_task = json.load(f)
                    err_task['status'] = 'error'
                    err_task['message'] = str(e)
                    err_task['endedAt'] = datetime.now().isoformat()
                    
                    error_path = os.path.join(TASKS_DIR, 'error', filename)
                    with open(error_path, 'w', encoding='utf-8') as f:
                        json.dump(err_task, f, ensure_ascii=False, indent=2)
                    os.remove(running_path)
                except:
                    pass

if __name__ == '__main__':
    run_worker()
