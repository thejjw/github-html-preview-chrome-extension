// SPDX-License-Identifier: zlib-acknowledgement
// Copyright (c) 2026 Jaewoo Jeon (@thejjw)

(function () {
  "use strict";
  const BUTTON_ID = "github-local-html-preview-button";
  const JSON_SELECTOR = "script[data-target='react-app.embeddedData'], script[type='application/json']";
  const LINE_SELECTORS = ["[data-testid='code-cell']", "td.blob-code", ".react-code-line-contents"];
  let scheduled = false;

  function embeddedTexts(doc) {
    return [...doc.querySelectorAll(JSON_SELECTOR)].map((node) => node.textContent);
  }

  function visibleSource(doc) {
    for (const selector of LINE_SELECTORS) {
      const lines = [...doc.querySelectorAll(selector)];
      if (lines.length) return GitHubHtmlPreview.validateHtml(lines.map((line) => line.textContent).join("\n"));
    }
    return null;
  }

  async function extractSource() {
    let source = GitHubHtmlPreview.extractFromJsonTexts(embeddedTexts(document));
    if (source) return source;
    const response = await fetch(location.href, { credentials: "same-origin", headers: { Accept: "text/html" } });
    if (response.ok) {
      const fetched = new DOMParser().parseFromString(await response.text(), "text/html");
      source = GitHubHtmlPreview.extractFromJsonTexts(embeddedTexts(fetched));
      if (source) return source;
    }
    source = visibleSource(document);
    if (source) return source;
    throw new Error("Complete HTML source is unavailable. The file may be truncated, binary, too large, or GitHub's page format may have changed.");
  }

  async function preview(button, page) {
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "Loading...";
    try {
      const html = await extractSource();
      console.debug("GitHub Local HTML Preview: sending preview", {
        sourceUrl: location.href,
        filename: page.filename,
        htmlCharacters: html.length,
      });
      const response = await chrome.runtime.sendMessage({ type: "OPEN_PREVIEW", payload: { html, filename: page.filename, sourceUrl: location.href, createdAt: Date.now() } });
      if (!response?.ok) throw new Error(response?.error || "The preview could not be opened.");
    } catch (error) {
      console.error("GitHub Local HTML Preview failed", error);
      alert(`Local HTML preview: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function findRawControl() {
    return [...document.querySelectorAll("a, button")].find((node) => node.textContent.trim() === "Raw" || /\/raw\//.test(node.getAttribute("href") || ""));
  }

  function reconcile() {
    scheduled = false;
    const page = GitHubHtmlPreview.parseBlobUrl(location.href);
    const existing = document.getElementById(BUTTON_ID);
    if (!page) { existing?.remove(); return; }
    if (existing?.dataset.sourceUrl === location.href) return;
    existing?.remove();
    const raw = findRawControl();
    if (!raw?.parentElement) return;
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.dataset.sourceUrl = location.href;
    button.className = raw.className;
    button.textContent = "Preview";
    button.style.marginInlineStart = "0.5rem";
    button.addEventListener("click", () => preview(button, page));
    raw.insertAdjacentElement("afterend", button);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(reconcile, 50);
  }

  document.addEventListener("turbo:load", schedule);
  document.addEventListener("turbo:render", schedule);
  window.addEventListener("popstate", schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
