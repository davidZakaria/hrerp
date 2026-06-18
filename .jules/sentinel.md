## 2024-05-24 - Rate Limiter Applied to Sensitive Endpoints
**Vulnerability:** Registration (`/api/auth/register`), password reset request (`/api/auth/reset-password-request`), and password reset (`/api/auth/reset-password`) endpoints were vulnerable to brute-force attacks, email enumeration, and spam due to a lack of rate-limiting controls.
**Learning:** Only the login endpoint was protected, creating a false sense of security. Standard authentication endpoints must all be included under rate-limiting bounds.
**Prevention:** Ensure any endpoint performing authentication, registration, or password modifications is subjected to strict rate limits using configured middleware like `authLimiter`.
