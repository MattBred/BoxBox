import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchRaceInputs } from "../src/openf1Client.js";
import { normalizeSessionOption, transformStrategy } from "../src/strategyTransform.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dataRoot = path.join(repoRoot, "frontend/public/data");
const defaultSessionKey = "11315";

async function main() {
  const sessionKey = process.argv[2] || defaultSessionKey;
  const inputs = await fetchRaceInputs(sessionKey);
  const strategy = transformStrategy(inputs);
  const sessionOption = normalizeSessionOption(inputs.session);

  await fs.mkdir(path.join(dataRoot, "strategy"), { recursive: true });
  await fs.writeFile(path.join(dataRoot, "sessions.json"), JSON.stringify({ sessions: [sessionOption] }, null, 2));
  await fs.writeFile(path.join(dataRoot, "strategy", `${sessionKey}.json`), JSON.stringify(strategy, null, 2));

  console.log(`Exported static demo data for ${sessionOption.label} (${sessionKey})`);
  console.log(`Drivers: ${strategy.drivers.length}`);
  console.log(`Race laps: ${strategy.totalLaps}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unexpected export error.");
  process.exitCode = 1;
});
