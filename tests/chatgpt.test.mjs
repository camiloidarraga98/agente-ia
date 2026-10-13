import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createWorkspace } from "../server/workspace.mjs";
import { createApp } from "../server/index.mjs";

const fixtureKey = "test-only-gpt-action-key-over-32-characters";
const fixturePassword = "test-only-office-access-password";
const newTask = {
  agentId: "atlas",
  title: "Itinerario con DOT",
  prompt: "Ensayo a las 15:00 en Bogotá. Traslado pendiente.",
  execution: "chatgpt",
};

test("las tareas de ChatGPT esperan una respuesta y no invocan la API aunque haya clave", async (t) => {
  let calls = 0;
  const workspace = createWorkspace({
    apiKey: "test-only",
    fetchImpl: async () => {
      calls++;
      throw new Error("No debería llamar");
    },
  });
  t.after(() => workspace.close());
  const task = workspace.createTask(newTask);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(workspace.snapshot().tasks[0].status, "waiting");
  assert.equal(calls, 0);
  const result = workspace.saveChatGPTResult(task.id, {
    result: "Borrador revisado en ChatGPT. Traslado pendiente.",
  });
  assert.equal(result.status, "completed");
  assert.equal(result.resultSource, "manual");
  assert.equal(calls, 0);
});

test("el guardado es idempotente, respeta cancelaciones y no sobrescribe respuestas", (t) => {
  const workspace = createWorkspace();
  t.after(() => workspace.close());
  const task = workspace.createTask(newTask);
  workspace.saveChatGPTResult(task.id, { result: "Borrador" }, "action");
  const activityCount = workspace.snapshot().activity.length;
  assert.equal(
    workspace.saveChatGPTResult(task.id, { result: "Borrador" }, "action")
      .result,
    "Borrador",
  );
  assert.equal(workspace.snapshot().activity.length, activityCount);
  assert.throws(
    () => workspace.saveChatGPTResult(task.id, { result: "Otro borrador" }),
    /ya terminó/,
  );
  const cancelled = workspace.createTask(newTask);
  workspace.cancelTask(cancelled.id);
  assert.throws(
    () => workspace.saveChatGPTResult(cancelled.id, { result: "Borrador" }),
    /cancelada/,
  );
  assert.throws(
    () => workspace.saveChatGPTResult("missing", { result: "Borrador" }),
    /no existe/,
  );
  const demo = workspace.createTask({ ...newTask, execution: "auto" });
  assert.throws(
    () => workspace.saveChatGPTResult(demo.id, { result: "Borrador" }),
    /creadas para ChatGPT/,
  );
});

test("un flujo sigue en ChatGPT al cambiar la configuración y no duplica pasos al reintentar", (t) => {
  const workspace = createWorkspace();
  t.after(() => workspace.close());
  workspace.updateSettings({ executionMode: "chatgpt" });
  const run = workspace.createRun({
    workflowId: "itinerary",
    brief: "Show y ensayo el mismo día. Revisar con Luisa.",
  });
  assert.equal(workspace.snapshot().tasks.length, 1);
  workspace.updateSettings({ executionMode: "auto" });
  for (let i = 0; i < 5; i++) {
    const pending = workspace.listChatGPTTasks({ workflowRunId: run.id }).tasks;
    assert.equal(pending.length, 1);
    const task = pending[0];
    const context = workspace.getChatGPTTask(task.id);
    assert.match(context.context, /Revisar con Luisa/);
    if (i) assert.match(context.context, new RegExp(`Respuesta ${i - 1}`));
    workspace.saveChatGPTResult(
      task.id,
      { result: `Respuesta ${i}` },
      "action",
    );
    workspace.saveChatGPTResult(
      task.id,
      { result: `Respuesta ${i}` },
      "action",
    );
    assert.equal(workspace.snapshot().tasks.length, Math.min(i + 2, 5));
  }
  assert.equal(workspace.snapshot().runs[0].status, "completed");
  assert.ok(
    workspace
      .snapshot()
      .tasks.every((t) => t.mode === "chatgpt" && t.resultSource === "action"),
  );
});

test("las tareas y los flujos de ChatGPT pendientes sobreviven al reinicio", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "jac-gpt-restart-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const workspace = createWorkspace({ dataDir: dir });
  workspace.updateSettings({ executionMode: "chatgpt" });
  const run = workspace.createRun({
    workflowId: "review",
    brief: "Consultar confirmaciones con Luisa.",
  });
  workspace.close();
  const restored = createWorkspace({ dataDir: dir });
  assert.equal(restored.snapshot().runs[0].status, "running");
  assert.equal(restored.snapshot().tasks[0].status, "waiting");
  assert.equal(restored.listChatGPTTasks({ workflowRunId: run.id }).total, 1);
  restored.close();
});

async function apiServer(t, options = {}) {
  const { server } = createApp({
    accessPassword: fixturePassword,
    requireAuth: true,
    gptActionsKey: fixtureKey,
    publicOrigin: "https://office.example.test",
    apiKey: "test-only",
    fetchImpl: async () => {
      throw new Error("No usar modelos en las acciones");
    },
    ...options,
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
  const call = (path, method = "GET", body, headers = {}) =>
    fetch(base + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  return { call };
}

test("las acciones usan una clave separada, no aceptan cookies y no acceden a ajustes privados", async (t) => {
  const { call } = await apiServer(t);
  const login = await call("/api/auth/login", "POST", {
    password: fixturePassword,
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.equal((await call("/api/gpt/context")).status, 401);
  assert.equal(
    (await call("/api/gpt/context", "GET", undefined, { Cookie: cookie }))
      .status,
    401,
  );
  assert.equal(
    (
      await call("/api/gpt/context", "GET", undefined, {
        Authorization: `Bearer ${fixturePassword}`,
      })
    ).status,
    401,
  );
  const headers = { Authorization: `Bearer ${fixtureKey}` };
  assert.equal(
    (await call("/api/gpt/context", "GET", undefined, headers)).status,
    200,
  );
  assert.equal(
    (await call("/api/settings", "PATCH", { dotInstructions: "No" }, headers))
      .status,
    401,
  );
  assert.equal(
    (
      await call(
        "/api/gpt/settings",
        "PATCH",
        { dotInstructions: "No" },
        headers,
      )
    ).status,
    404,
  );
  assert.equal(
    (await call("/api/gpt/setup", "GET", undefined, headers)).status,
    401,
  );
  const workspace = await (
    await call("/api/workspace", "GET", undefined, { Cookie: cookie })
  ).json();
  assert.ok(!JSON.stringify(workspace).includes(fixtureKey));
  assert.ok(!JSON.stringify(workspace).includes(fixturePassword));
});

test("la ruta de acciones crea, lee y completa tareas sin ejecutar modelos", async (t) => {
  const { call } = await apiServer(t);
  const headers = { Authorization: `Bearer ${fixtureKey}` };
  const response = await call(
    "/api/gpt/tasks",
    "POST",
    { ...newTask, execution: "auto" },
    headers,
  );
  assert.equal(response.status, 201);
  const task = await response.json();
  assert.equal(task.mode, "chatgpt");
  assert.equal(task.status, "waiting");
  const context = await (
    await call(`/api/gpt/tasks/${task.id}`, "GET", undefined, headers)
  ).json();
  assert.equal(context.agent.id, "atlas");
  assert.equal(context.task.context, undefined);
  const result = await call(
    `/api/gpt/tasks/${task.id}/result`,
    "POST",
    { result: "Borrador: consultar el traslado." },
    headers,
  );
  assert.equal(result.status, 200);
  assert.equal((await result.json()).resultSource, "action");
  const pending = await (
    await call("/api/gpt/tasks", "GET", undefined, headers)
  ).json();
  assert.equal(pending.total, 0);
});

test("el esquema es público, HTTPS y marca el guardado como una acción con consecuencias", async (t) => {
  const { call } = await apiServer(t);
  const response = await call("/api/gpt/schema");
  assert.equal(response.status, 200);
  const schema = await response.json();
  assert.equal(schema.openapi, "3.1.0");
  assert.equal(schema.servers[0].url, "https://office.example.test");
  assert.equal(schema.components.securitySchemes.GPTKey.scheme, "bearer");
  assert.equal(
    schema.paths["/api/gpt/tasks/{taskId}/result"].post[
      "x-openai-isConsequential"
    ],
    true,
  );
  assert.ok(!JSON.stringify(schema).includes(fixtureKey));
  const insecure = await apiServer(t, {
    publicOrigin: "http://office.example.test",
  });
  assert.equal((await insecure.call("/api/gpt/schema")).status, 503);
  const unavailable = await apiServer(t, { gptActionsKey: "" });
  assert.equal((await unavailable.call("/api/gpt/context")).status, 503);
});
