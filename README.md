# GitHub Local HTML Preview

Preview GitHub HTML locally, including private repositories you can already access, without tokens, GitHub App authorization, or third-party preview services.

The dependency-free Chrome extension adds a **Preview** button beside GitHub's **Raw** control on `.html` and `.htm` blob pages. It reads source already delivered to the authenticated GitHub page, opens a local full-tab preview, and keeps repository HTML outside the extension's privileged DOM.

## Privacy and security

- No OAuth, personal access token, GitHub App, proxy, or hosted preview service is used.
- Private repositories work only when you can already open the blob page in the current GitHub session. Organization SSO, IP restrictions, and browser extension policies still apply.
- Source is processed locally, held briefly in memory-backed `chrome.storage.session`, consumed once, and never persisted, synchronized, or sent to the extension developer.
- Scripts are off for every new preview. Inline CSS and `data:`/`blob:` images and fonts work; external scripts, styles, images, frames, media, forms, refreshes, popups, requests, and non-fragment links are blocked.
- **Run scripts** explicitly recreates the opaque-origin preview with inline scripts enabled. Scripts cannot access GitHub cookies, the GitHub DOM, extension APIs, the preview toolbar, the parent frame, or popups/top-level navigation. They may make outbound requests or navigate their own isolated frame.

The extension requests only `storage` and install-time access to `https://github.com/*`. It does not request `identity`, `cookies`, `tabs`, `<all_urls>`, raw-content hosts, or network-blocking permissions.

## Install unpacked (Chrome 112+)

1. Clone or download this directory.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose this repository directory.
5. Open a GitHub HTML blob page and select **Preview** beside **Raw**.

After updating the files, select **Reload** on the extension card and refresh GitHub. To package an internal ZIP from PowerShell:

```powershell
$Files = 'manifest.json','background.js','content.js','preview.html','preview.css','preview.js','sandbox.html','sandbox.js','lib','icons','README.md'
Compress-Archive -Path $Files -DestinationPath .\github-local-html-preview.zip -Force
```

## Verify

The tests require a currently supported Node.js release and no installed packages:

```powershell
npm test
Get-Content .\manifest.json | ConvertFrom-Json | Out-Null
```

For manual validation, test one public and one organization-private repository. Confirm there is no OAuth/PAT prompt or third-party preview request, a preview URL works only once, scripts do not run by default, the toggle permits inline scripts, and truncated/binary/oversized source produces a clear error.

## V1 limitations and future design

V1 targets `github.com` and self-contained HTML. Repository-relative assets and multi-file sites are unsupported. Referenced CSS, images, fonts, and script files are intentionally not fetched.

Future work:

- Authenticated same-origin asset retrieval with strict size/type limits.
- URL rewriting to short-lived local blob URLs and prompt revocation.
- Recursive CSS `url()` and `@import` parsing with cycle limits.
- Multi-page navigation inside the isolated preview.
- Configurable, policy-controlled GitHub Enterprise hosts.

GitHub's embedded React JSON and DOM selectors are undocumented. Extraction is centralized in `lib/core.js` and deliberately fails rather than silently rendering partial source when a supported complete representation is unavailable.
