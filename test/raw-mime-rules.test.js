const test = require("node:test");
const assert = require("node:assert/strict");

const rulesApi = require("../extension/lib/raw-mime-rules.js");

test("builds narrow tab-scoped MIME correction rules", () => {
  const rules = rulesApi.buildRules([9, 3, 9, -1, "4"]);
  assert.deepEqual(rules.map((rule) => rule.id), rulesApi.RULE_IDS);
  assert.deepEqual(rules.map((rule) => rule.condition), [
    { requestDomains: ["raw.githubusercontent.com"], resourceTypes: ["stylesheet"], tabIds: [3, 9] },
    { requestDomains: ["raw.githubusercontent.com"], resourceTypes: ["script"], tabIds: [3, 9] },
  ]);
  assert.deepEqual(rules.map((rule) => rule.action.responseHeaders[0]), [
    { header: "Content-Type", operation: "set", value: "text/css; charset=utf-8" },
    { header: "Content-Type", operation: "set", value: "application/javascript; charset=utf-8" },
  ]);
  assert.deepEqual(rulesApi.buildRules([]), []);
});

test("extracts only fixed-rule tab IDs", () => {
  const rules = [
    { id: rulesApi.RULE_IDS[0], condition: { tabIds: [7, 2] } },
    { id: rulesApi.RULE_IDS[1], condition: { tabIds: [7] } },
    { id: 99, condition: { tabIds: [11] } },
  ];
  assert.deepEqual(rulesApi.tabIdsFromRules(rules), [2, 7]);
});

test("validates preview senders and derives the tab ID", () => {
  const previewUrl = "chrome-extension://test/preview.html";
  assert.equal(rulesApi.previewTabId({ url: `${previewUrl}?id=x`, tab: { id: 12 } }, previewUrl), 12);
  assert.equal(rulesApi.previewTabId({ url: "https://example.com/", tab: { id: 12 } }, previewUrl), null);
  assert.equal(rulesApi.previewTabId({ url: previewUrl, tab: {} }, previewUrl), null);
});

test("serializes repeated and concurrent tab updates", async () => {
  let sessionRules = [];
  let updatesInFlight = 0;
  let maximumUpdatesInFlight = 0;
  const dnr = {
    async getSessionRules() {
      return structuredClone(sessionRules);
    },
    async updateSessionRules(update) {
      updatesInFlight += 1;
      maximumUpdatesInFlight = Math.max(maximumUpdatesInFlight, updatesInFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      sessionRules = update.addRules;
      updatesInFlight -= 1;
    },
  };
  const manager = rulesApi.createManager(dnr);

  await Promise.all([
    manager.setEnabled(4, true),
    manager.setEnabled(8, true),
    manager.setEnabled(4, true),
  ]);
  assert.equal(maximumUpdatesInFlight, 1);
  assert.deepEqual(rulesApi.tabIdsFromRules(sessionRules), [4, 8]);

  await manager.setEnabled(4, false);
  assert.deepEqual(rulesApi.tabIdsFromRules(sessionRules), [8]);
  await manager.setEnabled(8, false);
  assert.deepEqual(sessionRules, []);
});

test("continues processing after a failed rule update", async () => {
  let sessionRules = [];
  let fail = true;
  const dnr = {
    async getSessionRules() {
      return structuredClone(sessionRules);
    },
    async updateSessionRules(update) {
      if (fail) {
        fail = false;
        throw new Error("permission denied");
      }
      sessionRules = update.addRules;
    },
  };
  const manager = rulesApi.createManager(dnr);
  await assert.rejects(manager.setEnabled(2, true), /permission denied/);
  await manager.setEnabled(3, true);
  assert.deepEqual(rulesApi.tabIdsFromRules(sessionRules), [3]);
});
