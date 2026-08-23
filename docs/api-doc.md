# API Documentation

The authoritative, always-up-to-date API reference is the live Swagger UI,
generated directly from the route/DTO decorators in `server/src/api/**`:

- Development: `http://localhost:8000/api`
- Production: `<your deployed domain>/api`

This file previously duplicated the endpoint list by hand and drifted out of
sync with the real routes (missing the `/v1` version prefix, showing tokens
in the JSON body when they're actually set as HTTP-only cookies, missing
endpoints entirely). Rather than re-introduce that drift, this file stays a
short, manually-checked summary — for exact request/response shapes, use
Swagger.

## Base URL

All routes are versioned via URI prefix: `/v1/api/...`.

- Development: `http://localhost:8000/v1/api`
- Production: TBD

## Authentication

Access and refresh tokens are set as HTTP-only cookies on
register/login/refresh/Google auth (`access_token`, `refresh_token`). Mobile
clients that can't rely on cookies may instead send
`Authorization: Bearer <access_token>`, and pass the refresh token in the
request body to `POST /auth/token/refresh`.

## Response format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Error message",
  "errors": ["..."],
  "statusCode": 400
}
```
Both shapes are enforced globally (`ResponseInterceptor` / `HttpExceptionFilter`
in `server/src/common/`), not per-controller.

## Endpoints (see Swagger for full request/response schemas)

### Auth — `/v1/api/auth`
- `POST /signup`, `POST /login`, `POST /token/refresh`, `POST /logout`
- `GET /me`, `PUT /profile`, `PUT /password`
- `POST /forgot-password`, `POST /reset-password`
- `POST /google`

### Links — `/v1/api/links`
- `POST /` — save a link
- `GET /?search=&source=&category=&limit=&offset=` — list the current user's
  saved links (paginated, `limit` capped at 100)

### Health
- `GET /health` — checks the database connection; returns 503 if it's down.
