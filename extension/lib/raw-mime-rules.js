// SPDX-License-Identifier: zlib-acknowledgement
// Copyright (c) 2026 Jaewoo Jeon (@thejjw)

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GitHubRawMimeRules = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  const RAW_ORIGIN = "https://raw.githubusercontent.com/*";
  const RULE_IDS = [41001, 41002];

  /** Build tab-scoped rules that correct GitHub Raw script and stylesheet MIME types. */
  function buildRules(tabIds) {
    const normalized = [...new Set(tabIds)].filter(Number.isInteger).filter((id) => id >= 0).sort((a, b) => a - b);
    if (!normalized.length) return [];
    return [
      {
        id: RULE_IDS[0],
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [{ header: "Content-Type", operation: "set", value: "text/css; charset=utf-8" }],
        },
        condition: {
          requestDomains: ["raw.githubusercontent.com"],
          resourceTypes: ["stylesheet"],
          tabIds: normalized,
        },
      },
      {
        id: RULE_IDS[1],
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [{ header: "Content-Type", operation: "set", value: "application/javascript; charset=utf-8" }],
        },
        condition: {
          requestDomains: ["raw.githubusercontent.com"],
          resourceTypes: ["script"],
          tabIds: normalized,
        },
      },
    ];
  }

  /** Return the preview tab IDs currently covered by the fixed MIME rules. */
  function tabIdsFromRules(rules) {
    const ids = rules
      .filter((rule) => RULE_IDS.includes(rule.id))
      .flatMap((rule) => rule.condition?.tabIds || []);
    return [...new Set(ids)].filter(Number.isInteger).filter((id) => id >= 0).sort((a, b) => a - b);
  }

  /** Validate a rule-control sender and return its browser tab ID. */
  function previewTabId(sender, previewUrl) {
    return sender?.url?.split("?")[0] === previewUrl && Number.isInteger(sender.tab?.id) ? sender.tab.id : null;
  }

  /** Create a serialized session-rule manager backed by chrome.declarativeNetRequest. */
  function createManager(declarativeNetRequest) {
    let pending = Promise.resolve();

    function setEnabled(tabId, enabled) {
      const operation = pending.catch(() => {}).then(async () => {
        const rules = await declarativeNetRequest.getSessionRules();
        const tabIds = new Set(tabIdsFromRules(rules));
        if (enabled) tabIds.add(tabId);
        else tabIds.delete(tabId);
        await declarativeNetRequest.updateSessionRules({
          removeRuleIds: RULE_IDS,
          addRules: buildRules(tabIds),
        });
      });
      pending = operation;
      return operation;
    }

    return { setEnabled };
  }

  return { RAW_ORIGIN, RULE_IDS, buildRules, tabIdsFromRules, previewTabId, createManager };
});
