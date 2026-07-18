// SPDX-License-Identifier: zlib-acknowledgement
// Copyright (c) 2026 Jaewoo Jeon (@thejjw)

(function () {
  "use strict";
  const BLOCKED_ELEMENTS = "base,link,object,embed,portal,frame,frameset,audio,video,source,track";

  function prepare(html, runScripts) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll(BLOCKED_ELEMENTS).forEach((node) => node.remove());
    doc.querySelectorAll("img").forEach((node) => {
      const src = node.getAttribute("src") || "";
      if (!/^(data:|blob:)/i.test(src)) node.removeAttribute("src");
      node.removeAttribute("srcset");
    });
    doc.querySelectorAll("style").forEach((node) => {
      node.textContent = node.textContent.replace(/@import[^;]+;?/gi, "").replace(/url\((?!\s*['\"]?(?:data:|blob:))[^)]+\)/gi, "none");
    });
    doc.querySelectorAll("meta[http-equiv='refresh' i]").forEach((node) => node.remove());
    if (!runScripts) {
      doc.querySelectorAll("script,iframe,form").forEach((node) => node.remove());
      doc.querySelectorAll("*").forEach((node) => {
        for (const attribute of [...node.attributes]) if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
      });
      doc.querySelectorAll("a").forEach((node) => { if (!(node.getAttribute("href") || "").startsWith("#")) node.removeAttribute("href"); });
    } else {
      doc.querySelectorAll("iframe[src]").forEach((node) => node.removeAttribute("src"));
      doc.querySelectorAll("form").forEach((node) => node.removeAttribute("target"));
    }
    const csp = doc.createElement("meta");
    csp.httpEquiv = "Content-Security-Policy";
    csp.content = runScripts
      ? "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; connect-src *; form-action *"
      : "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; form-action 'none'";
    doc.head.prepend(csp);
    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  }

  addEventListener("message", (event) => {
    if (event.source !== parent || event.data?.type !== "RENDER" || typeof event.data.html !== "string") return;
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", event.data.runScripts ? "allow-scripts" : "");
    frame.srcdoc = prepare(event.data.html, Boolean(event.data.runScripts));
    document.body.replaceChildren(frame);
  });
})();
