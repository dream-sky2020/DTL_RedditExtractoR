from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import json
import os
import platform

app = Flask(__name__)
CORS(app)  # 允许跨域请求

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
        
        # 在 Windows 上需要处理 shell=True
        result = subprocess.run(
            ['node', script_path], 
            capture_output=True, 
            text=True, 
            shell=(platform.system() == 'Windows')
        )

        if result.returncode == 0:
            print("✅ 渲染成功！")
            return jsonify({
                "success": True, 
                "message": "视频渲染成功！文件位于 out/video.mp4",
                "log": result.stdout
            })
        else:
            print(f"❌ 渲染失败: {result.stderr}")
            return jsonify({
                "success": False, 
                "message": "渲染失败", 
                "error": result.stderr
            }), 500

    except Exception as e:
        print(f"💥 系统错误: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    print("--------------------------------------")
    print("RedditExtractor Python 后端已启动")
    print("监听地址: http://localhost:5000")
    print("请保持此窗口开启以支持浏览器直接导出视频")
    print("--------------------------------------")
    app.run(port=5000)
