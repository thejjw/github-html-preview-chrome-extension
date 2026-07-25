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
  const scripts = document.getElementById("scripts");
  const retryAssets = document.getElementById("retry-assets");
  const failures = new Map();
  const warning = document.getElementById("asset-warning");
  const failureList = document.getElementById("asset-failures");
  const RAW_ORIGIN = "https://raw.githubusercontent.com/*";
  let rawAccessError = "";

  function clearFailures() {
    failures.clear();
    failureList.replaceChildren();
    updateWarning();
  }

  function updateWarning() {
    const count = failures.size;
    const parts = [];
    if (rawAccessError) parts.push(rawAccessError);
    if (count) parts.push(`${count} resource${count === 1 ? "" : "s"} failed to load. The resource may be missing, inaccessible, blocked, or served with an incompatible response.`);
    document.getElementById("asset-summary").textContent = parts.join(" ");
    warning.hidden = parts.length === 0;
  }

  function showFailure(kind, url) {
    if (failures.has(url) || failures.size >= 20) return;
    failures.set(url, kind);
    const item = document.createElement("li");
    item.textContent = `${kind}: ${url}`;
    failureList.append(item);
    updateWarning();
  }

  function render() {
    clearFailures();
    frame.contentWindow.postMessage({
      type: "RENDER",
      html: payload.html,
      runScripts: scripts.checked,
      rawBaseUrl: payload.rawBaseUrl,
    }, "*");
  }

  async function configureActiveContent(permissionRequest) {
    scripts.disabled = true;
    retryAssets.disabled = true;
    rawAccessError = "";
    try {
      if (scripts.checked) {
        const granted = await permissionRequest;
        if (!granted) {
          rawAccessError = "GitHub Raw CSS and JavaScript access was not granted; those resources may fail to load.";
        } else {
          const response = await chrome.runtime.sendMessage({ type: "ENABLE_RAW_MIME_RULES" });
          if (!response?.ok) rawAccessError = `GitHub Raw CSS and JavaScript access could not be enabled: ${response?.error || "unknown error"}`;
        }
      } else {
        const response = await chrome.runtime.sendMessage({ type: "DISABLE_RAW_MIME_RULES" });
        if (!response?.ok) console.warn("GitHub Raw MIME rule cleanup failed", response?.error);
      }
      render();
    } finally {
      scripts.disabled = false;
      retryAssets.disabled = false;
      updateWarning();
    }
  }

  function requestRawAccessAndRender() {
    // Start the permission request directly from the checkbox or button user gesture.
    const permissionRequest = chrome.permissions.request({ origins: [RAW_ORIGIN] });
    configureActiveContent(permissionRequest).catch((error) => {
      rawAccessError = `GitHub Raw CSS and JavaScript access could not be enabled: ${error.message}`;
      render();
      updateWarning();
    });
  }

  addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow || event.data?.type !== "ASSET_FAILURE") return;
    showFailure(event.data.kind, event.data.url);
  });
  frame.addEventListener("load", render);
  scripts.addEventListener("change", () => {
    if (scripts.checked) requestRawAccessAndRender();
    else configureActiveContent(Promise.resolve(false)).catch(console.error);
  });
  retryAssets.addEventListener("click", () => {
    if (scripts.checked) requestRawAccessAndRender();
    else render();
  });
})();
