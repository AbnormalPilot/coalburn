import http from 'node:http';

const EVENTS_PATH = '/__coalburn';
const SCRIPT = `<script>new EventSource('${EVENTS_PATH}').onmessage = () => location.reload()</script>`;

// sits on the user's port and forwards to the app
export class LiveReloadProxy {
  constructor(port, appPort) {
    this.port = port;
    this.appPort = appPort;
    this.tabs = new Set(); // open browser tabs
    this.server = http.createServer((req, res) => this.handle(req, res));
  }

  listen() {
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.port, resolve);
    });
  }

  reload() {
    for (const tab of this.tabs) tab.write('data: reload\n\n');
    return this.tabs.size;
  }

  handle(req, res) {
    // a tab waiting for reloads
    if (req.url === EVENTS_PATH) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      res.flushHeaders();
      this.tabs.add(res);
      res.on('close', () => this.tabs.delete(res));
      return;
    }

    // no gzip so we can edit the html
    const headers = { ...req.headers };
    delete headers['accept-encoding'];

    const appReq = http.request(
      { port: this.appPort, method: req.method, path: req.url, headers },
      (appRes) => this.respond(appRes, res),
    );

    // app is down, this page reloads itself when it's back
    appReq.on('error', () => {
      res.writeHead(503, { 'Content-Type': 'text/html' });
      res.end(`<p>Waiting for the app to start...</p>${SCRIPT}`);
    });

    req.pipe(appReq);
  }

  respond(appRes, res) {
    const isHtml = (appRes.headers['content-type'] || '').includes('text/html');
    if (!isHtml) {
      res.writeHead(appRes.statusCode, appRes.headers);
      appRes.pipe(res);
      return;
    }

    let html = '';
    appRes.setEncoding('utf8');
    appRes.on('data', (chunk) => (html += chunk));
    appRes.on('end', () => {
      html = html.includes('</body>') ? html.replace('</body>', `${SCRIPT}</body>`) : html + SCRIPT;

      // length changed
      const headers = { ...appRes.headers };
      delete headers['content-length'];
      delete headers['transfer-encoding'];
      res.writeHead(appRes.statusCode, headers);
      res.end(html);
    });
  }
}
