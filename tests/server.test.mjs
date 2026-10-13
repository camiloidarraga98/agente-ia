import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWorkspace } from "../server/workspace.mjs";
import { createApp } from "../server/index.mjs";

async function waitFor(predicate, timeout = 2000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("La operación no terminó dentro del tiempo esperado");
}
const taskInput = (agentId = "dot", title = "Revisar brief") => ({
  agentId,
  title,
  prompt:
    "Show el 24 de octubre. Prueba de sonido a las 16:00. Falta confirmar el traslado.",
});

test("se guardan tareas y configuración sin almacenar credenciales", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "jac-persistence-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const workspace = createWorkspace({ dataDir: dir, demoDelay: 2 });
  workspace.updateSettings({
    dotInstructions: "Consulta los datos pendientes con Luisa.",
  });
  const task = workspace.createTask(taskInput());
  await waitFor(() => workspace.snapshot().tasks[0].status === "completed");
  workspace.close();
  const restored = createWorkspace({ dataDir: dir });
  assert.equal(restored.snapshot().tasks[0].id, task.id);
  assert.equal(
    restored.snapshot().settings.dotInstructions,
    "Consulta los datos pendientes con Luisa.",
  );
  assert.match(restored.snapshot().tasks[0].result, /VISTA DE DEMOSTRACIÓN/);
  assert.equal("apiKey" in restored.snapshot(), false);
  restored.close();
});

test("varios agentes trabajan en paralelo, con una tarea a la vez por agente", async (t) => {
  const workspace = createWorkspace({ demoDelay: 40 });
  t.after(() => workspace.close());
  workspace.createTask(taskInput("dot", "Primera de DOT"));
  workspace.createTask(taskInput("dot", "Segunda de DOT"));
  workspace.createTask(taskInput("atlas"));
  workspace.createTask(taskInput("vera"));
  workspace.createTask(taskInput("tempo"));
  await waitFor(
    () =>
      workspace.snapshot().tasks.filter((t) => t.status === "running")
        .length === 3,
  );
  const running = workspace
    .snapshot()
    .tasks.filter((t) => t.status === "running");
  assert.equal(new Set(running.map((t) => t.agentId)).size, 3);
  assert.equal(
    workspace.snapshot().tasks.find((t) => t.title === "Segunda de DOT").status,
    "queued",
  );
  await waitFor(() =>
    workspace.snapshot().tasks.every((t) => t.status === "completed"),
  );
  const first = workspace
    .snapshot()
    .tasks.find((t) => t.title === "Primera de DOT");
  const second = workspace
    .snapshot()
    .tasks.find((t) => t.title === "Segunda de DOT");
  assert.ok(new Date(second.startedAt) >= new Date(first.completedAt));
});

test("un flujo comparte el brief y todos los resultados anteriores en orden", async (t) => {
  const requests = [];
  const workspace = createWorkspace({
    apiKey: "test-only",
    fetchImpl: async (url, options) => {
      requests.push(JSON.parse(options.body));
      return Response.json({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: `Resultado del paso ${requests.length}`,
              },
            ],
          },
        ],
      });
    },
  });
  t.after(() => workspace.close());
  const run = workspace.createRun({
    workflowId: "itinerary",
    brief: "Brief confirmado: show del 24 de octubre.",
  });
  await waitFor(() => workspace.snapshot().runs[0].status === "completed");
  assert.equal(requests.length, 5);
  assert.match(requests[0].input, /show del 24 de octubre/);
  assert.match(requests[4].input, /Resultado del paso 1/);
  assert.match(requests[4].input, /Resultado del paso 4/);
  assert.equal(requests[0].store, false);
  assert.equal(workspace.snapshot().runs[0].id, run.id);
  assert.deepEqual(
    [...workspace.snapshot().runs[0].taskIds].map(
      (id) => workspace.snapshot().tasks.find((t) => t.id === id).agentId,
    ),
    ["dot", "atlas", "vera", "tempo", "nia"],
  );
});

test("una falla del proveedor detiene el flujo y explica el problema", async (t) => {
  const workspace = createWorkspace({
    apiKey: "test-only",
    fetchImpl: async () => new Response("", { status: 401 }),
  });
  t.after(() => workspace.close());
  workspace.createRun({ workflowId: "review", brief: "Revisar itinerario" });
  await waitFor(() => workspace.snapshot().runs[0].status === "failed");
  assert.equal(workspace.snapshot().tasks.length, 1);
  assert.match(workspace.snapshot().tasks[0].error, /credencial/);
  assert.equal(workspace.snapshot().tasks[0].result, null);
});

test("la cancelación de un flujo no inicia pasos posteriores", async (t) => {
  const workspace = createWorkspace({ demoDelay: 40 });
  t.after(() => workspace.close());
  const run = workspace.createRun({
    workflowId: "itinerary",
    brief: "Revisar itinerario",
  });
  await waitFor(() => workspace.snapshot().tasks[0].status === "running");
  workspace.cancelTask(run.taskIds[0]);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(workspace.snapshot().runs[0].status, "cancelled");
  assert.equal(workspace.snapshot().tasks.length, 1);
  assert.equal(workspace.snapshot().tasks[0].status, "cancelled");
  assert.throws(() => workspace.cancelTask(run.taskIds[0]), /ya terminó/);
});

test("el reinicio marca las tareas interrumpidas sin repetir solicitudes", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "jac-restart-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const workspace = createWorkspace({ dataDir: dir, demoDelay: 10000 });
  workspace.createTask(taskInput());
  await waitFor(() => workspace.snapshot().tasks[0].status === "running");
  workspace.close();
  const restored = createWorkspace({ dataDir: dir });
  assert.equal(restored.snapshot().tasks[0].status, "failed");
  assert.match(restored.snapshot().tasks[0].error, /reinició/);
  restored.close();
});

test("Slack importa mensajes cronológicamente, sin publicar ni ejecutar tareas", async (t) => {
  let requested;
  const workspace = createWorkspace({
    slackToken: "test-only",
    fetchImpl: async (url) => {
      requested = String(url);
      return Response.json({
        ok: true,
        messages: [
          { text: "Traslado pendiente", ts: "1761325200.000100", user: "U2" },
          { text: "Prueba a las 16:00", ts: "1761318000.000100", user: "U1" },
        ],
        has_more: true,
      });
    },
  });
  t.after(() => workspace.close());
  workspace.updateSettings({ slackChannelId: "C0123456789" });
  const result = await workspace.importSlack();
  assert.match(requested, /conversations.history/);
  assert.match(requested, /channel=C0123456789/);
  assert.equal(result.count, 2);
  assert.ok(
    result.brief.indexOf("Prueba a las 16:00") <
      result.brief.indexOf("Traslado pendiente"),
  );
  assert.equal(result.hasMore, true);
  assert.match(result.scope, /no incluye respuestas/);
  assert.equal(workspace.snapshot().tasks.length, 0);
});

test("Slack informa credenciales, canal y permisos faltantes", async (t) => {
  const unconfigured = createWorkspace();
  await assert.rejects(unconfigured.importSlack(), /JAC_SLACK_BOT_TOKEN/);
  unconfigured.close();
  const workspace = createWorkspace({
    slackToken: "test-only",
    fetchImpl: async () => Response.json({ ok: false, error: "missing_scope" }),
  });
  t.after(() => workspace.close());
  await assert.rejects(workspace.importSlack(), /ID del canal/);
  workspace.updateSettings({ slackChannelId: "C0123456789" });
  await assert.rejects(workspace.importSlack(), /channels:history/);
});

test("la API rechaza solicitudes inválidas y crea una tarea funcional", async (t) => {
  const { server } = createApp({ demoDelay: 2 });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await request("/api/tasks", {
        agentId: "unknown",
        title: "Test",
        prompt: "Test",
      })
    ).status,
    400,
  );
  assert.equal(
    (await request("/api/tasks", { ...taskInput(), title: "" })).status,
    400,
  );
  assert.equal(
    (await request("/api/runs", { workflowId: "missing", brief: "Test" }))
      .status,
    400,
  );
  assert.equal(
    (await fetch(base + "/api/tasks", { method: "POST", body: "{}" })).status,
    415,
  );
  const created = await request("/api/tasks", taskInput("atlas"));
  assert.equal(created.status, 201);
  const task = await created.json();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const data = await (await fetch(base + "/api/workspace")).json();
  assert.equal(data.tasks.find((t) => t.id === task.id).status, "completed");
  assert.equal((await fetch(base + "/api/health")).status, 200);
});
