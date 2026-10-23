// VS Code pre-launch task: reuse a running preview or start the local Storybook.
const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const indexUrl = 'http://127.0.0.1:6006/index.json';

function isReady() {
  return new Promise((resolve) => {
    const request = http.get(indexUrl, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('error', () => resolve(false));
      response.on('end', () => {
        try {
          resolve(response.statusCode === 200 && Boolean(
            JSON.parse(body).entries?.['pages-adplacement-page--chroma-key']
          ));
        } catch { resolve(false); }
      });
    });
    request.setTimeout(1500, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}

async function main() {
  console.log('STORYBOOK_STARTING');
  if (await isReady()) {
    console.log('Reusing Storybook on port 6006.');
    console.log('STORYBOOK_READY');
    return;
  }

  const packageDir = path.join(root, 'node_modules', 'storybook');
  const manifest = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  const binary = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.storybook;
  const child = spawn(process.execPath, [
    path.join(packageDir, binary), 'dev', '-p', '6006', '--host', '127.0.0.1',
    '--no-open', '--disable-telemetry', '--ci',
  ], { cwd: root, stdio: 'inherit', windowsHide: true });
  child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
  const deadline = Date.now() + 90000;
  while (child.exitCode === null && child.signalCode === null && !process.exitCode) {
    if (await isReady()) {
      console.log('STORYBOOK_READY');
      return; // The task remains alive while its Storybook child is running.
    }
    if (Date.now() > deadline) {
      console.error('Storybook did not become ready within 90 seconds.');
      child.kill();
      process.exitCode = 1;
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
