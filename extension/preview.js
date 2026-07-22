// SPDX-License-Identifier: zlib-acknowledgement
// Copyright (c) 2026 Jaewoo Jeon (@thejjw)

(async function () {
  "use strict";
  const id = new URLSearchParams(location.search).get("id");
  const response = id && await chrome.runtime.sendMessage({ type: "TAKE_PREVIEW", id });
  const payload = response?.ok && response.value;
  if (!payload) {
    document.body.classList.add("failed");
    const error = document.getElementById("error");
    error.hidden = false;
    error.textContent = "This preview has expired or was already opened. Return to GitHub and select Preview again.";
    return;
  }
  const filename = document.getElementById("filename");
  filename.textContent = payload.filename;
  filename.title = payload.sourceUrl;
  filename.setAttribute("aria-label", `${payload.filename}. Source: ${payload.sourceUrl}`);
  document.title = `${payload.filename} - Local preview`;
  const source = document.getElementById("source");
  source.href = payload.sourceUrl;
  const frame = document.getElementById("sandbox");
  const failures = new Map();
  const warning = document.getElementById("asset-warning");
  const failureList = document.getElementById("asset-failures");

  function clearFailures() {
    failures.clear();
    failureList.replaceChildren();
    warning.hidden = true;
  }

  function showFailure(kind, url) {
    if (failures.has(url) || failures.size >= 20) return;
    failures.set(url, kind);
    const item = document.createElement("li");
    item.textContent = `${kind}: ${url}`;
    failureList.append(item);
    const count = failures.size;
    document.getElementById("asset-summary").textContent = `${count} resource${count === 1 ? "" : "s"} failed to load. GitHub raw access may be unavailable or rate-limited; wait before retrying.`;
    warning.hidden = false;
  }

  function render() {
    clearFailures();
    frame.contentWindow.postMessage({
      type: "RENDER",
      html: payload.html,
      runScripts: document.getElementById("scripts").checked,
      rawBaseUrl: payload.rawBaseUrl,
    }, "*");
  }
  addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow || event.data?.type !== "ASSET_FAILURE") return;
    showFailure(event.data.kind, event.data.url);
  });
  frame.addEventListener("load", render);
  document.getElementById("scripts").addEventListener("change", render);
  document.getElementById("retry-assets").addEventListener("click", render);
})();
