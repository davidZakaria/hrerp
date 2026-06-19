## 2024-05-18 - Prevent authentication-related brute force attacks
**Vulnerability:** Rate limiting was only applied to the login endpoint, leaving registration and password resets vulnerable to brute force and enumeration attacks.
**Learning:** `authLimiter` was specifically hardcoded for the `/login` endpoint instead of encompassing all authentication endpoints susceptible to attack vectors.
**Prevention:** Apply an encompassing standard for `authLimiter` to include all routes handling credentials or account state alterations (e.g., login, register, password resets).
