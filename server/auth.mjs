import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ApiError } from "./workspace.mjs";

const hash = (value) => createHash("sha256").update(value).digest();
const lifetime = 8 * 60 * 60 * 1000;
export function createAuth({
  password = "",
  required = false,
  secure = false,
} = {}) {
  if (required && password.length < 16)
    throw new Error(
      "Configura JAC_ACCESS_PASSWORD con al menos 16 caracteres antes de iniciar en producción.",
    );
  if (password && password.length < 16)
    throw new Error("JAC_ACCESS_PASSWORD debe tener al menos 16 caracteres.");
  const enabled = Boolean(password);
  const passwordHash = hash(password);
  const sessions = new Map();
  const attempts = new Map();
  const sessionId = (req) => {
    const cookie = req.headers.cookie || "";
    const value = cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("jac_session="))
      ?.slice(12);
    return value && /^[a-f0-9]{64}$/.test(value)
      ? hash(value).toString("hex")
      : null;
  };
  const cookie = (token, maxAge) =>
    `jac_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  return {
    enabled,
    authenticated(req) {
      if (!enabled) return true;
      const id = sessionId(req);
      if (!id) return false;
      const expires = sessions.get(id);
      if (!expires || expires < Date.now()) {
        sessions.delete(id);
        return false;
      }
      return true;
    },
    login(req, input, res) {
      if (!enabled) return;
      const now = Date.now();
      // Periodic cleanup bounds memory used by expired login attempts and sessions.
      for (const [key, value] of sessions)
        if (value < now) sessions.delete(key);
      for (const [key, value] of attempts)
        if (value.expires < now) attempts.delete(key);
      const ip = req.socket.remoteAddress || "unknown";
      const bucket = attempts.get(ip) || {
        count: 0,
        expires: now + 5 * 60 * 1000,
      };
      if (bucket.count >= 10)
        throw new ApiError(
          429,
          "Demasiados intentos. Espera cinco minutos antes de volver a entrar.",
        );
      if (
        typeof input.password !== "string" ||
        !timingSafeEqual(hash(input.password), passwordHash)
      ) {
        bucket.count += 1;
        attempts.set(ip, bucket);
        throw new ApiError(401, "La contraseña no es correcta.");
      }
      attempts.delete(ip);
      const previous = sessionId(req);
      if (previous) sessions.delete(previous);
      const token = randomBytes(32).toString("hex");
      sessions.set(hash(token).toString("hex"), now + lifetime);
      res.setHeader("Set-Cookie", cookie(token, lifetime / 1000));
    },
    logout(req, res) {
      const id = sessionId(req);
      if (id) sessions.delete(id);
      res.setHeader("Set-Cookie", cookie("", 0));
    },
  };
}
