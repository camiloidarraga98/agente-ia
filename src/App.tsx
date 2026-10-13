import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  FileText,
  GitBranch,
  Headphones,
  LayoutGrid,
  List,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Music2,
  Plus,
  Radio,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Unplug,
  Users,
  Workflow as WorkflowIcon,
  X,
  Zap,
} from "lucide-react";
import OfficeMap from "./OfficeMap";
import Login from "./Login";
import type { Agent, Task, TaskStatus, Workflow, Workspace } from "./types";

type Page = "office" | "tasks" | "workflows" | "connections";
type ModalState =
  | { kind: "task"; agentId?: string }
  | { kind: "agent"; agentId: string }
  | { kind: "result"; taskId: string }
  | { kind: "workflow"; workflowId: string; brief?: string }
  | { kind: "connection"; service: "openai" | "slack" }
  | { kind: "help" };
const statusLabels: Record<TaskStatus, string> = {
  queued: "En cola",
  running: "Trabajando",
  completed: "Completada",
  failed: "Necesita atención",
  cancelled: "Cancelada",
};
const navItems = [
  { id: "office" as const, label: "La oficina", icon: LayoutGrid },
  { id: "tasks" as const, label: "Mis tareas", icon: CheckCheck },
  { id: "workflows" as const, label: "Flujos de trabajo", icon: GitBranch },
  { id: "connections" as const, label: "Conexiones", icon: Unplug },
];

class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response
    .json()
    .catch(() => ({ error: "El servidor devolvió una respuesta inesperada." }));
  if (!response.ok)
    throw new RequestError(
      data.error || "No se pudo completar la operación.",
      response.status,
    );
  return data;
}
function ago(date: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 60000),
  );
  if (!minutes) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)} h`;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota",
  }).format(new Date(date));
}
function Avatar({
  agent,
  size = "",
  human = false,
}: {
  agent?: Agent;
  size?: string;
  human?: boolean;
}) {
  if (human) return <span className={`avatar human ${size}`}>LU</span>;
  return (
    <span
      className={`avatar ${size}`}
      style={{
        background: agent?.color || "#e8eadf",
        color: agent?.hair || "#445142",
      }}
    >
      <span className="avatar-face">
        <span className="avatar-hair" />
        <span className="avatar-eyes" />
      </span>
    </span>
  );
}
function Status({ status }: { status: TaskStatus }) {
  return (
    <span className={`status ${status}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}
function Modal({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = "modal-heading";
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby={heading}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id={heading}>{title}</h2>
        </div>
        <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function FormError({ error }: { error: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}

function TaskForm({
  workspace,
  initialAgent,
  onSubmit,
  onClose,
}: {
  workspace: Workspace;
  initialAgent?: string;
  onSubmit: (body: {
    agentId: string;
    title: string;
    prompt: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [agentId, setAgentId] = useState(initialAgent || "dot");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title="¿Qué vamos a hacer?"
      eyebrow="UNA NUEVA TAREA"
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            await onSubmit({ agentId, title, prompt });
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <label>
          Asigna un agente
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            {workspace.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.role}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nombre de la tarea
          <input
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Revisar el itinerario del próximo show"
          />
        </label>
        <label>
          Cuéntale lo que necesitas
          <textarea
            required
            maxLength={12000}
            rows={6}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Añade fechas, actividades, lugares y los detalles que debe tener en cuenta…"
          />
        </label>
        <div className="form-note">
          <Sparkles size={15} />
          {workspace.provider.mode === "demo"
            ? "Modo demo: recibirás una plantilla local para probar el flujo."
            : "El agente usará las instrucciones de DOT y tu brief."}
        </div>
        <FormError error={error} />
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            {saving ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ArrowUpRight size={16} />
            )}
            Asignar tarea
          </button>
        </div>
      </form>
    </Modal>
  );
}
function WorkflowForm({
  workflow,
  brief: initialBrief,
  mode,
  onSubmit,
  onClose,
}: {
  workflow: Workflow;
  brief?: string;
  mode: string;
  onSubmit: (body: { workflowId: string; brief: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [brief, setBrief] = useState(initialBrief || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={workflow.name}
      eyebrow="PON EL FLUJO EN MARCHA"
      onClose={onClose}
    >
      <p className="muted">
        {workflow.description} Cada agente recibe el brief y los resultados
        anteriores.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            await onSubmit({ workflowId: workflow.id, brief });
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <label>
          Brief del itinerario
          <textarea
            required
            maxLength={12000}
            rows={7}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Pega aquí el itinerario o los mensajes de DOT y Luisa en #itinerarios. Incluye las fechas, los horarios y lo que ya está confirmado."
          />
        </label>
        <div className="flow-preview">
          {workflow.steps.map((s, i) => (
            <span key={i}>
              <b>{i + 1}</b>
              {s.title}
              {i < workflow.steps.length - 1 && <ChevronRight size={12} />}
            </span>
          ))}
        </div>
        <div className="form-note">
          <Users size={15} />
          {mode === "demo"
            ? "Demo con plantillas. El borrador requiere revisión humana."
            : "El resultado final quedará pendiente de la revisión de Luisa."}
        </div>
        <FormError error={error} />
        <div className="modal-footer">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            {saving ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Zap size={16} />
            )}
            Iniciar flujo
          </button>
        </div>
      </form>
    </Modal>
  );
}
function AgentDetail({
  agent,
  tasks,
  onSave,
  onTask,
  onResult,
  onClose,
}: {
  agent: Agent;
  tasks: Task[];
  onSave: (instructions: string) => Promise<void>;
  onTask: () => void;
  onResult: (id: string) => void;
  onClose: () => void;
}) {
  const [instructions, setInstructions] = useState(agent.instructions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const recent = tasks.filter((t) => t.agentId === agent.id).slice(0, 3);
  return (
    <Modal
      title={`Conoce a ${agent.name}`}
      eyebrow={agent.department.toUpperCase()}
      onClose={onClose}
    >
      <div className="agent-intro">
        <Avatar agent={agent} size="large" />
        <div>
          <h3>{agent.role}</h3>
          <p>{agent.description}</p>
        </div>
      </div>
      <label>
        Instrucciones del agente
        <textarea
          rows={5}
          maxLength={8000}
          value={instructions}
          onChange={(e) => {
            setInstructions(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <FormError error={error} />
      <button
        className="button secondary compact"
        disabled={saving || !instructions.trim()}
        onClick={async () => {
          setSaving(true);
          setError("");
          try {
            await onSave(instructions);
            setSaved(true);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saved ? <Check size={15} /> : <SlidersHorizontal size={15} />}
        {saved ? "Instrucciones guardadas" : "Guardar instrucciones"}
      </button>
      {recent.length > 0 && (
        <div className="agent-recent">
          <h4>Sus últimas tareas</h4>
          {recent.map((t) => (
            <button
              className="recent-task"
              key={t.id}
              onClick={() => onResult(t.id)}
            >
              <span>{t.title}</span>
              <Status status={t.status} />
            </button>
          ))}
        </div>
      )}
      <div className="modal-footer">
        <button className="button primary" onClick={onTask}>
          <MessageSquare size={16} />
          Pedirle una tarea
        </button>
      </div>
    </Modal>
  );
}
function TaskResult({
  task,
  agent,
  onCancel,
  onClose,
  notify,
}: {
  task: Task;
  agent: Agent;
  onCancel: () => Promise<void>;
  onClose: () => void;
  notify: (text: string) => void;
}) {
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const exportTask = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          `${task.title}\n${agent.name} · ${statusLabels[task.status]}\n\nBRIEF\n${task.prompt}\n\nRESULTADO\n${task.result || task.error || "Pendiente"}`,
        ],
        { type: "text/plain;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `jac-itinerario-${task.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Modal
      title={task.title}
      eyebrow="ESPACIO DE TRABAJO"
      wide
      onClose={onClose}
    >
      <div className="result-meta">
        <span>
          <Avatar agent={agent} size="tiny" />
          {agent.name}
        </span>
        <Status status={task.status} />
        <span className="pill">
          {task.mode === "demo" ? "Demostración" : "OpenAI"}
        </span>
      </div>
      <div className="brief-block">
        <span className="eyebrow">TU SOLICITUD</span>
        <p>{task.prompt}</p>
      </div>
      {task.result ? (
        <div className="result-text">{task.result}</div>
      ) : task.error ? (
        <div className="form-error">{task.error}</div>
      ) : task.status === "cancelled" ? (
        <div className="empty-result">
          <X size={28} />
          <p>La tarea fue cancelada.</p>
        </div>
      ) : (
        <div className="empty-result">
          <LoaderCircle size={30} className="spin" />
          <h3>
            {task.status === "queued"
              ? "Tu tarea está en cola"
              : `${agent.name} está trabajando`}
          </h3>
          <p>
            {task.status === "queued"
              ? "Comenzará cuando el agente quede disponible."
              : "El resultado aparecerá aquí cuando termine."}
          </p>
        </div>
      )}
      <FormError error={error} />
      <div className="modal-footer">
        {["queued", "running"].includes(task.status) ? (
          <button
            className="button secondary"
            disabled={cancelling}
            onClick={async () => {
              setCancelling(true);
              try {
                await onCancel();
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setCancelling(false);
              }
            }}
          >
            Cancelar tarea
          </button>
        ) : (
          task.result && (
            <>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(task.result!);
                    notify("Resultado copiado");
                  } catch {
                    setError(
                      "No se pudo copiar. Puedes seleccionar el texto o descargarlo.",
                    );
                  }
                }}
              >
                <Copy size={15} />
                Copiar
              </button>
              <button className="button primary" onClick={exportTask}>
                <ArrowDownToLine size={15} />
                Descargar borrador
              </button>
            </>
          )
        )}
      </div>
    </Modal>
  );
}

function Connections({
  workspace,
  refresh,
  open,
  notify,
}: {
  workspace: Workspace;
  refresh: () => Promise<void>;
  open: (modal: ModalState) => void;
  notify: (text: string) => void;
}) {
  const [instructions, setInstructions] = useState(
    workspace.settings.dotInstructions,
  );
  const [channel, setChannel] = useState(workspace.settings.slackChannelId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await api("/settings", "PATCH", {
        dotInstructions: instructions,
        slackChannelId: channel,
      });
      await refresh();
      notify("Configuración guardada");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">UN EQUIPO CONECTADO</span>
          <h1>
            Todo en el mismo lugar<span>.</span>
          </h1>
          <p>Tu asistente, tus conversaciones y tu forma de trabajar.</p>
        </div>
      </div>
      <div className="connection-grid">
        <section className="panel connection-card">
          <div className="connection-head">
            <div className="service-logo dot-logo">
              <Radio size={25} />
            </div>
            <span
              className={`pill ${workspace.provider.configured ? "green" : ""}`}
            >
              {workspace.provider.configured
                ? "Clave configurada"
                : "Modo demo"}
            </span>
          </div>
          <h2>DOT, tu asistente</h2>
          <p>
            Personaliza la dirección del equipo con las instrucciones de tu
            asistente personal.
          </p>
          <label>
            Instrucciones de DOT
            <textarea
              rows={9}
              maxLength={8000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Pega las instrucciones y preferencias de tu DOT: cómo organiza los itinerarios, qué información necesita y qué debe revisar Luisa…"
            />
          </label>
          <p className="field-hint">
            Esta app no importa automáticamente el historial ni la memoria de tu
            ChatGPT. Las instrucciones se usan en los agentes de este espacio.
          </p>
          <button
            className="text-button"
            onClick={() => open({ kind: "connection", service: "openai" })}
          >
            Configurar OpenAI
            <ArrowUpRight size={15} />
          </button>
        </section>
        <section className="panel connection-card">
          <div className="connection-head">
            <SlackLogo />
            <span
              className={`pill ${workspace.slack.configured && workspace.slack.channelConfigured ? "green" : ""}`}
            >
              {workspace.slack.configured && workspace.slack.channelConfigured
                ? "Configurado"
                : "Pendiente de conexión"}
            </span>
          </div>
          <h2>Slack · #itinerarios</h2>
          <p>
            Importa los mensajes de DOT y Luisa, revisa el brief y pásalo al
            equipo.
          </p>
          <div className="slack-source">
            <span className="channel-hash">#</span>
            <div>
              <strong>itinerarios</strong>
              <span>Fuente de tus briefs y novedades</span>
            </div>
            <MessageSquare size={19} />
          </div>
          <label>
            ID del canal
            <input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="Ej. C0123456789"
              maxLength={32}
            />
          </label>
          <p className="field-hint">
            Encuéntralo en Slack: abre el canal, pulsa su nombre y copia el ID
            al final de los detalles.
          </p>
          <div className="info-note">
            <Users size={18} />
            <p>
              <strong>Luisa mantiene la última palabra.</strong> Los resultados
              son borradores para revisión. La importación no publica mensajes
              en Slack.
            </p>
          </div>
          <button
            className="text-button"
            onClick={() => open({ kind: "connection", service: "slack" })}
          >
            Cómo conectar el canal
            <ArrowUpRight size={15} />
          </button>
        </section>
      </div>
      <FormError error={error} />
      <div className="settings-footer">
        <span>
          <CheckCheck size={16} />
          Las instrucciones se guardan en este espacio.
        </span>
        <button className="button primary" disabled={saving} onClick={save}>
          {saving ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Check size={16} />
          )}
          Guardar configuración
        </button>
      </div>
    </>
  );
}
function SlackLogo() {
  return (
    <div className="service-logo slack-logo" aria-label="Slack">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState<Page>("office");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"map" | "list">("map");
  const [zoom, setZoom] = useState(1);
  const [mobileNav, setMobileNav] = useState(false);
  const [slackBusy, setSlackBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const data = await api<Workspace>("/workspace");
      setWorkspace(data);
      setNeedsLogin(false);
      setLoadError("");
    } catch (err) {
      if (err instanceof RequestError && err.status === 401) {
        setWorkspace(null);
        setModal(null);
        setNeedsLogin(true);
        setLoadError("");
        return;
      }
      setLoadError((err as Error).message);
    }
  }, []);
  useEffect(() => {
    if (needsLogin) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 1500);
    return () => clearInterval(timer);
  }, [refresh, needsLogin]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (next: Page) => {
    setPage(next);
    setMobileNav(false);
  };
  if (needsLogin)
    return (
      <Login
        onLogin={async (password) => {
          await api("/auth/login", "POST", { password });
          await refresh();
        }}
      />
    );
  if (!workspace)
    return (
      <div className="loading-screen">
        <div className="brand-symbol">
          <Radio size={29} />
        </div>
        <h2>Preparando tu oficina</h2>
        {loadError ? (
          <>
            <p role="alert">No se pudo conectar con el servidor.</p>
            <button className="button primary" onClick={() => void refresh()}>
              Reintentar
            </button>
          </>
        ) : (
          <LoaderCircle className="spin" size={20} />
        )}
      </div>
    );
  const { agents, tasks, workflows, runs } = workspace;
  const active = tasks.filter((t) => t.status === "running");
  const queued = tasks.filter((t) => t.status === "queued");
  const completed = tasks.filter((t) => t.status === "completed");
  const filtered = tasks.filter(
    (t) =>
      (filter === "all" ||
        (filter === "active"
          ? ["running", "queued"].includes(t.status)
          : t.status === filter)) &&
      `${t.title} ${t.prompt} ${agents.find((a) => a.id === t.agentId)?.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const openAgent = (agent: Agent) =>
    setModal({ kind: "agent", agentId: agent.id });
  const assign = (agentId?: string) => setModal({ kind: "task", agentId });
  const syncSlack = async () => {
    if (!workspace.slack.configured || !workspace.slack.channelConfigured) {
      navigate("connections");
      setToast("Completa la conexión de #itinerarios para importar mensajes.");
      return;
    }
    setSlackBusy(true);
    try {
      const result = await api<{
        brief: string;
        count: number;
        hasMore: boolean;
        scope: string;
      }>("/slack/import", "POST", {});
      if (!result.count) setToast("El canal no tiene mensajes para importar.");
      else {
        setModal({
          kind: "workflow",
          workflowId: "update",
          brief: result.brief,
        });
        setToast(`${result.count} mensajes importados. ${result.scope}`);
      }
      await refresh();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setSlackBusy(false);
    }
  };
  const agentCards = (list = false) => (
    <div className={`agents-grid ${list ? "list-view" : ""}`}>
      {agents.map((agent) => {
        const busy = active.some((t) => t.agentId === agent.id);
        const count = completed.filter((t) => t.agentId === agent.id).length;
        return (
          <button
            key={agent.id}
            className="agent-card"
            onClick={() => openAgent(agent)}
          >
            <div className="agent-card-top">
              <Avatar agent={agent} />
              <span className={`availability ${busy ? "busy" : ""}`}>
                <span />
                {busy ? "Trabajando" : "Disponible"}
              </span>
              <MoreHorizontal className="agent-more" size={16} />
            </div>
            <h3>
              {agent.name}
              <ArrowUpRight size={15} />
            </h3>
            <p>{agent.role}</p>
            {list && <p className="agent-description">{agent.description}</p>}
            <div className="agent-card-bottom">
              <span>{agent.department}</span>
              <span>
                {count}
                <CheckCheck size={13} />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("office")}
          aria-label="JAC Music, inicio"
        >
          <div className="brand-symbol">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>
              JAC<span>music</span>
            </strong>
            <small>AGENT WORKSPACE</small>
          </div>
        </button>
        <button
          className="workspace-switch"
          onClick={() => {
            navigate("connections");
            setToast("Este espacio está dedicado a JAC Music.");
          }}
        >
          <span className="workspace-icon">
            <Music2 size={16} />
          </span>
          <span>
            JAC Music<small>Tu espacio de trabajo</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Navegación principal">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
              {id === "tasks" && tasks.length > 0 && (
                <span className="nav-count">
                  {active.length + queued.length}
                </span>
              )}
              {id === "office" && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-line" />
        <div className="nav-label team-label">
          TU EQUIPO<span>{agents.length}</span>
        </div>
        <div className="sidebar-agents">
          {agents.map((agent) => (
            <button key={agent.id} onClick={() => openAgent(agent)}>
              <Avatar agent={agent} size="tiny" />
              <span>
                {agent.name}
                <small>{agent.department}</small>
              </span>
              <span
                className={`member-dot ${active.some((t) => t.agentId === agent.id) ? "busy" : ""}`}
              />
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          {workspace.accessProtected && (
            <button
              className="sidebar-help"
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST", {});
                  setWorkspace(null);
                  setModal(null);
                  setNeedsLogin(true);
                  setToast("");
                } catch (err) {
                  setToast((err as Error).message);
                }
              }}
            >
              <LogOut size={17} />
              Cerrar sesión
            </button>
          )}
          <div className="human-member">
            <Avatar human size="tiny" />
            <span>
              Luisa<small>Colaboradora · revisión</small>
            </span>
            <Users size={15} />
          </div>
          <button
            className="sidebar-help"
            onClick={() => setModal({ kind: "help" })}
          >
            <CircleHelp size={17} />
            Cómo funciona
            <ArrowUpRight size={13} />
          </button>
          <button className="profile" onClick={() => navigate("connections")}>
            <span className="user-avatar">CI</span>
            <span>
              Mi espacio<small>JAC Music</small>
            </span>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Cerrar menú"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{navItems.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span
              className={`mode-badge ${workspace.provider.mode === "openai" ? "connected" : ""}`}
            >
              <span />
              {workspace.provider.mode === "demo"
                ? "Modo demostración"
                : "OpenAI configurado"}
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button notification-button"
              aria-label="Ver actividad del equipo"
              onClick={() => {
                navigate("tasks");
                setFilter("all");
              }}
            >
              <Bell size={18} />
              {completed.length > 0 && <i />}
            </button>
            <span className="user-avatar small">CI</span>
          </div>
        </header>
        <main>
          {loadError && (
            <div className="connection-error" role="alert">
              La conexión con el servidor se perdió. Reintentando…
            </div>
          )}
          {page === "office" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow greeting">
                    <span />
                    TU ESTUDIO, EN MOVIMIENTO
                  </span>
                  <h1>
                    Tu equipo, en sintonía<span>.</span>
                  </h1>
                  <p>
                    Menos pendientes. Más tiempo para lo que mueve tu música.
                  </p>
                </div>
                <button className="button primary" onClick={() => assign()}>
                  <Plus size={17} />
                  Nueva tarea
                </button>
              </div>
              <div className="office-layout">
                <section className="panel office-panel">
                  <div className="panel-heading">
                    <div className="panel-title">
                      <span className="little-icon">
                        <LayoutGrid size={16} />
                      </span>
                      <h2>La oficina</h2>
                      <span className="pill">JAC Music HQ</span>
                    </div>
                    <div
                      className="view-switch"
                      aria-label="Vista de la oficina"
                    >
                      <button
                        className={view === "map" ? "active" : ""}
                        aria-label="Vista de oficina"
                        aria-pressed={view === "map"}
                        onClick={() => setView("map")}
                      >
                        <LayoutGrid size={14} />
                      </button>
                      <button
                        className={view === "list" ? "active" : ""}
                        aria-label="Vista de agentes"
                        aria-pressed={view === "list"}
                        onClick={() => setView("list")}
                      >
                        <List size={15} />
                      </button>
                    </div>
                  </div>
                  {view === "map" ? (
                    <OfficeMap
                      agents={agents}
                      tasks={tasks}
                      onSelect={openAgent}
                      zoom={zoom}
                    />
                  ) : (
                    <div className="office-list">{agentCards(true)}</div>
                  )}
                  <div className="office-footer">
                    <span>
                      <span className="status-dot" />
                      {agents.length -
                        new Set(active.map((t) => t.agentId)).size}{" "}
                      agentes disponibles
                      <span className="footer-separator">·</span>
                      <span className="office-footer-tip">
                        Haz clic en un agente para comenzar
                      </span>
                    </span>
                    {view === "map" && (
                      <div className="zoom-controls">
                        <button
                          aria-label="Alejar oficina"
                          disabled={zoom <= 0.8}
                          onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          aria-label="Restablecer zoom"
                          onClick={() => setZoom(1)}
                        >
                          {Math.round(zoom * 100)}%
                        </button>
                        <button
                          aria-label="Acercar oficina"
                          disabled={zoom >= 1.3}
                          onClick={() => setZoom((z) => Math.min(1.3, z + 0.1))}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </section>
                <aside className="radar-column">
                  <section className="panel radar-panel">
                    <div className="panel-heading">
                      <div className="panel-title">
                        <Radio size={17} />
                        <h2>En tu radar</h2>
                      </div>
                      <span className="live-dot" />
                    </div>
                    <div className="radar-stats">
                      <div>
                        <strong>
                          {active.length + queued.length}
                          <span className="stat-icon">
                            <Clock3 size={16} />
                          </span>
                        </strong>
                        <span>En marcha</span>
                      </div>
                      <div>
                        <strong>
                          {completed.length}
                          <span className="stat-icon">
                            <CheckCheck size={17} />
                          </span>
                        </strong>
                        <span>Completadas</span>
                      </div>
                    </div>
                    <div className="activity-heading">
                      <h3>Últimos movimientos</h3>
                      <span>HOY</span>
                    </div>
                    <div className="activity-list">
                      {workspace.activity.slice(0, 4).map((item) => {
                        const agent = agents.find((a) => a.id === item.agentId);
                        return (
                          <div className="activity-item" key={item.id}>
                            <span className="activity-avatar">
                              {agent ? (
                                <Avatar agent={agent} size="tiny" />
                              ) : (
                                <MessageSquare size={15} />
                              )}
                            </span>
                            <div>
                              <p>{item.text}</p>
                              <span>{ago(item.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className="all-activity"
                      onClick={() => navigate("tasks")}
                    >
                      Ver todas las tareas
                      <ArrowRight size={14} />
                    </button>
                  </section>
                  <section className="slack-widget">
                    <div className="slack-widget-top">
                      <SlackLogo />
                      <span className="pill">TU CANAL</span>
                    </div>
                    <h3>De Slack a tu equipo.</h3>
                    <p>
                      Los itinerarios de DOT y Luisa, en un solo flujo de
                      trabajo.
                    </p>
                    <div className="slack-widget-channel">
                      <span># itinerarios</span>
                      <span className="channel-indicator" />
                    </div>
                    <button
                      className="slack-sync"
                      onClick={() => void syncSlack()}
                      disabled={slackBusy}
                    >
                      {slackBusy ? (
                        <LoaderCircle className="spin" size={15} />
                      ) : (
                        <>
                          <span>
                            {workspace.slack.configured &&
                            workspace.slack.channelConfigured
                              ? "Importar mensajes"
                              : "Conectar Slack"}
                          </span>
                          <ArrowUpRight size={15} />
                        </>
                      )}
                    </button>
                  </section>
                </aside>
              </div>
              <section className="team-section">
                <div className="section-heading">
                  <div>
                    <h2>Un equipo. Muchas posibilidades.</h2>
                    <p>
                      Cada agente tiene su especialidad. Tú marcas el rumbo.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      setView("list");
                      document.querySelector(".office-panel")?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }}
                  >
                    Conoce al equipo
                    <ArrowUpRight size={15} />
                  </button>
                </div>
                {agentCards()}
              </section>
              <section className="workflow-banner">
                <div className="workflow-banner-icon">
                  <GitBranch size={25} />
                </div>
                <div>
                  <span className="eyebrow">DEL BRIEF AL BORRADOR</span>
                  <h3>Tu próximo itinerario empieza aquí.</h3>
                  <p>DOT organiza. El equipo prepara. Luisa revisa.</p>
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    setModal({ kind: "workflow", workflowId: "itinerary" })
                  }
                >
                  Crear un itinerario
                  <ArrowRight size={15} />
                </button>
                <div className="banner-decor">
                  <Music2 size={67} />
                </div>
              </section>
            </>
          )}
          {page === "tasks" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">CADA PENDIENTE, EN SU LUGAR</span>
                  <h1>
                    El trabajo avanza<span>.</span>
                  </h1>
                  <p>Asigna, acompaña y revisa lo que prepara tu equipo.</p>
                </div>
                <button className="button primary" onClick={() => assign()}>
                  <Plus size={17} />
                  Nueva tarea
                </button>
              </div>
              <section className="panel tasks-panel">
                <div className="tasks-toolbar">
                  <div className="task-tabs">
                    {[
                      { value: "all", label: "Todas" },
                      { value: "active", label: "En marcha" },
                      { value: "completed", label: "Completadas" },
                      { value: "failed", label: "Por revisar" },
                    ].map((f) => (
                      <button
                        key={f.value}
                        className={filter === f.value ? "active" : ""}
                        onClick={() => setFilter(f.value)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <label className="search-field">
                    <Search size={15} />
                    <input
                      aria-label="Buscar tareas"
                      placeholder="Buscar una tarea…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                {filtered.length ? (
                  <div className="task-table">
                    <div className="task-table-head">
                      <span>TAREA</span>
                      <span>AGENTE</span>
                      <span>ESTADO</span>
                      <span>CREADA</span>
                      <span />
                    </div>
                    {filtered.map((task) => {
                      const agent = agents.find((a) => a.id === task.agentId)!;
                      return (
                        <button
                          className="task-row"
                          key={task.id}
                          onClick={() =>
                            setModal({ kind: "result", taskId: task.id })
                          }
                        >
                          <span className="task-title">
                            <span className="task-file-icon">
                              <FileText size={18} />
                            </span>
                            <span>
                              <strong>{task.title}</strong>
                              <small>
                                {task.workflowRunId
                                  ? "Parte de un flujo de trabajo"
                                  : "Tarea individual"}{" "}
                                · {task.mode === "demo" ? "Demo" : "OpenAI"}
                              </small>
                            </span>
                          </span>
                          <span className="task-agent">
                            <Avatar agent={agent} size="tiny" />
                            {agent.name}
                          </span>
                          <Status status={task.status} />
                          <span className="task-created">
                            {ago(task.createdAt)}
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <CheckCheck size={30} />
                    </div>
                    <h2>
                      {tasks.length
                        ? "No hay tareas con este filtro"
                        : "El próximo paso lo das tú."}
                    </h2>
                    <p>
                      {tasks.length
                        ? "Prueba otra búsqueda o revisa todas tus tareas."
                        : "Cuéntale a DOT qué necesitas o asigna una tarea a un especialista."}
                    </p>
                    {!tasks.length && (
                      <button
                        className="button primary"
                        onClick={() => assign()}
                      >
                        <Plus size={16} />
                        Crear mi primera tarea
                      </button>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
          {page === "workflows" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">LA BUENA COORDINACIÓN SE NOTA</span>
                  <h1>
                    De idea a itinerario<span>.</span>
                  </h1>
                  <p>
                    Una secuencia de agentes que comparten contexto y hacen
                    avanzar el trabajo.
                  </p>
                </div>
                <button
                  className="button secondary"
                  disabled={slackBusy}
                  onClick={() => void syncSlack()}
                >
                  <MessageSquare size={16} />
                  Importar de Slack
                </button>
              </div>
              <div className="flow-callout">
                <span className="flow-callout-icon">
                  <Users size={22} />
                </span>
                <div>
                  <h3>Hecho para la forma en que trabajan DOT y Luisa.</h3>
                  <p>
                    Los mensajes se convierten en un brief. El equipo prepara el
                    borrador. La revisión final sigue en tus manos.
                  </p>
                </div>
              </div>
              <div className="workflows-grid">
                {workflows.map((workflow, index) => (
                  <section className="panel workflow-card" key={workflow.id}>
                    <div className="workflow-card-top">
                      <span
                        className="workflow-card-icon"
                        style={{ background: workflow.color }}
                      >
                        {index === 0 ? (
                          <FileText size={23} />
                        ) : index === 1 ? (
                          <MessageSquare size={23} />
                        ) : (
                          <CheckCheck size={23} />
                        )}
                      </span>
                      <span className="workflow-number">0{index + 1}</span>
                    </div>
                    <span className="eyebrow">{workflow.category}</span>
                    <h2>{workflow.name}</h2>
                    <p>{workflow.description}</p>
                    <div className="workflow-steps">
                      {workflow.steps.map((step, i) => {
                        const a = agents.find(
                          (agent) => agent.id === step.agentId,
                        )!;
                        return (
                          <div key={i}>
                            <Avatar agent={a} size="tiny" />
                            <span>
                              {step.title}
                              <small>{a.name}</small>
                            </span>
                            {i === workflow.steps.length - 1 ? (
                              <Check size={14} />
                            ) : (
                              <ChevronDown size={13} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className="button secondary"
                      onClick={() =>
                        setModal({ kind: "workflow", workflowId: workflow.id })
                      }
                    >
                      Iniciar flujo
                      <ArrowRight size={15} />
                    </button>
                  </section>
                ))}
              </div>
              <section className="flow-runs">
                <div className="section-heading">
                  <div>
                    <h2>Tus flujos recientes</h2>
                    <p>Revisa cada paso y sus resultados.</p>
                  </div>
                </div>
                {!runs.length ? (
                  <div className="panel empty-runs">
                    <WorkflowIcon size={21} />
                    <span>Aquí aparecerá tu primer flujo de trabajo.</span>
                  </div>
                ) : (
                  runs.map((run) => (
                    <div className="panel run-card" key={run.id}>
                      <div className="run-heading">
                        <div>
                          <h3>{run.name}</h3>
                          <span>
                            {ago(run.createdAt)} · {run.taskIds.length} pasos
                            creados
                          </span>
                        </div>
                        <Status
                          status={
                            run.status === "running" ? "running" : run.status
                          }
                        />
                      </div>
                      <div className="run-steps">
                        {run.taskIds.map((id) => {
                          const t = tasks.find((task) => task.id === id);
                          if (!t) return null;
                          return (
                            <button
                              key={id}
                              onClick={() =>
                                setModal({ kind: "result", taskId: id })
                              }
                            >
                              <span>{t.title}</span>
                              <Status status={t.status} />
                              <ArrowUpRight size={14} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </>
          )}
          {page === "connections" && (
            <Connections
              workspace={workspace}
              refresh={refresh}
              open={setModal}
              notify={setToast}
            />
          )}
          <footer className="page-footer">
            <span>
              <Music2 size={13} />
              Hecho para que la música siga.
            </span>
            <span>JAC Music · Agent Workspace</span>
          </footer>
        </main>
      </div>
      {modal?.kind === "task" && (
        <TaskForm
          workspace={workspace}
          initialAgent={modal.agentId}
          onClose={() => setModal(null)}
          onSubmit={async (body) => {
            const task = await api<Task>("/tasks", "POST", body);
            await refresh();
            setModal({ kind: "result", taskId: task.id });
            setToast("Tarea asignada. Tu agente ya la recibió.");
          }}
        />
      )}
      {modal?.kind === "workflow" && (
        <WorkflowForm
          workflow={workflows.find((w) => w.id === modal.workflowId)!}
          brief={modal.brief}
          mode={workspace.provider.mode}
          onClose={() => setModal(null)}
          onSubmit={async (body) => {
            await api("/runs", "POST", body);
            await refresh();
            setModal(null);
            navigate("workflows");
            setToast("Flujo iniciado. Los agentes trabajarán en orden.");
          }}
        />
      )}
      {modal?.kind === "agent" && (
        <AgentDetail
          key={modal.agentId}
          agent={agents.find((a) => a.id === modal.agentId)!}
          tasks={tasks}
          onClose={() => setModal(null)}
          onTask={() => assign(modal.agentId)}
          onResult={(taskId) => setModal({ kind: "result", taskId })}
          onSave={async (instructions) => {
            await api(`/agents/${modal.agentId}`, "PATCH", { instructions });
            await refresh();
          }}
        />
      )}
      {modal?.kind === "result" &&
        (() => {
          const task = tasks.find((t) => t.id === modal.taskId);
          return task ? (
            <TaskResult
              task={task}
              agent={agents.find((a) => a.id === task.agentId)!}
              onClose={() => setModal(null)}
              onCancel={async () => {
                await api(`/tasks/${task.id}/cancel`, "POST", {});
                await refresh();
                setToast("Tarea cancelada");
              }}
              notify={setToast}
            />
          ) : null;
        })()}
      {modal?.kind === "connection" && (
        <Modal
          title={
            modal.service === "openai"
              ? "Conecta la inteligencia del equipo"
              : "Conecta #itinerarios"
          }
          eyebrow="CONFIGURA TU CONEXIÓN"
          onClose={() => setModal(null)}
        >
          {modal.service === "openai" ? (
            <>
              <p className="muted">
                Usa una clave de la API de OpenAI para que los agentes analicen
                los briefs y preparen resultados con IA.
              </p>
              <ol className="connection-instructions">
                <li>
                  En la configuración segura del entorno, añade{" "}
                  <code>JAC_OPENAI_API_KEY</code>. No compartas su valor en el
                  chat.
                </li>
                <li>Reinicia el servidor para activar la conexión.</li>
                <li>
                  Pega las instrucciones de tu DOT en esta página y guárdalas.
                </li>
              </ol>
              <div className="info-note">
                <Sparkles size={19} />
                <p>
                  Tu suscripción de ChatGPT y el uso de la API se gestionan por
                  separado. Se reutilizan las instrucciones que aportes; no se
                  conecta la memoria de tu cuenta.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="muted">
                La conexión lee mensajes para preparar un brief que puedes
                revisar antes de iniciar un flujo.
              </p>
              <ol className="connection-instructions">
                <li>
                  Crea o usa una aplicación de Slack con{" "}
                  <code>channels:history</code>; usa <code>groups:history</code>{" "}
                  para un canal privado.
                </li>
                <li>
                  Instálala en tu workspace e invítala a{" "}
                  <strong>#itinerarios</strong>.
                </li>
                <li>
                  Guarda su credencial como <code>JAC_SLACK_BOT_TOKEN</code> en
                  la configuración segura del entorno y reinicia el servidor.
                </li>
                <li>
                  Guarda el ID del canal en esta página. Después pulsa «Importar
                  mensajes».
                </li>
              </ol>
              <div className="info-note">
                <MessageSquare size={19} />
                <p>
                  Se importan hasta 50 mensajes recientes del canal. Las
                  respuestas dentro de hilos no se incluyen en esta primera
                  versión.
                </p>
              </div>
            </>
          )}
          <div className="modal-footer">
            <button
              className="button primary"
              onClick={() => {
                setModal(null);
                navigate("connections");
              }}
            >
              Ir a conexiones
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {modal?.kind === "help" && (
        <Modal
          title="Tu equipo, a tu ritmo."
          eyebrow="ASÍ FUNCIONA TU OFICINA"
          onClose={() => setModal(null)}
        >
          <div className="help-steps">
            <div>
              <span>01</span>
              <h3>Elige a tu agente</h3>
              <p>
                Selecciona a DOT o a un especialista y cuéntale lo que
                necesitas. Puedes dar tareas a varios agentes a la vez.
              </p>
            </div>
            <div>
              <span>02</span>
              <h3>O pon en marcha un flujo</h3>
              <p>
                Comparte el brief de #itinerarios. Cada agente hará su parte y
                pasará los resultados al siguiente.
              </p>
            </div>
            <div>
              <span>03</span>
              <h3>Revisa el resultado</h3>
              <p>
                Consulta las tareas, copia o descarga los borradores. Luisa y tú
                revisan las decisiones y las confirmaciones.
              </p>
            </div>
          </div>
          <div className="info-note">
            <Headphones size={19} />
            <p>
              Ahora estás en{" "}
              {workspace.provider.mode === "demo"
                ? "modo demostración: las tareas generan plantillas locales. Conecta OpenAI para trabajar con IA."
                : "modo OpenAI. Las tareas utilizan la API y las instrucciones configuradas."}
            </p>
          </div>
          <div className="modal-footer">
            <button
              className="button primary"
              onClick={() => {
                setModal(null);
                assign();
              }}
            >
              Vamos a empezar
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
