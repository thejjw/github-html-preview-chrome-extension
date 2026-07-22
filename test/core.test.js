const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../extension/lib/core.js");

test("recognizes supported GitHub blob URLs and derives raw asset paths", () => {
  for (const url of [
    "https://github.com/o/r/blob/main/index.html",
    "https://github.com/o/r/blob/v1/docs/PAGE.HTM?plain=1#L2",
    "https://github.com/o/r/blob/abc123/a/b.html"
  ]) assert.ok(core.parseBlobUrl(url), url);
  for (const url of ["https://github.com/o/r/raw/main/a.html", "https://evil.test/o/r/blob/main/a.html", "https://github.com/o/r/blob/main/a.js"])
    assert.equal(core.parseBlobUrl(url), null, url);
  const parsed = core.parseBlobUrl("https://github.com/o/r/blob/main/docs/pages/index.html?plain=1#L2");
  assert.equal(parsed.rawBaseUrl, "https://raw.githubusercontent.com/o/r/main/docs/pages/");
  assert.equal(core.resolveAssetUrl("../img/logo.png", parsed.rawBaseUrl), "https://raw.githubusercontent.com/o/r/main/docs/img/logo.png");
  assert.equal(core.resolveAssetUrl("/img/logo.png", parsed.rawBaseUrl), "/img/logo.png");
  assert.equal(core.resolveAssetUrl("https://cdn.example/x.png", parsed.rawBaseUrl), "https://cdn.example/x.png");
});

test("extracts guarded raw lines from nested React JSON", () => {
  const json = JSON.stringify({ payload: { blob: { rawLines: ["<h1>x</h1>", "<p>y</p>"] } } });
  assert.equal(core.extractFromJsonTexts([json]), "<h1>x</h1>\n<p>y</p>");
});

test("preserves HTML source without escaping it", () => {
  const source = "<!doctype html><p title=\"a&b\">&lt;x&gt;</p>";
  assert.equal(core.extractFromJsonTexts([JSON.stringify({ rawLines: [source] })]), source);
});

test("returns absence for schema changes without an eligible line array", () => {
  assert.equal(core.extractFromJsonTexts([JSON.stringify({ payload: { lines: [{ text: "partial" }] } })]), null);
  assert.equal(core.extractFromJsonTexts([JSON.stringify({ rawLines: ["ok", 42] })]), null);
});

test("rejects malformed, truncated, binary, empty, and oversized content", () => {
  assert.throws(() => core.extractFromJsonTexts(["{"]), /could not be parsed/);
  assert.throws(() => core.extractFromJsonTexts([JSON.stringify({ isTruncated: true, rawLines: ["x"] })]), /truncated/);
  assert.throws(() => core.validateHtml("a\0b"), /binary/);
  assert.throws(() => core.validateHtml(""), /did not provide/);
  assert.throws(() => core.validateHtml("x".repeat(core.MAX_HTML_BYTES + 1)), /5 MB/);
});

test("validates exact, fresh messages and sender URLs", () => {
  const url = "https://github.com/o/r/blob/main/a.html";
  const payload = { html: "<p>x</p>", filename: "a.html", sourceUrl: url, createdAt: Date.now() };
  const expected = {
    ...payload,
    rawBaseUrl: "https://raw.githubusercontent.com/o/r/main/",
  };
  assert.deepEqual(core.validateOpenMessage({ type: "OPEN_PREVIEW", payload }, url), expected);
  assert.deepEqual(core.validateOpenMessage({ type: "OPEN_PREVIEW", payload }, "https://github.com/o/r/issues"), expected);
  assert.equal(core.validateOpenMessage({ type: "OPEN_PREVIEW", payload }, "https://evil.test/x"), null);
  assert.equal(core.validateOpenMessage({ type: "OPEN_PREVIEW", payload: { ...payload, filename: "b.html" } }, url), null);
  assert.equal(core.validateOpenMessage({ type: "OPEN_PREVIEW", payload: { ...payload, sourceUrl: "https://evil.test/a.html" } }, url), null);
  assert.equal(core.validateOpenMessage({ type: "OPEN_PREVIEW", payload: { ...payload, createdAt: 0 } }, url), null);
  assert.equal(core.validateOpenMessage({ type: "OTHER", payload }, url), null);
});
