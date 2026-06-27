import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { handleDashboardApiRequest } from "./routes.ts";
import type { DashboardSessionTitleLookup } from "./sessions.ts";

export type DashboardApiServerOptions = {
  rootDir?: string | undefined;
  host?: string | undefined;
  port?: number | undefined;
  origin?: string | undefined;
  sessionTitleLookup?: DashboardSessionTitleLookup | undefined;
  log?: (message: string) => void;
};

export async function startDashboardApiServer(options: DashboardApiServerOptions = {}) {
  const rootDir = resolve(options.rootDir ?? join(homedir(), ".token-profiler"));
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8788;

  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const result = await handleDashboardApiRequest(request.method ?? "GET", request.url ?? "/", {
      rootDir,
      origin: options.origin,
      sessionTitleLookup: options.sessionTitleLookup
    });

    response.writeHead(result.status, result.headers);
    if (result.status === 204) {
      response.end();
      return;
    }
    response.end(JSON.stringify(result.body));
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });

  options.log?.(`Dashboard API listening at http://${host}:${port}`);
  options.log?.(`Dashboard API data root: ${rootDir}`);

  return { server, rootDir, host, port };
}
