import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

export const config = {
  apiBaseUrl: process.env.OPENF1_BASE_URL || "https://api.openf1.org/v1",
  cacheDir: path.resolve(backendRoot, process.env.CACHE_DIR || "cache"),
  port: Number(process.env.PORT || 3001),
  requestDelayMs: Number(process.env.OPENF1_REQUEST_DELAY_MS || 450),
} as const;
