import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/index.mjs";

const fixturePassword = "test-only-jac-access-password";
async function protectedServer(t, secure = false) {
  const { server } = createApp({
    accessPassword: fixturePassword,
    requireAuth: true,
    secureCookies: secure,
    demoDelay: 2,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, cookie, extraHeaders = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
  return { base, post };
}

test("producción rechaza iniciar sin una contraseña válida", () => {
  assert.throws(() => createApp({ requireAuth: true }), /JAC_ACCESS_PASSWORD/);
  assert.throws(() => createApp({ accessPassword: "short" }), /16 caracteres/);
});

test("la app protege datos y tareas, conservando disponible el health check", async (t) => {
  const { base, post } = await protectedServer(t);
  assert.equal((await fetch(base + "/api/health")).status, 200);
  assert.deepEqual(await (await fetch(base + "/api/auth/status")).json(), {
    required: true,
    authenticated: false,
  });
  assert.equal((await fetch(base + "/api/workspace")).status, 401);
  assert.equal(
    (
      await post("/api/tasks", {
        agentId: "dot",
        title: "Privado",
        prompt: "Privado",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dotInstructions: "Privado" }),
      })
    ).status,
    401,
  );
});

test("login crea una cookie segura y logout revoca la sesión anterior", async (t) => {
  const { base, post } = await protectedServer(t, true);
  assert.equal(
    (await post("/api/auth/login", { password: "incorrect" })).status,
    401,
  );
  const login = await post("/api/auth/login", { password: fixturePassword });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Max-Age=28800/);
  const token = cookie.split(";")[0];
  const workspace = await fetch(base + "/api/workspace", {
    headers: { Cookie: token },
  });
  assert.equal(workspace.status, 200);
  assert.equal((await workspace.json()).accessProtected, true);
  const logout = await post("/api/auth/logout", {}, token);
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(
    (await fetch(base + "/api/workspace", { headers: { Cookie: token } }))
      .status,
    401,
  );
});

test("login limita intentos fallidos y rechaza solicitudes de otro sitio", async (t) => {
  const { post } = await protectedServer(t);
  assert.equal(
    (
      await post("/api/auth/login", { password: fixturePassword }, undefined, {
        "Sec-Fetch-Site": "cross-site",
      })
    ).status,
    403,
  );
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await post("/api/auth/login", { password: "incorrect" })).status,
      401,
    );
  assert.equal(
    (await post("/api/auth/login", { password: fixturePassword })).status,
    429,
  );
});
