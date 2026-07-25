// SPDX-License-Identifier: zlib-acknowledgement
// Copyright (c) 2026 Jaewoo Jeon (@thejjw)

importScripts("lib/core.js", "lib/raw-mime-rules.js");

const PREVIEW_PREFIX = "preview:";
const rawMimeRules = GitHubRawMimeRules.createManager(chrome.declarativeNetRequest);

/** Validate, store, and open a single-use preview. */
async function openPreview(message, sender) {
  const payload = GitHubHtmlPreview.validateOpenMessage(message, sender.url);
  if (!payload) {
    // Log only metadata for troubleshooting; repository HTML must never reach extension logs.
    console.warn("Rejected OPEN_PREVIEW", {
      senderUrl: sender.url,
      sourceUrl: message?.payload?.sourceUrl,
      filename: message?.payload?.filename,
      htmlCharacters: typeof message?.payload?.html === "string" ? message.payload.html.length : null,
      createdAt: message?.payload?.createdAt,
    });
    throw new Error("Invalid preview request. Reload the extension and GitHub page, then try again.");
  }
  const id = crypto.randomUUID();
  await chrome.storage.session.set({ [`${PREVIEW_PREFIX}${id}`]: payload });
  await chrome.tabs.create({ url: chrome.runtime.getURL(`preview.html?id=${encodeURIComponent(id)}`) });
}

/** Return and immediately remove a preview payload. */
async function takePreview(message, sender) {
  if (sender.url?.split("?")[0] !== chrome.runtime.getURL("preview.html") || !/^[0-9a-f-]{36}$/i.test(message.id || "")) return null;
  const key = `${PREVIEW_PREFIX}${message.id}`;
  const result = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  return result[key] || null;
}

/** Enable or disable GitHub Raw MIME correction for the sending preview tab. */
async function setRawMimeRules(message, sender) {
  const tabId = GitHubRawMimeRules.previewTabId(sender, chrome.runtime.getURL("preview.html"));
  if (tabId === null) throw new Error("Invalid preview rule request.");
  const enabled = message.type === "ENABLE_RAW_MIME_RULES";
  if (enabled && !await chrome.permissions.contains({ origins: [GitHubRawMimeRules.RAW_ORIGIN] })) {
    throw new Error("GitHub Raw access has not been granted.");
  }
  await rawMimeRules.setEnabled(tabId, enabled);
  return { enabled };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const operation = message?.type === "OPEN_PREVIEW" ? openPreview(message, sender)
    : message?.type === "TAKE_PREVIEW" ? takePreview(message, sender)
      : message?.type === "ENABLE_RAW_MIME_RULES" || message?.type === "DISABLE_RAW_MIME_RULES" ? setRawMimeRules(message, sender)
      : Promise.resolve(null);
  operation.then((value) => sendResponse({ ok: true, value }), (error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  rawMimeRules.setEnabled(tabId, false).catch((error) => console.warn("Failed to remove GitHub Raw MIME rules", error));
});
