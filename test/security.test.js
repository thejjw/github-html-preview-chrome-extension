const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "extension", "manifest.json"), "utf8"));
const sandbox = fs.readFileSync(path.join(root, "extension", "sandbox.js"), "utf8");
const previewHtml = fs.readFileSync(path.join(root, "extension", "preview.html"), "utf8");
const previewJs = fs.readFileSync(path.join(root, "extension", "preview.js"), "utf8");

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

test("script mode permits referenced scripts only after opt-in", () => {
  assert.doesNotMatch(sandbox, /querySelectorAll\("script\[src\]"\)/);
  assert.match(sandbox, /script-src 'unsafe-inline' 'unsafe-eval' https: http: data: blob:/);
  assert.match(manifest.content_security_policy.sandbox, /script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:/);
  assert.match(manifest.content_security_policy.sandbox, /style-src 'self' 'unsafe-inline' https:/);
  assert.match(manifest.content_security_policy.sandbox, /img-src https: data: blob:/);
  assert.match(manifest.content_security_policy.sandbox, /font-src https: data: blob:/);
  assert.match(manifest.content_security_policy.sandbox, /media-src https: data: blob:/);
  assert.match(sandbox, /event\.data\.runScripts \? "allow-scripts" : ""/);
  assert.match(sandbox, /GitHubHtmlPreview\.resolveAssetUrl/);
  assert.match(sandbox, /rawBaseUrl/);
  assert.match(previewJs, /rawBaseUrl: payload\.rawBaseUrl/);
});

test("preview explains source and script risk accessibly", () => {
  assert.match(previewJs, /filename\.title = payload\.sourceUrl/);
  assert.match(previewHtml, /aria-describedby="scripts-warning"/);
  assert.match(previewHtml, /Allow active content/);
  assert.match(previewHtml, /path-relative GitHub raw resources/);
  assert.match(previewHtml, /Use at your own risk\./);
});
