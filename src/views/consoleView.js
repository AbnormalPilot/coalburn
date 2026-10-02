export function log(message) {
  console.log(`\x1b[33m[coalburn] ${message}\x1b[0m`); // yellow
}

export function usage() {
  console.log(`Usage: coalburn [options] <file.js | command...>

Options:
  --port <port>        serve the app on this port with live reload
                       (the app has to listen on process.env.PORT)
  --reload-delay <ms>  wait before reloading the browser (default 1000)

Examples:
  coalburn app.js
  coalburn --port 3000 node server.js`);
}
