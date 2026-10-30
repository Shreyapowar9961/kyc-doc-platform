// Smoke test for the auth routes.
// 1) Start the backend in one window:  node server.js
// 2) Run this in another window:       node scripts/smoke-auth.js
// It uses throwaway users, prints PASS/FAIL lines, and never prints tokens
// or passwords. Each run creates 2 test users (APPLICANT) in the database.

const BASE = process.env.API_URL || "http://localhost:4000";
const stamp = Date.now();
const email = `smoke-${stamp}@example.com`;
const sneakyEmail = `smoke-sneaky-${stamp}@example.com`;
const password = `Smoke-Test-Pw-${stamp}`;

let failures = 0;

function check(name, ok, hint = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !hint ? "" : "  -> " + hint}`);
}

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    // response had no JSON body
  }
  return { status: res.status, json };
}

async function main() {
  try {
    await fetch(BASE + "/health");
  } catch (_) {
    console.log(`Cannot reach ${BASE}. Start the backend first with: node server.js`);
    process.exit(2);
  }

  let r = await call("POST", "/auth/register", { email, name: "Smoke Test", password });
  check(
    "register -> 201, role APPLICANT, no passwordHash",
    r.status === 201 && r.json?.user?.role === "APPLICANT" && !("passwordHash" in (r.json?.user || {})),
    `status ${r.status}`
  );

  r = await call("POST", "/auth/register", { email, password });
  check("same email again -> 409", r.status === 409, `status ${r.status}`);

  r = await call("POST", "/auth/register", { email: sneakyEmail, password, role: "ADMIN" });
  check(
    "register with role ADMIN -> role stays APPLICANT",
    r.status === 201 && r.json?.user?.role === "APPLICANT",
    `status ${r.status}, role ${r.json?.user?.role}`
  );

  r = await call("POST", "/auth/register", { email: `weak-${stamp}@example.com`, password: "short" });
  check("weak password -> 400", r.status === 400, `status ${r.status}`);

  r = await call("POST", "/auth/login", { email, password: "definitely-wrong-password" });
  check("wrong password -> 401", r.status === 401, `status ${r.status}`);

  r = await call("POST", "/auth/login", { email, password });
  const token = r.json?.token;
  check(
    "login -> 200 with a token and a safe user",
    r.status === 200 && typeof token === "string" && token.length > 100 && !("passwordHash" in (r.json?.user || {})),
    `status ${r.status}`
  );

  r = await call("GET", "/auth/me", null, token);
  check("/auth/me with token -> 200", r.status === 200 && r.json?.user?.email === email, `status ${r.status}`);

  r = await call("GET", "/auth/me");
  check("/auth/me without token -> 401", r.status === 401, `status ${r.status}`);

  r = await call("GET", "/auth/me", null, "not-a-real-token");
  check("/auth/me with fake token -> 401", r.status === 401, `status ${r.status}`);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.log("Test script error:", err.message);
  process.exit(2);
});
