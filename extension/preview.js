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
  function render() {
    frame.contentWindow.postMessage({ type: "RENDER", html: payload.html, runScripts: document.getElementById("scripts").checked }, "*");
  }
  frame.addEventListener("load", render);
  document.getElementById("scripts").addEventListener("change", render);
})();
