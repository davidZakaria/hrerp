## 2024-05-18 - Optimize User Role Authorization Checks
**Learning:** Checking the database for a user just to check their role is redundant when `role` is already included in the JWT payload and attached to `req.user` by the `auth` middleware.
**Action:** Always prefer using `req.user.role` (attached by `auth.js`) for authorization checks in Express route handlers rather than making an extra `User.findById(req.user.id)` call, saving an unneeded round trip to the database. Add `.lean()` to Mongoose read-only queries.
