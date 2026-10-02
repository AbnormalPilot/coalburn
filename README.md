<p>
  <img src="https://coalburn.himanshubuilds.in/logo.png" alt="coalburn logo" width="64" align="middle">
  &nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://coalburn.himanshubuilds.in/wordmark-white.png">
    <img src="https://coalburn.himanshubuilds.in/wordmark-coal.png" alt="COAL BURN" height="40" align="middle">
  </picture>
</p>

Restarts your Node.js app when files change. Like a small [nodemon](https://nodemon.io), with optional browser live reload.

## Install

```bash
npm install -g coalburn
```

Needs Node.js 20.19 or newer.

## Usage

```bash
coalburn app.js              # runs "node app.js"
coalburn node server.js      # runs any command as given
coalburn --port 3000 app.js  # same, plus live reload in the browser
```

coalburn watches the current folder (except `node_modules` and `.git`). When a file is added, changed or deleted, it restarts the app. Several changes within 300 ms cause a single restart. Press Ctrl+C to stop. If the app won't stop, press Ctrl+C again to force it.

If the app crashes, coalburn waits for the next file change before starting it again.

## Live reload

With `--port 3000`, coalburn serves your app on http://localhost:3000 and reloads open pages after every restart.

Your app has to:

- **Listen on `process.env.PORT`.** coalburn uses port 3000 itself and gives your app a free port through `PORT`:
  ```js
  const PORT = process.env.PORT || 3000;
  ```
- **Send pages as `text/html`.** Express's `res.send()` and `res.render()` already do this.

## Options

Options go before the command.

| Option | Description | Default |
|---|---|---|
| `--port <port>` | Serve the app on this port with live reload | off |
| `--reload-delay <ms>` | How long to wait after the app is up before reloading the browser | `1000` |

## Dependencies

| Package | Version | Used for |
|---|---|---|
| [chokidar](https://www.npmjs.com/package/chokidar) | `^5.0.0` | Watching the folder for file changes |
| [readdirp](https://www.npmjs.com/package/readdirp) | `^5.0.0` | Reading folders recursively, used inside chokidar |

coalburn only imports chokidar. readdirp is chokidar's own dependency, so npm installs it automatically and it isn't listed in `package.json`.

chokidar 5 needs Node.js 20.19 or newer, which is why coalburn does too.

Everything else is built into Node.js:

| Module | Used for |
|---|---|
| `node:child_process` | Running the app (`spawn`) |
| `node:events` | Events from `AppProcess` to the controller |
| `node:net` | Finding a free port and checking when the app is listening |
| `node:http` | The live reload proxy |

## How it works

```
src/
├── index.js                      entry point
├── controllers/watchController.js reads options, watches files, restarts the app
├── models/AppProcess.js           starts and stops the app as a child process
├── models/LiveReloadProxy.js      proxy that adds the reload script to pages
└── views/consoleView.js           terminal output
```

- **Watching:** chokidar watches the folder. Each change resets a 300 ms timer, and the restart only runs when the timer fires.
- **Restarting:** the app gets `SIGTERM`, and the new copy only starts after the old one has exited, so the port is free again.
- **Live reload:** the proxy forwards requests to the app and adds a small script to HTML pages. The script opens an `EventSource` (Server-Sent Events) connection back to the proxy. After a restart, coalburn waits until the app accepts connections, waits the reload delay, then sends `reload` to every open page. While the app is down, the proxy shows a waiting page that reloads itself once the app is back.

## License

MIT
