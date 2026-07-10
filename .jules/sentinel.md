
## 2024-05-15 - Partial Folder Match Path Traversal Bypass
**Vulnerability:** A path traversal check used `.startsWith(uploadsDir)` to validate access to a protected directory. This allowed accessing files in similarly-named sibling directories (e.g., `uploadsDir-fake`) by using paths like `../uploadsDir-fake/secret.txt`.
**Learning:** `startsWith` on a string path only checks the character sequence, not the path components. If a target directory is `/app/uploads/medical-documents`, accessing `/app/uploads/medical-documents-fake/secret.txt` starts with the expected string and bypasses the check.
**Prevention:** Always append a directory separator (`path.sep`) to the target directory path when using `startsWith` to ensure an exact folder match. Also explicitly allow exact matches to the target directory itself if accessing its root is expected (`!normalizedPath.startsWith(uploadsDir + path.sep) && normalizedPath !== uploadsDir`).
