import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, LoaderCircle, MessageSquare } from "lucide-react";

export default function ChatGPTTask({
  taskId,
  onSaved,
  notify,
}: {
  taskId: string;
  onSaved: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [pedido, setPedido] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/tasks/${taskId}/handoff`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (active) setPedido(data.text);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [taskId]);
  return (
    <div className="chatgpt-task">
      <div className="chatgpt-task-intro">
        <MessageSquare size={24} />
        <div>
          <h3>Esta tarea espera a tu DOT</h3>
          <p>
            Copia el pedido y resuélvelo dentro de ChatGPT. Luego pega su
            respuesta o deja que las acciones de DOT la guarden.
          </p>
        </div>
      </div>
      <label>
        Pedido para llevar a DOT
        <textarea
          readOnly
          rows={5}
          value={pedido}
          placeholder="Preparando el pedido…"
        />
      </label>
      <div className="gpt-setup-buttons">
        <button
          className="button secondary"
          disabled={!pedido}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(pedido);
              notify("Pedido copiado. Pégalo en tu conversación con DOT.");
            } catch {
              setError("Selecciona el pedido y cópialo manualmente.");
            }
          }}
        >
          <Copy size={15} />
          Copiar pedido para DOT
        </button>
        <a
          className="button secondary"
          href="https://chatgpt.com/"
          target="_blank"
          rel="noreferrer"
        >
          Abrir ChatGPT
          <ArrowUpRight size={15} />
        </a>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setSaving(true);
          try {
            const res = await fetch(`/api/tasks/${taskId}/result`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ result: response }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            await onSaved();
            notify("Respuesta guardada en la oficina.");
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <label>
          Respuesta de DOT
          <textarea
            required
            rows={6}
            maxLength={16000}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Pega aquí el borrador que DOT te entregue en ChatGPT…"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="gpt-save-row">
          <span>Se guardará como una respuesta pegada por ti.</span>
          <button
            className="button primary"
            disabled={saving || !response.trim()}
          >
            {saving && <LoaderCircle size={15} className="spin" />}Guardar
            respuesta
          </button>
        </div>
      </form>
    </div>
  );
}
