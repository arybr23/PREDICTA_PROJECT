/**
 * Session cookie attributes.
 *
 * The SPA and the API are cross-site in production: both live under
 * *.vercel.app, but `vercel.app` is on the Public Suffix List, so each
 * subdomain is its own site. A SameSite=Lax session cookie is then stored by
 * the browser but never attached to the API's fetch/XHR, and every request
 * comes back 401 "Not logged in" no matter what is in the database.
 *
 * Over https the cookie is therefore issued as SameSite=None; Secure, so a
 * cross-site call carries it. Plain-http local dev keeps Lax: localhost:5173
 * → localhost:5000 is same-site anyway (the site key ignores the port), and
 * a Secure cookie is not something to hand out over http.
 */

function isHttps(req) {
  const forwarded = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  return req.secure || forwarded === "https";
}

function attributes(req, maxAge) {
  const sameSite = isHttps(req) ? "SameSite=None; Secure" : "SameSite=Lax";
  return `Path=/; HttpOnly; Max-Age=${maxAge}; ${sameSite}`;
}

function setSessionCookie(req, res, userId) {
  res.setHeader("Set-Cookie", `session=${userId}; ${attributes(req, 86400)}`);
}

function clearSessionCookie(req, res) {
  res.setHeader("Set-Cookie", `session=; ${attributes(req, 0)}`);
}

module.exports = { setSessionCookie, clearSessionCookie };
