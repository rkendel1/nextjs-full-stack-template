import { appport, type AppPortApplication } from "@appport/services";
import type { ApplicationContract } from "@/lib/flow-contract";
import { loadApplicationContract } from "@/lib/flow-contract";
import { appPortConfigPath, durableStatePath, flowPath } from "@/lib/paths";
import { APPLICATION_NAME } from "@/lib/constants";

declare global {
  // eslint-disable-next-line no-var
  var __feltStarterRuntimePromise: Promise<ApplicationRuntime> | undefined;
}

export interface ApplicationRuntime {
  application: AppPortApplication;
  contract: ApplicationContract;
  dataPath: string;
}

export async function createApplicationRuntime(options?: { dataPath?: string }) {
  const dataPath = options?.dataPath ?? durableStatePath();
  const contract = loadApplicationContract();
  const application = await appport({
    config: appPortConfigPath(),
    flow: flowPath(),
    mode: "local",
    namespace: APPLICATION_NAME,
    path: dataPath,
    jobs: {
      "orders.fulfill": async () => {
        // The starter demonstrates durable enqueue semantics; a worker can be added later.
      },
    },
  });

  return { application, contract, dataPath } satisfies ApplicationRuntime;
}

export async function getApplicationRuntime() {
  globalThis.__feltStarterRuntimePromise ??= createApplicationRuntime().catch((error) => {
    globalThis.__feltStarterRuntimePromise = undefined;
    throw error;
  });
  return globalThis.__feltStarterRuntimePromise;
}

export async function closeApplicationRuntime() {
  if (!globalThis.__feltStarterRuntimePromise) {
    return;
  }

  const runtime = await globalThis.__feltStarterRuntimePromise;
  await runtime.application.close();
  globalThis.__feltStarterRuntimePromise = undefined;
}
