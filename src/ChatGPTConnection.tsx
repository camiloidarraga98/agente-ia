import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Copy,
  LoaderCircle,
  MessageSquare,
  Zap,
} from "lucide-react";
import type { Workspace } from "./types";

type Setup = {
  configured: boolean;
  instructions: string;
  schemaUrl: string | null;
};
export default function ChatGPTConnection({
  workspace,
  refresh,
  notify,
}: {
  workspace: Workspace;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/gpt/setup")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) setSetup(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function useChatGPT() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionMode: "chatgpt" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refresh();
      notify("Las nuevas tareas se resolverán con tu DOT en ChatGPT.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify("Copiado");
    } catch {
      setError("Selecciona el texto y cópialo manualmente.");
    }
  }
  async function downloadSchema() {
    setError("");
    try {
      const response = await fetch("/api/gpt/schema");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "jac-dot-actions.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <section className="panel chatgpt-connection">
      <div className="chatgpt-connection-head">
        <div className="service-logo dot-logo">
          <MessageSquare size={24} />
        </div>
        <div>
          <span className="eyebrow">TU CHATGPT, TU FORMA DE TRABAJAR</span>
          <h2>DOT hace el trabajo. La oficina lo organiza.</h2>
        </div>
        <span className="pill green">
          {workspace.settings.executionMode === "chatgpt"
            ? "Modo ChatGPT"
            : "Prueba con tu suscripción"}
        </span>
      </div>
      <p>
        Resuelve los pedidos con tu DOT dentro de ChatGPT y guarda sus
        respuestas aquí. La oficina no llama a la API de OpenAI para estas
        tareas. Se aplican los límites de tu plan de ChatGPT.
      </p>
      <div className="chatgpt-ways">
        <div>
          <h3>
            <span>01</span>La primera prueba: copiar y pegar
          </h3>
          <p>
            Crea una tarea para ChatGPT, copia el pedido, llévalo a DOT y pega
            su respuesta en la tarea. No necesitas configurar acciones para
            probarlo.
          </p>
          <button
            className="button primary"
            disabled={busy || workspace.settings.executionMode === "chatgpt"}
            onClick={() => void useChatGPT()}
          >
            {busy ? (
              <LoaderCircle size={15} className="spin" />
            ) : workspace.settings.executionMode === "chatgpt" ? (
              <Check size={15} />
            ) : (
              <Zap size={15} />
            )}{" "}
            {workspace.settings.executionMode === "chatgpt"
              ? "ChatGPT seleccionado"
              : "Usar mi ChatGPT"}
          </button>
        </div>
        <div>
          <h3>
            <span>02</span>Después: acciones de DOT
          </h3>
          <p>
            Si DOT es un GPT que puedes editar, puede consultar los pedidos y
            guardar sus respuestas mediante acciones. Tú inicias el trabajo
            desde ChatGPT.
          </p>
          <span className={`pill ${setup?.configured ? "green" : ""}`}>
            {setup?.configured
              ? "Clave de acciones configurada"
              : "Acciones pendientes de configurar"}
          </span>
        </div>
      </div>
      <details className="gpt-setup-details">
        <summary>
          Conectar las acciones de DOT
          <ArrowUpRight size={14} />
        </summary>
        <ol>
          <li>
            En ChatGPT, entra en{" "}
            <a
              href="https://chatgpt.com/gpts/mine"
              target="_blank"
              rel="noreferrer"
            >
              Mis GPTs
            </a>
            , busca DOT y pulsa{" "}
            <strong>Editar → Configurar → Crear nueva acción</strong>. Si DOT es
            una conversación, puedes seguir con la prueba de copiar y pegar.
          </li>
          <li>
            Descarga el esquema y copia su contenido en <strong>Esquema</strong>
            , o importa la URL mostrada abajo. Configura la autenticación como{" "}
            <strong>API Key → Bearer</strong>.
          </li>
          <li>
            En Render, abre el servicio y copia de forma privada{" "}
            <strong>JAC_GPT_ACTIONS_KEY</strong> desde Environment. Ese valor va
            en la autenticación de la acción; es distinto de tu contraseña de la
            oficina. Si no aparece, sincroniza el blueprint actualizado.
          </li>
          <li>
            Añade estas instrucciones al final de las instrucciones actuales de
            DOT, sin borrar las que ya utiliza, y guarda el GPT.
          </li>
          <li>
            Pide a DOT que consulte una tarea de prueba y guarde el resultado.
            ChatGPT puede pedirte confirmar el acceso o el guardado.
          </li>
        </ol>
        {setup?.schemaUrl && (
          <label>
            URL del esquema
            <input readOnly value={setup.schemaUrl} />
          </label>
        )}
        <div className="gpt-setup-buttons">
          <button
            className="button secondary"
            onClick={() => void downloadSchema()}
          >
            <ArrowDownToLine size={14} />
            Descargar esquema
          </button>
          {setup?.schemaUrl && (
            <button
              className="button secondary"
              onClick={() => void copy(setup.schemaUrl!)}
            >
              <Copy size={14} />
              Copiar URL
            </button>
          )}
        </div>
        {setup && (
          <>
            <label>
              Instrucciones para las acciones
              <textarea readOnly rows={6} value={setup.instructions} />
            </label>
            <button
              className="text-button"
              onClick={() => void copy(setup.instructions)}
            >
              <Copy size={14} />
              Copiar instrucciones
            </button>
          </>
        )}
      </details>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
