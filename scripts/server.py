import subprocess
import json
import os
import platform
import requests
import re
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 允许跨域请求

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
        cache_dir = os.path.join(os.getcwd(), 'public', 'cache')
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)
            print(f"📁 已创建缓存目录: {cache_dir}")

        def download_resource(url):
            if not url or not url.startswith('http'):
                return url
            
            import hashlib
            url_hash = hashlib.md5(url.encode()).hexdigest()
            ext = os.path.splitext(url.split('?')[0])[1] or '.png'
            filename = f"res_{url_hash}{ext}"
            filepath = os.path.join(cache_dir, filename)
            
            if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
                return f"cache/{filename}"
                
            try:
                print(f"📥 正在缓存资源: {url}")
                res = requests.get(url, timeout=10, stream=True)
                res.raise_for_status()
                with open(filepath, 'wb') as f:
                    for chunk in res.iter_content(chunk_size=8192):
                        f.write(chunk)
                return f"cache/{filename}"
            except Exception as e:
                print(f"⚠️ 资源下载失败 ({url}): {str(e)}")
                return url

        def process_config_urls(data):
            if isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, str) and value.startswith('http') and any(k in key.lower() for k in ['url', 'avatar', 'image', 'src']):
                        data[key] = download_resource(value)
                    else:
                        process_config_urls(value)
            elif isinstance(data, list):
                for i in range(len(data)):
                    process_config_urls(data[i])

        process_config_urls(video_config)
        # --- 资源预处理结束 ---

        # 2. 写入配置文件
        config_path = os.path.join(os.getcwd(), 'video-config.json')
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(video_config, f, ensure_ascii=False, indent=2)

        # 3. 准备执行渲染命令
        script_path = os.path.join(os.getcwd(), 'scripts', 'render.js')
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
                    shell=(platform.system() == 'Windows'),
                    env=env,
                    bufsize=0
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
                    abs_path = os.path.abspath(os.path.join(os.getcwd(), 'out', 'video.mp4'))
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

@app.route('/list_audio', methods=['GET'])
def list_audio():
    try:
        audio_dir = os.path.join(os.getcwd(), 'public', 'audio')
        if not os.path.exists(audio_dir):
            return jsonify({"success": True, "files": []})
            
        audio_files = []
        allowed_extensions = ('.mp3', '.wav', '.ogg', '.m4a', '.aac')
        
        for root, dirs, files in os.walk(audio_dir):
            for file in files:
                if file.lower().endswith(allowed_extensions):
                    full_path = os.path.join(root, file)
                    relative_path = os.path.relpath(full_path, os.getcwd())
                    relative_path = relative_path.replace('\\', '/')
                    audio_files.append(relative_path)
        
        return jsonify({"success": True, "files": audio_files})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    print("--------------------------------------")
    print("RedditExtractor Python 后端已启动")
    print("监听地址: http://localhost:5000")
    print("--------------------------------------")
    app.run(port=5000)
