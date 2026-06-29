import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import type { StrategyPayload } from "./types.js";

function cachePath(sessionKey: string | number) {
  return path.join(config.cacheDir, `${sessionKey}.json`);
}

export async function readCachedStrategy(sessionKey: string | number): Promise<StrategyPayload | null> {
  try {
    const raw = await fs.readFile(cachePath(sessionKey), "utf8");
    return JSON.parse(raw) as StrategyPayload;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    const message = error instanceof Error ? error.message : "Unknown cache error";
    throw new Error(`Could not read cache for session ${sessionKey}: ${message}`);
  }
}

export async function writeCachedStrategy(sessionKey: string | number, payload: StrategyPayload) {
  await fs.mkdir(config.cacheDir, { recursive: true });
  await fs.writeFile(cachePath(sessionKey), JSON.stringify(payload, null, 2));
}
