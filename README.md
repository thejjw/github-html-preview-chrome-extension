# GitHub Local HTML Preview

Preview GitHub HTML locally, including private repositories you can already access, without tokens, GitHub App authorization, or third-party preview services.

The dependency-free Chrome extension adds a **Preview** button beside GitHub's **Raw** control on `.html` and `.htm` blob pages. It reads source already delivered to the authenticated GitHub page, opens a local full-tab preview, and keeps repository HTML outside the extension's privileged DOM.

## Features

- **Private repository support:** Reuses the GitHub access you already have without OAuth, personal access tokens, or GitHub App authorization.
- **Local processing:** Never sends source to an extension developer, proxy, or hosted preview service.
- **Safe by default:** Renders inline CSS and data assets while scripts and external resources remain blocked.
- **Explicit active-content mode:** Loads scripts and HTTPS styles, images, fonts, and media only after you enable **Allow active content** for that preview. Path-relative assets resolve against the file's GitHub repository directory.
- **GitHub navigation support:** Integrates the button to default GitHub interface.
- **No build step:** Uses plain Manifest V3 HTML, CSS, and JavaScript with no runtime dependencies.

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome 112 or later.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `extension` folder.

**Alternatively, install from the [Chrome Web Store](https://chromewebstore.google.com/detail/dbabdphgaamgcibbfjaldmhnikccjnih)**  
_(Note: The Chrome Web Store version may not always have the latest updates.)_

## Usage

1. Open a `.html` or `.htm` file on a GitHub blob page.
2. Click **Preview** beside GitHub's **Raw** control.
3. Optionally enable **Allow active content** to recreate the isolated preview with scripts and HTTPS assets enabled, including path-relative assets from the file's GitHub raw directory.

## Privacy and security

- No OAuth, personal access token, GitHub App, proxy, or hosted preview service is used.
- Private repositories work only when you can already open the blob page in the current GitHub session. Organization SSO, IP restrictions, and browser extension policies still apply.
- Source is processed locally, held briefly in memory-backed `chrome.storage.session`, consumed once, and never persisted, synchronized, or sent to the extension developer.
- Scripts are off for every new preview. Inline CSS and `data:`/`blob:` images and fonts work; external scripts, styles, images, frames, media, forms, refreshes, popups, requests, and non-fragment links are blocked.
- **Allow active content** explicitly recreates the opaque-origin preview with inline and referenced external scripts plus HTTPS styles, images, fonts, and media enabled. Path-relative references such as `./style.css` and `../images/logo.png` resolve against the file's `raw.githubusercontent.com` directory and work only when the browser can access those resources. Active content cannot access GitHub cookies, the GitHub DOM, extension APIs, the preview toolbar, the parent frame, or popups/top-level navigation. It may contact third parties, make outbound requests, or navigate its own isolated frame.
- Detectable script, stylesheet, image, and media failures are collected in a preview warning. Browsers do not expose the HTTP status of failed subresources, so the extension cannot distinguish rate limiting from missing, blocked, CORS-rejected, or incompatible resources. Retry is manual to avoid amplifying a GitHub throttle.

The extension requests only `storage` and install-time access to `https://github.com/*`. It does not request `identity`, `cookies`, `tabs`, `<all_urls>`, raw-content hosts, or network-blocking permissions.

After updating the files, select **Reload** on the extension card and refresh GitHub. To package an internal ZIP from PowerShell:

```powershell
Compress-Archive -Path .\extension\* -DestinationPath .\github-local-html-preview.zip -Force
```

## Permissions

- `storage`: Holds a preview briefly in memory-backed session storage while its tab opens.
- `https://github.com/*`: Adds the page button and reads or re-fetches the current GitHub blob page with the existing same-origin session.

See [PERMISSIONS.md](PERMISSIONS.md) for the complete explanation.

## Verify

The tests require a currently supported Node.js release and no installed packages:

```powershell
npm test
Get-Content .\extension\manifest.json | ConvertFrom-Json | Out-Null
```

For manual validation, test one public and one organization-private repository. Confirm there is no OAuth/PAT prompt or third-party preview request, a preview URL works only once, scripts do not run by default, the toggle permits inline scripts, and truncated/binary/oversized source produces a clear error.

## V1 limitations and future design

V1 targets `github.com`. Path-relative scripts, styles, images, fonts, and media load from GitHub raw URLs only after explicit opt-in. Root-relative paths, `srcset`, private resources that are not directly browser-accessible, and multi-page navigation remain unsupported. Failures inside CSS, such as background images and nested imports, may not emit a browser error event and therefore may not appear in the warning.

Future work:

- Authenticated same-origin asset retrieval with strict size/type limits.
- URL rewriting to short-lived local blob URLs and prompt revocation.
- Recursive CSS `url()` and `@import` parsing with cycle limits.
- Multi-page navigation inside the isolated preview.
- Configurable, policy-controlled GitHub Enterprise hosts.

GitHub's embedded React JSON and DOM selectors are undocumented. Extraction is centralized in `extension/lib/core.js` and deliberately fails rather than silently rendering partial source when a supported complete representation is unavailable.

## License

See [LICENSE](LICENSE).

## Author

- Jaewoo Jeon [@thejjw](https://github.com/thejjw)

If you find this extension helpful, consider supporting its development through [GitHub Sponsors](https://github.com/sponsors/thejjw) or [Buy Me a Coffee](https://buymeacoffee.com/thejjw).

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/default-yellow.png)](https://buymeacoffee.com/thejjw)
