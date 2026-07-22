// SPDX-License-Identifier: zlib-acknowledgement
// Copyright (c) 2026 Jaewoo Jeon (@thejjw)

(function () {
  "use strict";
  const BLOCKED_ELEMENTS = "base,object,embed,portal,frame,frameset";

  function sanitizeCss(css, allowActiveContent, rawBaseUrl) {
    let result = css.replace(/@import\s+(?:url\(\s*)?(['\"]?)([^'\")\s;]+)\1\s*\)?[^;]*;?/gi,
      (rule, _quote, url) => {
        const resolved = allowActiveContent ? GitHubHtmlPreview.resolveAssetUrl(url, rawBaseUrl) : url;
        return allowActiveContent && /^https:\/\//i.test(resolved) ? rule.replace(url, resolved) : "";
      });
    return result.replace(/url\(\s*(['\"]?)(.*?)\1\s*\)/gi,
      (value, _quote, url) => {
        const resolved = allowActiveContent ? GitHubHtmlPreview.resolveAssetUrl(url, rawBaseUrl) : url;
        return /^(data:|blob:)/i.test(resolved) || allowActiveContent && /^https:\/\//i.test(resolved)
          ? value.replace(url, resolved) : "none";
      });
  }

  function prepare(html, runScripts, rawBaseUrl) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll(BLOCKED_ELEMENTS).forEach((node) => node.remove());
    if (runScripts) {
      for (const [selector, attribute] of [
        ["link[href]", "href"], ["img[src]", "src"], ["script[src]", "src"],
        ["audio[src],video[src],source[src],track[src]", "src"], ["video[poster]", "poster"],
      ]) doc.querySelectorAll(selector).forEach((node) => {
        node.setAttribute(attribute, GitHubHtmlPreview.resolveAssetUrl(node.getAttribute(attribute), rawBaseUrl));
      });
    }
    doc.querySelectorAll("link").forEach((node) => {
      if (!runScripts || node.rel.toLowerCase() !== "stylesheet" || !/^https:\/\//i.test(node.href)) node.remove();
    });
    doc.querySelectorAll("img").forEach((node) => {
      const src = node.getAttribute("src") || "";
      if (!/^(data:|blob:)/i.test(src) && !(runScripts && /^https:\/\//i.test(src))) node.removeAttribute("src");
      node.removeAttribute("srcset");
    });
    doc.querySelectorAll("style").forEach((node) => { node.textContent = sanitizeCss(node.textContent, runScripts, rawBaseUrl); });
    doc.querySelectorAll("[style]").forEach((node) => {
      node.setAttribute("style", sanitizeCss(node.getAttribute("style"), runScripts, rawBaseUrl));
    });
    doc.querySelectorAll("meta[http-equiv='refresh' i]").forEach((node) => node.remove());
    if (!runScripts) {
      doc.querySelectorAll("script,iframe,form,audio,video,source,track").forEach((node) => node.remove());
      doc.querySelectorAll("*").forEach((node) => {
        for (const attribute of [...node.attributes]) if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
      });
      doc.querySelectorAll("a").forEach((node) => { if (!(node.getAttribute("href") || "").startsWith("#")) node.removeAttribute("href"); });
    } else {
      doc.querySelectorAll("iframe[src]").forEach((node) => node.removeAttribute("src"));
      doc.querySelectorAll("form").forEach((node) => node.removeAttribute("target"));
      doc.querySelectorAll("audio[src],video[src],source[src],track[src]").forEach((node) => {
        if (!/^(https:\/\/|data:|blob:)/i.test(node.getAttribute("src") || "")) node.removeAttribute("src");
      });
      doc.querySelectorAll("video[poster]").forEach((node) => {
        if (!/^(https:\/\/|data:|blob:)/i.test(node.getAttribute("poster") || "")) node.removeAttribute("poster");
      });
    }
    const csp = doc.createElement("meta");
    csp.httpEquiv = "Content-Security-Policy";
    csp.content = runScripts
      ? "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; style-src 'unsafe-inline' https:; img-src https: data: blob:; font-src https: data: blob:; media-src https: data: blob:; connect-src *; form-action *"
      : "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; form-action 'none'";
    doc.head.prepend(csp);
    if (runScripts) {
      const reporter = doc.createElement("script");
      // Resource error events intentionally report no HTTP status, so the UI must describe possible causes rather than claim a 429.
      reporter.textContent = `addEventListener("error",(event)=>{const node=event.target;if(!(node instanceof Element))return;const url=node.currentSrc||node.src||node.href||node.poster;if(typeof url==="string"&&/^https?:/i.test(url))parent.postMessage({type:"ASSET_FAILURE",kind:node.localName,url},"*")},true);`;
      csp.after(reporter);
    }
    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  }

  let frame = null;
  addEventListener("message", (event) => {
    if (event.source === parent && event.data?.type === "RENDER" && typeof event.data.html === "string") {
      frame = document.createElement("iframe");
      frame.setAttribute("sandbox", event.data.runScripts ? "allow-scripts" : "");
      frame.srcdoc = prepare(event.data.html, Boolean(event.data.runScripts), event.data.rawBaseUrl);
      document.body.replaceChildren(frame);
      return;
    }
    if (event.source !== frame?.contentWindow || event.data?.type !== "ASSET_FAILURE") return;
    const { kind, url } = event.data;
    if (typeof kind !== "string" || typeof url !== "string" || url.length > 2048 || !/^https?:\/\//i.test(url)) return;
    parent.postMessage({ type: "ASSET_FAILURE", kind: kind.slice(0, 32), url }, "*");
  });
})();
