import chokidar from 'chokidar';
import { AppProcess, findFreePort } from '../models/AppProcess.js';
import { LiveReloadProxy } from '../models/LiveReloadProxy.js';
import { log, usage } from '../views/consoleView.js';

const RESTART_DELAY = 300;
const IGNORED = /(^|[/\\])(node_modules|\.git)([/\\]|$)/;
const FILE_EVENTS = { add: 'added', change: 'changed', unlink: 'deleted' };

let app;
let proxy = null;
let watcher;
let reloadDelay = 1000;
let restartTimer;
let reloadTimer;
let restarting = false;
let quitting = false;

export async function run(argv) {
  const args = [...argv];
  let port = null;

  // our flags go before the command
  while (args[0] === '--port' || args[0] === '--reload-delay') {
    const [option, value] = args.splice(0, 2);
    if (!/^\d+$/.test(value ?? '')) return exitWithUsage();
    if (option === '--port') port = Number(value);
    else reloadDelay = Number(value);
  }
  if (args.length === 0) return exitWithUsage();

  app = new AppProcess(args);
  app.on('fail', (err) => log(`Could not start ${app.name}: ${err.message}`));
  app.on('exit', (code) => {
    // ctrl+c hits the app too
    if (!quitting) log(`App ${code === 0 ? 'exited' : 'crashed'}, waiting for file changes...`);
  });

  log(`Watching ${process.cwd()}`);
  watcher = chokidar.watch('.', { ignored: IGNORED, ignoreInitial: true });
  watcher.on('all', (event, file) => {
    if (!FILE_EVENTS[event]) return; // skip folders
    log(`File ${FILE_EVENTS[event]}: ${file}`);
    scheduleRestart();
  });

  if (port !== null) {
    // proxy takes the port, app gets a free one
    app.port = await findFreePort();
    proxy = new LiveReloadProxy(port, app.port);
    try {
      await proxy.listen();
    } catch (err) {
      log(`Can't use port ${port}: ${err.message}`);
      process.exit(1);
    }
    log(`Live reload on http://localhost:${port} (app gets port ${app.port} as process.env.PORT)`);
  }

  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
  start();
}

function exitWithUsage() {
  usage();
  process.exit(1);
}

function start() {
  log(`Starting ${app.name}`);
  app.start();
  if (proxy) reloadWhenReady();
}

// wait for the server before reloading
async function reloadWhenReady() {
  if (!(await app.waitUntilListening())) return;
  reloadTimer = setTimeout(() => {
    const tabs = proxy.reload();
    log(tabs > 0 ? 'Reloading browser...' : `Open http://localhost:${proxy.port}`);
  }, reloadDelay);
}

// debounce
function scheduleRestart() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(restart, RESTART_DELAY);
}

async function restart() {
  if (restarting) return; // already on it
  restarting = true;
  log('Restarting...');
  clearTimeout(reloadTimer);
  await app.stop();
  if (!quitting) start();
  restarting = false;
}

async function quit() {
  if (quitting) return app.child?.kill('SIGKILL'); // 2nd ctrl+c
  quitting = true;
  log('Stopping...');
  clearTimeout(restartTimer);
  clearTimeout(reloadTimer);
  await watcher.close();
  await app.stop();
  process.exit(0);
}
