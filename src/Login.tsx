import { useState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole, Music2 } from "lucide-react";

export default function Login({
  onLogin,
}: {
  onLogin: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-symbol">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <strong>
            JAC<span>music</span>
          </strong>
        </div>
        <span className="eyebrow">TU ESTUDIO TE ESPERA</span>
        <h1>
          Volvamos a estar
          <br />
          en sintonía<span>.</span>
        </h1>
        <p>
          Entra a tu espacio para coordinar el equipo y preparar tus próximos
          itinerarios.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            try {
              await onLogin(password);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="access-password">Contraseña de acceso</label>
          <div className="login-password">
            <LockKeyhole size={16} />
            <input
              id="access-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña del estudio"
              autoFocus
            />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <ArrowRight size={16} />
            )}
            Entrar a la oficina
          </button>
        </form>
        <div className="login-footer">
          <Music2 size={14} />
          Un equipo conectado. Un espacio privado.
        </div>
      </section>
    </main>
  );
}
