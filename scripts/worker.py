import os
import json
import time
import subprocess
import requests
import re
import hashlib
import sys
import traceback
from collections import deque
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TASKS_DIR = os.path.join(PROJECT_ROOT, 'tasks')
CACHE_DIR = os.path.join(PROJECT_ROOT, 'public', 'cache')
CACHE_PUBLIC_BASE_URL = 'http://127.0.0.1:5000/cache'
TASK_IO_RETRIES = 6
TASK_IO_RETRY_DELAY = 0.08

IMAGE_BLOCK_RE = re.compile(r'(\[image[^\]]*\])(.+?)(\[/image\])', re.IGNORECASE | re.DOTALL)
GALLERY_BLOCK_RE = re.compile(r'(\[gallery[^\]]*\])(.+?)(\[/gallery\])', re.IGNORECASE | re.DOTALL)

def update_task_file(task_id, updates):
    """更新正在运行的任务文件内容"""
    path = os.path.join(TASKS_DIR, 'running', f"{task_id}.json")
    if not os.path.exists(path):
        return None

    last_error = None
    last_traceback = None
    for attempt in range(1, TASK_IO_RETRIES + 1):
        tmp_path = f"{path}.tmp"
        try:
            with open(path, 'r', encoding='utf-8') as f:
                task = json.load(f)

            task.update(updates)

            # 优先原子替换；如果在 Windows 上被并发读取锁住，则回退到覆盖写入
            with open(tmp_path, 'w', encoding='utf-8') as f:
                json.dump(task, f, ensure_ascii=False, indent=2)

            try:
                os.replace(tmp_path, path)
            except PermissionError as replace_err:
                if os.path.exists(tmp_path):
                    with open(tmp_path, 'r', encoding='utf-8') as src:
                        content = src.read()
                    with open(path, 'w', encoding='utf-8') as dst:
                        dst.write(content)
                    os.remove(tmp_path)
                    print(f"ℹ️ 任务文件回退写入 task={task_id} attempt={attempt}: {replace_err!r}")
                else:
                    raise

            return task

        except (PermissionError, OSError, MemoryError, json.JSONDecodeError) as e:
            last_error = e
            last_traceback = traceback.format_exc()
            if attempt < TASK_IO_RETRIES:
                time.sleep(TASK_IO_RETRY_DELAY * attempt)
                continue
        except Exception as e:
            last_error = e
            last_traceback = traceback.format_exc()
            break
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

    print(f"更新任务文件失败 {task_id}: {last_error!r} (path={path})")
    if last_traceback:
        print(last_traceback)
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
            print(f"🧭 任务路径 queued={queued_path} running={running_path}")
            
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
            render_config = dict(video_config)
            
            # 强制禁用 Remotion 端的音频以节省内存，音频合成由 audio_mixer.py 处理
            render_config['renderMode'] = 'final'
            render_config['disableSceneAudio'] = True
            render_config['disableAudio'] = True
            
            # 写入临时的 video-config.json 供 render.js 使用
            temp_config_path = os.path.join(PROJECT_ROOT, f"video-config-{task_id}.json")
            with open(temp_config_path, 'w', encoding='utf-8') as f:
                json.dump(render_config, f, ensure_ascii=False, indent=2)
            
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
            silent_output_filename = f"video-{task_id}.silent.mp4"
            silent_output_path = os.path.join(PROJECT_ROOT, 'out', silent_output_filename)
            
            process = subprocess.Popen(
                ['node', script_path, f'--config=video-config-{task_id}.json', f'--output=out/{silent_output_filename}'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=False,
                env=env,
                bufsize=0,
                cwd=PROJECT_ROOT
            )

            render_recent_logs = deque(maxlen=80)
            render_pipe_error = None
            
            while True:
                try:
                    line = process.stdout.readline()
                except OSError as pipe_err:
                    render_pipe_error = pipe_err
                    print(f"⚠️ 读取渲染进程管道异常 task={task_id}: {pipe_err!r}")
                    if getattr(pipe_err, 'winerror', None) == 233:
                        print("⚠️ WinError 233: 管道另一端进程已退出或句柄被关闭，将停止读取并等待进程退出。")
                    break
                if not line and process.poll() is not None:
                    break
                if line:
                    text = line.decode('utf-8', errors='replace').strip()
                    if not text: continue
                    render_recent_logs.append(text)
                    if any(k in text for k in ['Error', 'ERR', 'Exception', 'failed', 'FATAL', 'Cannot']):
                        print(f"🪵 [render:{task_id}] {text}")
                    
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
            print(f"📦 渲染进程退出 task={task_id} returncode={process.returncode}")
            if render_pipe_error is not None:
                print(f"📌 渲染阶段出现管道异常 task={task_id}: {render_pipe_error!r}")

            mix_returncode = 0
            mix_pipe_error = None
            mix_recent_logs = deque(maxlen=80)
            if process.returncode == 0 and os.path.exists(running_path):
                update_task_file(task_id, {
                    "progress": {"percent": 96, "task": "正在合成音频轨道...", "detail": "FFmpeg audio mixer"}
                })

                audio_mixer_path = os.path.join(PROJECT_ROOT, 'scripts', 'audio_mixer.py')
                mix_process = subprocess.Popen(
                    [
                        sys.executable,
                        audio_mixer_path,
                        '--config', temp_config_path,
                        '--video', silent_output_path,
                        '--output', output_path,
                    ],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    shell=False,
                    env=env,
                    bufsize=0,
                    cwd=PROJECT_ROOT
                )

                while True:
                    try:
                        line = mix_process.stdout.readline()
                    except OSError as pipe_err:
                        mix_pipe_error = pipe_err
                        print(f"⚠️ 读取音频合成进程管道异常 task={task_id}: {pipe_err!r}")
                        if getattr(pipe_err, 'winerror', None) == 233:
                            print("⚠️ WinError 233: 音频子进程已退出或关闭管道，停止读取并等待进程退出。")
                        break
                    if not line and mix_process.poll() is not None:
                        break
                    if line:
                        text = line.decode('utf-8', errors='replace').strip()
                        if text:
                            print(text)
                            mix_recent_logs.append(text)
                            update_task_file(task_id, {
                                "progress": {"percent": 98, "task": "正在封装最终 MP4...", "detail": text}
                            })

                mix_process.wait()
                mix_returncode = mix_process.returncode
                print(f"🔊 音频进程退出 task={task_id} returncode={mix_returncode}")
                if mix_pipe_error is not None:
                    print(f"📌 音频阶段出现管道异常 task={task_id}: {mix_pipe_error!r}")
            
            # 5. 处理结果
            # 如果任务还在 running 目录（没被取消）
            if os.path.exists(running_path):
                with open(running_path, 'r', encoding='utf-8') as f:
                    final_task = json.load(f)
                
                final_task['endedAt'] = datetime.now().isoformat()
                
                if process.returncode == 0 and mix_returncode == 0:
                    final_task['status'] = 'success'
                    final_task['progress'] = {"percent": 100, "task": "渲染成功", "detail": ""}
                    final_task['outputPath'] = os.path.abspath(output_path)
                    target_dir = 'success'
                else:
                    final_task['status'] = 'error'
                    final_task['message'] = f"渲染失败，错误码: render={process.returncode}, audio={mix_returncode}"
                    final_task['detail'] = json.dumps({
                        "renderReturnCode": process.returncode,
                        "audioReturnCode": mix_returncode,
                        "renderPipeError": repr(render_pipe_error) if render_pipe_error else None,
                        "audioPipeError": repr(mix_pipe_error) if mix_pipe_error else None,
                        "renderRecentLogs": list(render_recent_logs),
                        "audioRecentLogs": list(mix_recent_logs),
                    }, ensure_ascii=False)
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
            if os.path.exists(silent_output_path):
                os.remove(silent_output_path)
                
        except Exception as e:
            print(f"🔥 处理任务 {task_id} 时发生异常: {e!r}")
            print(traceback.format_exc())
            # 尝试移动到错误目录
            if os.path.exists(running_path):
                try:
                    with open(running_path, 'r', encoding='utf-8') as f:
                        err_task = json.load(f)
                    err_task['status'] = 'error'
                    err_task['message'] = str(e)
                    err_task['detail'] = traceback.format_exc()
                    err_task['endedAt'] = datetime.now().isoformat()
                    
                    error_path = os.path.join(TASKS_DIR, 'error', filename)
                    with open(error_path, 'w', encoding='utf-8') as f:
                        json.dump(err_task, f, ensure_ascii=False, indent=2)
                    os.remove(running_path)
                except:
                    pass

if __name__ == '__main__':
    run_worker()
