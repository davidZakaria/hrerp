## 2024-11-20 - Partial Path Match Bypass in Directory Traversal Protection
**Vulnerability:** A partial folder match bypass in the `server.js` `protectedFileAccess` middleware directory traversal check.
**Learning:** `normalizedPath.startsWith(uploadsDir)` is insufficient to prevent access to directories that start with the same prefix (e.g., `uploads/resumes-secret` when the allowed directory is `uploads/resumes`).
**Prevention:** Always append a trailing path separator (`path.sep`) to the target directory path when using `startsWith` boundary checks, while explicitly allowing exact matches to the target directory if base access is expected: `!normalizedPath.startsWith(uploadsDir + path.sep) && normalizedPath !== uploadsDir`.
