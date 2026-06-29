import { fetchOpenF1, fetchRaceInputs } from "../src/openf1Client.js";
import { transformStrategy } from "../src/strategyTransform.js";
import type { OpenF1Session } from "../src/types.js";

const DEFAULT_YEAR = process.env.OPENF1_YEAR || "2024";
const DEFAULT_COUNTRY = process.env.OPENF1_COUNTRY || "Bahrain";
const DEFAULT_SESSION_NAME = process.env.OPENF1_SESSION_NAME || "Race";

function formatDuration(seconds: number | null | undefined) {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return "n/a";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;

  if (minutes === 0) {
    return `${remaining.toFixed(3)}s`;
  }

  return `${minutes}:${remaining.toFixed(3).padStart(6, "0")}`;
}

async function main() {
  const [year = DEFAULT_YEAR, country = DEFAULT_COUNTRY, sessionName = DEFAULT_SESSION_NAME] =
    process.argv.slice(2);

  const sessions = await fetchOpenF1<OpenF1Session[]>("/sessions", {
    year,
    country_name: country,
    session_name: sessionName,
  });

  if (sessions.length === 0) {
    throw new Error(`No session found for year=${year}, country_name=${country}, session_name=${sessionName}`);
  }

  const session = sessions[0];

  if (!session) {
    throw new Error(`No session found for year=${year}, country_name=${country}, session_name=${sessionName}`);
  }

  const inputs = await fetchRaceInputs(session.session_key);
  const payload = transformStrategy(inputs);

  console.log("OpenF1 proof of concept");
  console.log("======================");
  console.log(`Session: ${payload.session.year} ${payload.session.countryName} ${payload.session.sessionName}`);
  console.log(`Session key: ${payload.session.sessionKey}`);
  console.log("");
  console.log("Raw records fetched:");
  console.log(`- Drivers: ${payload.source.counts.drivers}`);
  console.log(`- Stints:  ${payload.source.counts.stints}`);
  console.log(`- Pits:    ${payload.source.counts.pits}`);
  console.log(`- Laps:    ${payload.source.counts.laps}`);
  console.log(`- Race laps detected: ${payload.totalLaps}`);
  console.log("");
  console.log("Sample transformed strategies:");

  for (const strategy of payload.drivers.slice(0, 8)) {
    const stintText = strategy.stints
      .map((stint) => {
        const avg = stint.averageLapTime ? ` avg ${formatDuration(stint.averageLapTime)}` : "";
        return `${stint.compound} L${stint.lapStart}-${stint.lapEnd}${avg}`;
      })
      .join(" | ");

    const pitText =
      strategy.pits.length > 0
        ? strategy.pits.map((pit) => `L${pit.lap} ${formatDuration(pit.duration)}`).join(", ")
        : "none";

    console.log(`- ${strategy.code}: ${stintText}`);
    console.log(`  pits: ${pitText}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unexpected POC error.");
  process.exitCode = 1;
});
