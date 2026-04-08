const { spawn } = require('child_process');
const path = require('path');

console.log('Starting diagnostic script...');

const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: path.resolve(__dirname),
  stdio: 'inherit'
});

child.on('error', (err) => {
  console.error('Failed to start child process:', err);
});

child.on('exit', (code, signal) => {
  console.log(`Child process exited with code ${code} and signal ${signal}`);
});