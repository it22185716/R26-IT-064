#!/usr/bin/env node
// Dependency-free replacement for `concurrently`: launches the Next.js dev
// server and every ml-services/* Flask backend together, prefixing each
// process's output so all logs stay readable in one terminal.
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const IS_WIN = process.platform === 'win32';

function venvPython(serviceDir) {
  const primary = path.join(serviceDir, 'venv', 'Scripts', IS_WIN ? 'python.exe' : 'python');
  const fallback = path.join(serviceDir, '.venv', 'Scripts', IS_WIN ? 'python.exe' : 'python');
  if (fs.existsSync(primary)) return primary;
  if (fs.existsSync(fallback)) return fallback;
  return null;
}

// Spawn Next's JS entry point directly via node.exe rather than the
// node_modules/.bin/next(.cmd) shim: on Windows, spawning a .cmd file with
// shell:false throws EINVAL, and shell:true is unreliable with spaces in the path.
const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

const COLORS = {
  NEXT: '\x1b[36m', // cyan
  MEAL: '\x1b[35m', // magenta
  READING: '\x1b[33m', // yellow
  VIDEO: '\x1b[32m', // green
  MATH: '\x1b[34m', // blue
  RESET: '\x1b[0m',
};

const SERVICES = [
  { label: 'NEXT', command: process.execPath, args: [NEXT_BIN, 'dev'], cwd: ROOT },
  {
    label: 'MEAL',
    dir: path.join(ROOT, 'ml-services', 'meal-planning'),
    args: ['app.py'],
  },
  {
    label: 'READING',
    dir: path.join(ROOT, 'ml-services', 'reading-assessment'),
    args: ['app.py'],
  },
  {
    label: 'VIDEO',
    dir: path.join(ROOT, 'ml-services', 'video-recommendation'),
    args: ['app.py'],
  },
  {
    label: 'MATH',
    dir: path.join(ROOT, 'ml-services', 'math-weak-detection'),
    args: ['app.py'],
  },
];

function prefixed(label, chunk, buffers) {
  buffers[label] += chunk.toString();
  const lines = buffers[label].split(/\r?\n/);
  buffers[label] = lines.pop();
  for (const line of lines) {
    process.stdout.write(`${COLORS[label]}[${label}]${COLORS.RESET} ${line}\n`);
  }
}

const buffers = {};
for (const svc of SERVICES) buffers[svc.label] = '';

const children = [];
let shuttingDown = false;

// Synchronous and idempotent so it can run from a signal handler right before
// process.exit() (guaranteeing children are gone before the wrapper exits)
// and again from the 'exit' event as a last-resort safety net.
function killAll(signal) {
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    try {
      if (IS_WIN) {
        execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill(signal || 'SIGTERM');
      }
    } catch (_) {
      // already gone
    }
  }
}

function launch(label, command, args, cwd) {
  const child = spawn(command, args, { cwd, shell: false });
  children.push(child);

  child.stdout.on('data', (chunk) => prefixed(label, chunk, buffers));
  child.stderr.on('data', (chunk) => prefixed(label, chunk, buffers));

  child.on('error', (err) => {
    console.error(`${COLORS[label]}[${label}]${COLORS.RESET} Failed to start: ${err.message}`);
  });

  child.on('exit', (code, signal) => {
    if (buffers[label]) {
      process.stdout.write(`${COLORS[label]}[${label}]${COLORS.RESET} ${buffers[label]}\n`);
      buffers[label] = '';
    }
    if (!shuttingDown) {
      console.log(
        `${COLORS[label]}[${label}]${COLORS.RESET} exited (${signal ? `signal ${signal}` : `code ${code}`}); stopping the other processes.`
      );
      killAll();
      process.exitCode = code == null ? 1 : code;
    }
  });

  return child;
}

for (const svc of SERVICES) {
  if (!svc.dir) {
    launch(svc.label, svc.command, svc.args, svc.cwd);
    continue;
  }
  const python = venvPython(svc.dir);
  if (!python) {
    console.error(
      `${COLORS[svc.label]}[${svc.label}]${COLORS.RESET} Skipped: no venv found at\n` +
        `  ${path.join(svc.dir, 'venv')}\n` +
        `Create one first: cd ${path.relative(ROOT, svc.dir)} && python -m venv venv && ` +
        `venv\\Scripts\\python.exe -m pip install -r requirements.txt`
    );
    continue;
  }
  launch(svc.label, python, svc.args, svc.dir);
}

function shutdown(signal) {
  killAll(signal);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// Last-resort net: covers uncaught exceptions or any other path that skips
// the signal handlers above. 'exit' handlers must run synchronously, which
// killAll (execFileSync-based) satisfies.
process.on('exit', () => killAll());
