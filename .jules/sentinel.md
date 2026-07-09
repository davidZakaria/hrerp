## 2024-07-09 - [CRITICAL] Path Traversal Bypass via Partial Folder Match
**Vulnerability:** In `server.js`, file access validation used `normalizedPath.startsWith(uploadsDir)`. This allows access to files in folders that happen to start with the same prefix (e.g. `uploads/resumes-hacked` would bypass the check for `uploads/resumes`).
**Learning:** `startsWith` is vulnerable to partial folder match bypass if the path separator (`/` or `\`) is not explicitly included in the check.
**Prevention:** Always append `path.sep` to the base directory path when using `startsWith` to validate directory boundaries, and consider allowing an exact match to the base directory itself (`normalizedPath === uploadsDir`) if accessing the directory root is legitimate.
