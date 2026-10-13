import { createApp } from "../server/index.mjs";
// A test fixture only; never used by the deployment entry point.
const { server } = createApp({
  accessPassword: "test-only-jac-access-password",
  requireAuth: true,
  secureCookies: false,
  demoDelay: 50,
});
server.listen(3062, "127.0.0.1");
const close = () => {
  server.close();
  server.closeAllConnections();
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
