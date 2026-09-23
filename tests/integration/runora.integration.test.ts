import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import net from "node:net";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aiPlaywright } from "runora";

type LaunchResult = { browser: Browser; context: BrowserContext; page: Page };

class SystemChromiumRuntime {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  constructor(
    private readonly baseUrl: string,
    private readonly cookie?: { name: string; value: string },
  ) {}

  async launch(): Promise<LaunchResult> {
    this.browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium-browser",
      headless: true,
    });
    this.context = await this.browser.newContext();

    if (this.cookie) {
      const url = new URL(this.baseUrl);
      await this.context.addCookies([
        {
          name: this.cookie.name,
          value: this.cookie.value,
          domain: url.hostname,
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }

    this.page = await this.context.newPage();
    return { browser: this.browser, context: this.context, page: this.page };
  }

  async close() {
    await this.page?.close().catch(() => undefined);
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
  }
}

let server: ChildProcessWithoutNullStreams;
let baseUrl = "";
let tempDataPath = "";

async function getFreePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to determine an open port."));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url: string) {
  const start = Date.now();
  while (Date.now() - start < 60_000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${url} did not start in time.`);
}

async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "pipe",
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(output || `${command} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function signInCookie() {
  const response = await fetch(`${baseUrl}/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ actorId: "demo.order_manager" }),
  });
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Expected sign-in route to return a session cookie.");
  }
  const [pair] = setCookie.split(";");
  const [name, value] = pair.split("=");
  return { name, value };
}

describe("Runora browser verification", () => {
  beforeAll(async () => {
    tempDataPath = await mkdtemp(path.join(os.tmpdir(), "felt-starter-runora-"));
    const port = await getFreePort();
    baseUrl = `http://127.0.0.1:${port}`;
    const env = {
      ...process.env,
      FELTDB_PATH: tempDataPath,
      NEXT_TELEMETRY_DISABLED: "1",
    };

    await runCommand("npm", ["run", "build"], env);

    server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: process.cwd(),
      env,
      stdio: "pipe",
    });

    let output = "";
    server.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    server.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    server.on("exit", (code) => {
      if (code && code !== 0) {
        console.error(output);
      }
    });

    await waitForServer(`${baseUrl}/orders`);
  });

  afterAll(async () => {
    server.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      server.once("exit", () => resolve());
    });
    await rm(tempDataPath, { recursive: true, force: true });
  });

  it("uses Runora against the live Next.js application", async () => {
    const cookie = await signInCookie();
    const browser = await aiPlaywright({
      planner: "mock",
      url: baseUrl,
      headless: true,
      runtime: new SystemChromiumRuntime(baseUrl, cookie),
      artifactsDir: path.resolve(".artifacts", "runora"),
      limits: { maxSteps: 12, maxTimeMs: 60_000 },
    });

    try {
      const result = await browser.task(`
        Open the orders page.
        Create a project named "Runora Order".
        Verify that "Runora Order" appears in the durable orders table.
      `);

      expect(result.status).toBe("passed");
      expect(result.evidence.some((entry) => entry.type === "assertion" && entry.result === "passed")).toBe(true);
    } finally {
      await browser.close();
    }
  });
});
