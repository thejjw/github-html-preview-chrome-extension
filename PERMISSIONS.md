# Permissions

GitHub Local HTML Preview requests only the access required for its core function:

- `storage`: Holds one preview payload briefly in memory-backed `chrome.storage.session` while the new preview tab opens. The payload is removed after one read and is never synchronized.
- `https://github.com/*`: Adds the Preview button to GitHub blob pages and, when necessary, re-fetches the current page using the user's existing same-origin GitHub session.
- `declarativeNetRequestWithHostAccess`: Allows response-header rules only on hosts the user has separately approved. Unlike the broader `declarativeNetRequest` permission, it does not add an install-time network warning.
- Optional `https://raw.githubusercontent.com/*`: Requested from the **Allow active content** checkbox or **Retry assets** button. While active, two session rules correct `Content-Type` for GitHub Raw stylesheet and script requests only in opted-in preview tabs. The rules do not read response bodies, remove `X-Content-Type-Options`, add credentials, or affect other tabs. They are removed when active content is disabled or the preview tab closes.

The optional raw-host permission remains granted after approval so Chrome does not need to prompt for every preview, but no MIME rule is active until the user enables active content. Declining it leaves other permitted HTTPS assets enabled and public GitHub Raw CSS or JavaScript may fail.

The extension does not request `identity`, `cookies`, `tabs`, `<all_urls>`, or broad network-blocking permissions. It neither grants nor bypasses repository access, and private raw resources remain unsupported.
