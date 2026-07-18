# Permissions

GitHub Local HTML Preview requests only the access required for its core function:

- `storage`: Holds one preview payload briefly in memory-backed `chrome.storage.session` while the new preview tab opens. The payload is removed after one read and is never synchronized.
- `https://github.com/*`: Adds the Preview button to GitHub blob pages and, when necessary, re-fetches the current page using the user's existing same-origin GitHub session.

The extension does not request `identity`, `cookies`, `tabs`, `<all_urls>`, raw-content hosts, or network-blocking permissions. It neither grants nor bypasses repository access.
