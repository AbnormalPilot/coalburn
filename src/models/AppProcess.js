import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import net from 'node:net';

// runs the user's app as a child process
export class AppProcess extends EventEmitter {
  constructor(args) {
    super();
    const isScript = /\.[cm]?js$/.test(args[0]); // app.js -> node app.js
    this.command = isScript ? process.execPath : args[0];
    this.args = isScript ? args : args.slice(1);
    this.name = args.join(' ');
    this.port = null; // set for live reload
    this.child = null;
  }

  start() {
    const env = this.port ? { ...process.env, PORT: String(this.port) } : process.env;
    const child = spawn(this.command, this.args, { stdio: 'inherit', env });
    this.child = child;

    // spawn failed, 'exit' won't fire
    child.on('error', (err) => {
      this.child = null;
      this.emit('fail', err);
    });

    child.on('exit', (code) => {
      this.child = null;
      if (!child.killed) this.emit('exit', code); // stopped on its own
    });
  }

  // resolves once the old process is fully gone
  stop() {
    return new Promise((resolve) => {
      if (!this.child) return resolve();
      this.child.once('exit', resolve);
      this.child.kill();
    });
  }

  // true once the app accepts connections, gives up after ~10s
  async waitUntilListening() {
    const child = this.child;
    for (let i = 0; i < 100 && child && this.child === child; i++) {
      if (await canConnect(this.port)) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  }
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, 'localhost', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });
}

// port 0 = any free port
export function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer().listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}
