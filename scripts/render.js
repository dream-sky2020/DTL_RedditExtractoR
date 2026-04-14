import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 检查 FFmpeg 是否安装
 */
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 执行渲染任务
 */
async function main() {
  console.log('🚀 开始渲染准备...');

  // 1. 检查 FFmpeg
  if (!checkFFmpeg()) {
    console.error('\n❌ 错误：未发现 FFmpeg 安装！');
    console.error('-------------------------------------------');
    console.error('Remotion 需要 FFmpeg 才能生成 MP4 视频。');
    console.error('请按照以下步骤安装：');
    console.error('1. 访问 https://ffmpeg.org/download.html 下载适合你系统的版本');
    console.error('2. 将 FFmpeg 的 bin 目录添加到你的系统环境变量 (PATH) 中');
    console.error('3. 重启你的终端并重试');
    console.error('-------------------------------------------\n');
    process.exit(1);
  }

  // 2. 检查配置文件
  const configPath = resolve(process.cwd(), 'video-config.json');
  let props = {};
  
  if (existsSync(configPath)) {
    console.log('📄 正在读取 video-config.json...');
    try {
      props = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn('⚠️ 警告：video-config.json 解析失败，将使用默认配置。');
    }
  } else {
    console.log('ℹ️ 未发现 video-config.json，将使用默认配置渲染。');
  }

  // 3. 运行 Remotion 渲染
  console.log('🎬 正在调用 Remotion 渲染引擎...');
  
  const args = [
    'remotion',
    'render',
    'src/remotion/index.tsx',
    'MyVideo',
    'out/video.mp4',
    '--props=video-config.json', // 关键修改：直接传递文件名，避免命令行过长
  ];

  console.log(`执行命令: npx ${args.join(' ')}`);

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  
  // 必须包装成 Promise 并等待进程结束，否则脚本会立即退出并返回 0
  await new Promise((resolvePromise, reject) => {
    const renderProcess = spawn(npx, args, { 
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    renderProcess.on('close', (code) => {
      if (code === 0) {
        const fullPath = resolve(process.cwd(), 'out/video.mp4');
        console.log(`\n✅ 渲染完成！视频已生成在: ${fullPath}`);
        resolvePromise(true);
      } else {
        console.error(`\n❌ 渲染失败，退出码: ${code}`);
        process.exit(code || 1);
      }
    });

    renderProcess.on('error', (err) => {
      console.error('无法启动渲染进程:', err);
      reject(err);
    });
  });
}

main().catch(err => {
  console.error('渲染脚本执行异常:', err);
  process.exit(1);
});
