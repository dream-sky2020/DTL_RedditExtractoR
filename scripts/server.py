from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import json
import os
import platform
import requests

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
        print(f"🚀 收到渲染请求: {video_config.get('title')}")

        # 2. 写入配置文件
        config_path = os.path.join(os.getcwd(), 'video-config.json')
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(video_config, f, ensure_ascii=False, indent=2)

        # 3. 准备执行渲染命令
        # 使用 node 执行我们之前写好的渲染脚本
        script_path = os.path.join(os.getcwd(), 'scripts', 'render.js')
        
        print("🎬 正在启动渲染引擎...")
        
        # 彻底修复编码问题：
        # 1. 强制使用二进制模式读取 (不设置 text=True)
        # 2. 显式设置环境变量
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        env["NODE_SKIP_PLATFORM_CHECK"] = "1"

        process = subprocess.Popen(
            ['node', script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=(platform.system() == 'Windows'),
            env=env,
            bufsize=0 # 禁用缓冲，直接读取原始字节
        )
        
        # 使用 communicate 读取原始二进制数据，不让 subprocess 内部线程尝试解码
        stdout_bin, stderr_bin = process.communicate()
        
        # 无论 stdout 还是 stderr，都用 utf-8 强制解码，非法字符直接替换
        stdout_text = stdout_bin.decode('utf-8', errors='replace') if stdout_bin else ""
        stderr_text = stderr_bin.decode('utf-8', errors='replace') if stderr_bin else ""

        if process.returncode == 0:
            # 获取绝对路径
            abs_output_path = os.path.abspath(os.path.join(os.getcwd(), 'out', 'video.mp4'))
            print(f"✅ 渲染成功！视频文件位于: {abs_output_path}")
            
            return jsonify({
                "success": True, 
                "message": f"视频渲染成功！",
                "path": abs_output_path,
                "log": stdout_text
            })
        else:
            print(f"❌ 渲染失败: {stderr_text}")
            return jsonify({
                "success": False, 
                "message": "渲染失败", 
                "error": stderr_text or stdout_text
            }), 500

    except Exception as e:
        print(f"💥 系统错误: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/list_audio', methods=['GET'])
def list_audio():
    """
    遍历 public/audio 目录下的所有音频文件
    """
    try:
        audio_dir = os.path.join(os.getcwd(), 'public', 'audio')
        audio_files = []
        
        # 允许的音频扩展名
        allowed_extensions = ('.mp3', '.wav', '.ogg', '.m4a', '.aac')
        
        for root, dirs, files in os.walk(audio_dir):
            for file in files:
                if file.lower().endswith(allowed_extensions):
                    # 获取相对于项目根目录的路径
                    full_path = os.path.join(root, file)
                    relative_path = os.path.relpath(full_path, os.getcwd())
                    # 统一使用正斜杠
                    relative_path = relative_path.replace('\\', '/')
                    audio_files.append(relative_path)
        
        print(f"🎵 扫描到 {len(audio_files)} 个音频文件")
        return jsonify({
            "success": True,
            "files": audio_files
        })
    except Exception as e:
        print(f"❌ 扫描音频失败: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    print("--------------------------------------")
    print("RedditExtractor Python 后端已启动")
    print("监听地址: http://localhost:5000")
    print("请保持此窗口开启以支持浏览器直接导出视频")
    print("--------------------------------------")
    app.run(port=5000)
