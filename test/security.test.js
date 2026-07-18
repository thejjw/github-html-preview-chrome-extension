const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const sandbox = fs.readFileSync(path.join(root, "sandbox.js"), "utf8");

test("manifest has a minimal permission surface", () => {
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://github.com/*"]);
  assert.equal(manifest.web_accessible_resources, undefined);
  for (const permission of ["identity", "cookies", "tabs", "<all_urls>"]) assert.ok(!manifest.permissions.includes(permission));
});

test("sandbox policy cannot acquire the extension origin", () => {
  assert.match(manifest.content_security_policy.sandbox, /\bsandbox allow-scripts\b/);
  assert.doesNotMatch(manifest.content_security_policy.sandbox, /allow-same-origin/);
  assert.deepEqual(manifest.sandbox.pages, ["sandbox.html"]);
});

test("default renderer removes active and outbound content", () => {
  assert.match(sandbox, /script,iframe,form/);
  assert.match(sandbox, /startsWith\("#"\)/);
  assert.match(sandbox, /meta\[http-equiv='refresh' i\]/);
  assert.match(sandbox, /default-src 'none'/);
  assert.match(sandbox, /event\.data\.runScripts \? "allow-scripts" : ""/);
});
