// SPDX-License-Identifier: zlib-acknowledgement
// Copyright (c) 2026 Jaewoo Jeon (@thejjw)

importScripts("lib/core.js");

const PREVIEW_PREFIX = "preview:";

/** Validate, store, and open a single-use preview. */
async function openPreview(message, sender) {
  const payload = GitHubHtmlPreview.validateOpenMessage(message, sender.url);
  if (!payload) throw new Error("Invalid preview request.");
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const operation = message?.type === "OPEN_PREVIEW" ? openPreview(message, sender)
    : message?.type === "TAKE_PREVIEW" ? takePreview(message, sender)
      : Promise.resolve(null);
  operation.then((value) => sendResponse({ ok: true, value }), (error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
