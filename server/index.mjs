import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { ApiError, createWorkspace } from "./workspace.mjs";
import { createAuth } from "./auth.mjs";
import {
  createGPTAuth,
  createGPTSchema,
  dotActionInstructions,
} from "./gpt-actions.mjs";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
export function createApp(options = {}) {
  const auth = createAuth({
    password: options.accessPassword,
    required: options.requireAuth,
    secure: options.secureCookies,
  });
  const gptAuth = createGPTAuth(options.gptActionsKey, options.accessPassword);
  const workspace = createWorkspace({
    ...options,
    actionsConfigured: Boolean(options.gptActionsKey),
  });
  const dist = resolve(options.distDir ?? "dist");
  const json = (res, status, body) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
  };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "same-origin");
      if (req.method === "GET" && url.pathname === "/api/health")
        return json(res, 200, {
          ok: true,
          mode: workspace.snapshot().provider.mode,
        });
      if (req.method === "GET" && url.pathname === "/api/auth/status")
        return json(res, 200, {
          required: auth.enabled,
          authenticated: auth.authenticated(req),
        });
      if (req.method === "GET" && url.pathname === "/api/gpt/schema")
        return json(res, 200, createGPTSchema(options.publicOrigin));
      if (url.pathname.startsWith("/api/")) {
        const gptRoute =
          url.pathname.startsWith("/api/gpt/") &&
          url.pathname !== "/api/gpt/setup";
        const mutation = !["GET", "HEAD"].includes(req.method);
        if (mutation && req.headers["sec-fetch-site"] === "cross-site")
          throw new ApiError(403, "La solicitud debe venir de la aplicación.");
        const login =
          req.method === "POST" && url.pathname === "/api/auth/login";
        const logout =
          req.method === "POST" && url.pathname === "/api/auth/logout";
        if (gptRoute) gptAuth(req);
        if (!gptRoute && !login && !logout && !auth.authenticated(req))
          throw new ApiError(401, "Inicia sesión para entrar a tu oficina.");
        let body = {};
        if (mutation) {
          if (!req.headers["content-type"]?.startsWith("application/json"))
            throw new ApiError(415, "Usa el formato JSON.");
          let text = "";
          for await (const chunk of req) {
            text += chunk;
            if (Buffer.byteLength(text) > 40000)
              throw new ApiError(413, "La solicitud es demasiado grande.");
          }
          try {
            body = JSON.parse(text || "{}");
          } catch {
            throw new ApiError(400, "El JSON no es válido.");
          }
          if (!body || Array.isArray(body) || typeof body !== "object")
            throw new ApiError(400, "La solicitud debe ser un objeto JSON.");
        }
        if (login) {
          auth.login(req, body, res);
          return json(res, 200, { ok: true });
        }
        if (logout) {
          auth.logout(req, res);
          return json(res, 200, { ok: true });
        }
        if (req.method === "GET" && url.pathname === "/api/gpt/setup")
          return json(res, 200, {
            configured: Boolean(options.gptActionsKey),
            instructions: dotActionInstructions,
            schemaUrl: options.publicOrigin
              ? new URL("/api/gpt/schema", options.publicOrigin).href
              : null,
          });
        if (gptRoute) {
          if (req.method === "GET" && url.pathname === "/api/gpt/context")
            return json(res, 200, workspace.chatGPTContext());
          if (req.method === "GET" && url.pathname === "/api/gpt/tasks")
            return json(
              res,
              200,
              workspace.listChatGPTTasks({
                taskId: url.searchParams.get("taskId"),
                workflowRunId: url.searchParams.get("workflowRunId"),
              }),
            );
          if (req.method === "POST" && url.pathname === "/api/gpt/tasks")
            return json(
              res,
              201,
              workspace.createTask({ ...body, execution: "chatgpt" }),
            );
          const gptTask = url.pathname.match(/^\/api\/gpt\/tasks\/([^/]+)$/);
          if (req.method === "GET" && gptTask)
            return json(res, 200, workspace.getChatGPTTask(gptTask[1]));
          const gptResult = url.pathname.match(
            /^\/api\/gpt\/tasks\/([^/]+)\/result$/,
          );
          if (req.method === "POST" && gptResult)
            return json(
              res,
              200,
              workspace.saveChatGPTResult(gptResult[1], body, "action"),
            );
          throw new ApiError(
            404,
            "Esta operación no está disponible para DOT.",
          );
        }
        if (req.method === "GET" && url.pathname === "/api/workspace")
          return json(res, 200, {
            ...workspace.snapshot(),
            accessProtected: auth.enabled,
          });
        if (req.method === "POST" && url.pathname === "/api/tasks")
          return json(res, 201, workspace.createTask(body));
        const cancel = url.pathname.match(/^\/api\/tasks\/([^/]+)\/cancel$/);
        if (req.method === "POST" && cancel)
          return json(res, 200, workspace.cancelTask(cancel[1]));
        const handoff = url.pathname.match(/^\/api\/tasks\/([^/]+)\/handoff$/);
        if (req.method === "GET" && handoff) {
          const data = workspace.getChatGPTTask(handoff[1]);
          const text = `DOT, trabaja esta tarea de JAC Music con el rol de ${data.agent.name} (${data.agent.role}).\nID de la tarea: ${data.task.id}\n\nINSTRUCCIONES DEL AGENTE:\n${data.agent.instructions}\n\nREGLAS DE DOT EN LA OFICINA:\n${data.dotInstructions || "Usa tus instrucciones personales y las indicaciones del usuario."}\n\nPEDIDO:\n${data.task.prompt}\n\nCONTEXTO DEL FLUJO:\n${data.context || "Tarea individual."}\n\nEntrega un borrador para revisión humana. No inventes datos ni confirmaciones. Si tienes las acciones de la oficina, consulta esta tarea y guarda el resultado con guardarResultadoJAC. Si no tienes acciones, dame la respuesta para pegarla en la oficina.`;
          return json(res, 200, { text });
        }
        const manualResult = url.pathname.match(
          /^\/api\/tasks\/([^/]+)\/result$/,
        );
        if (req.method === "POST" && manualResult)
          return json(
            res,
            200,
            workspace.saveChatGPTResult(manualResult[1], body, "manual"),
          );
        if (req.method === "POST" && url.pathname === "/api/runs")
          return json(res, 201, workspace.createRun(body));
        if (req.method === "PATCH" && url.pathname === "/api/settings")
          return json(res, 200, workspace.updateSettings(body));
        const agent = url.pathname.match(/^\/api\/agents\/([^/]+)$/);
        if (req.method === "PATCH" && agent)
          return json(res, 200, workspace.updateAgent(agent[1], body));
        if (req.method === "POST" && url.pathname === "/api/slack/import")
          return json(res, 200, await workspace.importSlack());
        throw new ApiError(404, "No se encontró esta operación.");
      }
      if (req.method !== "GET" && req.method !== "HEAD")
        throw new ApiError(405, "Método no permitido.");
      let file = resolve(dist, "." + decodeURIComponent(url.pathname));
      if (!file.startsWith(dist + sep) && file !== dist)
        throw new ApiError(403, "Ruta no permitida.");
      try {
        if (!(await stat(file)).isFile()) file = resolve(dist, "index.html");
      } catch {
        file = resolve(dist, "index.html");
      }
      const content = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      json(res, status, {
        error:
          status === 500
            ? "No se pudo completar la operación. Revisa el servidor."
            : error.message,
      });
    }
  });
  server.on("close", () => workspace.close());
  return { server, workspace };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { server } = createApp({
    accessPassword: process.env.JAC_ACCESS_PASSWORD,
    requireAuth: process.env.NODE_ENV === "production",
    secureCookies: process.env.NODE_ENV === "production",
    dataDir: process.env.JAC_DATA_DIR || ".data",
    apiKey: process.env.JAC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    slackToken: process.env.JAC_SLACK_BOT_TOKEN,
    model: process.env.JAC_MODEL || "gpt-4.1-mini",
    gptActionsKey: process.env.JAC_GPT_ACTIONS_KEY,
    publicOrigin: process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL,
  });
  server.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
    console.log(
      `JAC Music: servidor disponible en el puerto ${process.env.PORT || 3001}. Modo ${process.env.JAC_OPENAI_API_KEY || process.env.OPENAI_API_KEY ? "OpenAI" : "demostración"}.`,
    ),
  );
  const close = () => {
    server.close();
    server.closeAllConnections();
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}
