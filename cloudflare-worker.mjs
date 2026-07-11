import { Container, getContainer } from "@cloudflare/containers";

export class RustlingsWebContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "30m";
  envVars = {
    DATABASE_URL: "sqlite:/data/rustlings.db",
    API_BASE_URL: "http://localhost:3000",
    PORT: "8080",
    HOSTNAME: "0.0.0.0",
  };
}

export default {
  async fetch(request, env) {
    const container = getContainer(env.RUSTLINGS_WEB_CONTAINER, "app");
    return container.fetch(request);
  },
};
