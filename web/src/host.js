// Bridge to the native iOS host (WKWebView message handler) or the dev server.

const ios = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.tkr);

export const Host = {
  ios,

  normalize(path) {
    return String(path).replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");
  },

  gameURL(path) {
    return "game/" + this.normalize(path).split("/").map(encodeURIComponent).join("/");
  },

  post(msg) {
    if (ios) {
      try { window.webkit.messageHandlers.tkr.postMessage(msg); } catch (e) { console.error(e); }
    } else {
      fetch("api/msg", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(msg) })
        .catch(() => {});
    }
  },

  // Startup / progress markers: shown by the app if the web process crashes.
  stage(name) {
    console.log("[stage] " + name);
    if (ios) this.post({ type: "stage", name: String(name).slice(0, 300) });
  },

  log(level, text) {
    if (level === "error") console.error(text);
    else console.log(text);
    if (ios) this.post({ type: "log", level, text: String(text).slice(0, 4000) });
  },
};
