## 2024-05-15 - Prevent Partial Folder Match Bypass in Path Traversal Checks
**Vulnerability:** A path traversal check using `startsWith` allowed partial folder name matches, such as `uploads/resumes-fake` matching `uploads/resumes`.
**Learning:** Checking if a path starts with a directory string is insufficient because it doesn't account for paths that share the same prefix but continue with different names. Express decodes URL parameters automatically, making bypasses easier to construct.
**Prevention:** When validating paths using `startsWith` for directory boundaries, always append `path.sep` to the target directory and allow an exact match for the directory itself.
