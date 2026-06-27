## 2024-05-09 - Path Traversal Bypass via Partial Folder Match
**Vulnerability:** A `startsWith` check on a file path (`normalizedPath.startsWith(uploadsDir)`) without appending a trailing directory separator (`path.sep`) is vulnerable to a partial directory name match bypass (e.g. `/uploads/avatars-fake/secret.txt` matches `/uploads/avatars`).
**Learning:** Checking if a path is inside a directory using a naive string prefix match is insufficient because it doesn't enforce directory boundaries.
**Prevention:** Always append a trailing `path.sep` (e.g. `path.join(dir, path.sep)`) to the target directory when using `startsWith`, or use more robust path resolution methods like checking if the relative path starts with `..`.
