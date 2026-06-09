## 2024-06-09 - Path Traversal Vulnerability in File Download Route
**Vulnerability:** A route returning files dynamically based on a user-provided parameter `filename` using `path.join(__dirname, ..., filename)` was susceptible to directory traversal, allowing reading of arbitrary files by supplying paths like `../../etc/passwd`.
**Learning:** Even if the input is meant for simple file fetching within a designated directory, concatenating it blindly with `path.join` poses a critical security risk.
**Prevention:** Always sanitize filenames using `path.basename()` before combining them into filesystem paths. This drops any directory sequences attached to the file.
