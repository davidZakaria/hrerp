## 2024-05-14 - Redundant DB Lookups in API Endpoints
**Learning:** `req.user` attached by the auth middleware already contains the user role (`req.user.role`) decoded from the JWT token. Querying the database with `User.findById(req.user.id)` to check user roles inside API routes is redundant and introduces an unnecessary database query overhead per request.
**Action:** Use `req.user.role` from the JWT payload directly for authorization checks instead of fetching the user document from the database.
