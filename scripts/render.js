import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import os from 'node:os';

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
 * 检查是否支持 NVIDIA 硬件加速渲染
 */
function checkNVENC() {
  try {
    const output = execSync('ffmpeg -encoders', { encoding: 'utf-8' });
    return output.includes('h264_nvenc');
  } catch (error) {
    return false;
  }
}

/**
 * 尝试获取本地 Chrome 路径
 */
function getLocalChromePath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const path of paths) {
    if (existsSync(path)) return path;
  }
  return null;
}

/**
 * 执行渲染任务
 */
async function main() {
  console.log('🚀 开始渲染准备...');

  // 1. 检查 FFmpeg
  if (!checkFFmpeg()) {
    console.error('\n❌ 错误：未发现 FFmpeg 安装！');
    // ... rest of the error message ...
    process.exit(1);
  }

  const hasNVENC = checkNVENC();
  if (hasNVENC) {
    console.log('⚡ 检测到支持 NVIDIA 硬件加速 (h264_nvenc)，将启用 GPU 渲染。');
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
  console.log('🎬 正在调用 Remotion 渲染引擎 (多线程模式)...');
  
  const cpus = os.cpus().length;
  const concurrency = Math.max(1, cpus - 2); // 留出 2 个核心给系统

  const args = [
    'remotion',
    'render',
    'src/remotion/index.tsx',
    'MyVideo',
    'out/video.mp4',
    '--props=video-config.json',
    `--concurrency=${concurrency}`, // 启用多线程并发渲染
    '--gl=angle', // Windows 下使用 ANGLE 硬件加速渲染 CSS
    '--chromium-flags="--disable-dev-shm-usage --no-sandbox"', // 提高 Chromium 运行稳定性
  ];

  // 检查是否有本地浏览器，避免下载失败
  const localBrowser = getLocalChromePath();
  if (localBrowser) {
    console.log(`🌐 使用本地浏览器进行渲染: ${localBrowser}`);
    args.push(`--browser-executable="${localBrowser}"`);
  }

  // 统一使用 h264 编码，Remotion 内部会根据环境自动优化
  // 如果直接传 h264-nvenc，Remotion 会因 .mp4 扩展名检查而报错
  args.push('--codec=h264');

  console.log(`执行命令: npx ${args.join(' ')}`);
  console.log(`并发线程: ${concurrency}`);

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  
  // 必须包装成 Promise 并等待进程结束
  await new Promise((resolvePromise, reject) => {
    const renderProcess = spawn(npx, args, { 
      stdio: ['inherit', 'pipe', 'pipe'], // 修改为 pipe 模式，以便 server.py 捕获
      shell: process.platform === 'win32'
    });

    // 实时转发子进程输出到当前进程的 stdout
    renderProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    renderProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
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
