// SPDX-License-Identifier: zlib-acknowledgement
// Copyright (c) 2026 Jaewoo Jeon (@thejjw)

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GitHubHtmlPreview = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  const MAX_HTML_BYTES = 5 * 1024 * 1024;
  const MAX_FILENAME_LENGTH = 255;
  const RAW_LINE_KEYS = new Set(["rawLines", "rawBlob"]);

  /** Return blob metadata for a supported github.com HTML URL. */
  function parseBlobUrl(value) {
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.protocol !== "https:" || url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 5 || parts[2] !== "blob") return null;
    const filename = decodeURIComponent(parts.at(-1));
    if (!/\.html?$/i.test(filename)) return null;
    return { filename, sourceUrl: `${url.origin}${url.pathname}${url.search}${url.hash}` };
  }

  /** Measure a string as UTF-8 without depending on browser-only globals. */
  function byteLength(value) {
    return typeof TextEncoder === "function"
      ? new TextEncoder().encode(value).length
      : Buffer.byteLength(value, "utf8");
  }

  /** Validate complete HTML before it crosses an extension message boundary. */
  function validateHtml(html) {
    if (typeof html !== "string" || html.length === 0) throw new Error("GitHub did not provide HTML source for this file.");
    if (html.includes("\u0000")) throw new Error("This file appears to be binary, not HTML.");
    if (byteLength(html) > MAX_HTML_BYTES) throw new Error("This HTML file is larger than the 5 MB preview limit.");
    return html;
  }

  // GitHub's React payload is undocumented, so recursively recognize only guarded line arrays.
  function findRawLines(value, seen) {
    if (!value || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);
    if (value.isTruncated === true || value.truncated === true) throw new Error("GitHub reports that this file is truncated.");
    if (value.isBinary === true || value.binary === true) throw new Error("GitHub reports that this file is binary.");
    for (const [key, child] of Object.entries(value)) {
      if (RAW_LINE_KEYS.has(key) && Array.isArray(child) && child.every((line) => typeof line === "string")) return child;
    }
    for (const child of Object.values(value)) {
      const found = findRawLines(child, seen);
      if (found) return found;
    }
    return null;
  }

  /** Extract complete source from GitHub's embedded JSON script elements. */
  function extractFromJsonTexts(texts) {
    let schemaError = null;
    for (const text of texts) {
      if (typeof text !== "string" || !text.trim()) continue;
      try {
        const lines = findRawLines(JSON.parse(text), new Set());
        if (lines) return validateHtml(lines.join("\n"));
      } catch (error) {
        if (/truncated|binary|5 MB/.test(error.message)) throw error;
        schemaError = error;
      }
    }
    if (schemaError && texts.length === 1) throw new Error("GitHub's embedded file data could not be parsed.");
    return null;
  }

  /** Validate an OPEN_PREVIEW request from a GitHub content script. */
  function validateOpenMessage(message, senderUrl) {
    if (!message || message.type !== "OPEN_PREVIEW" || typeof message.payload !== "object") return null;
    const page = parseBlobUrl(senderUrl);
    if (!page) return null;
    const { html, filename, sourceUrl, createdAt } = message.payload;
    const source = parseBlobUrl(sourceUrl);
    if (!source || sourceUrl !== senderUrl || filename !== page.filename || filename.length > MAX_FILENAME_LENGTH) return null;
    if (!Number.isFinite(createdAt) || Math.abs(Date.now() - createdAt) > 60_000) return null;
    try { validateHtml(html); } catch { return null; }
    return { html, filename, sourceUrl, createdAt };
  }

  return { MAX_HTML_BYTES, parseBlobUrl, validateHtml, extractFromJsonTexts, validateOpenMessage };
});
