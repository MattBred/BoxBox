import { config } from "./config.js";
import type { OpenF1Driver, OpenF1Lap, OpenF1Pit, OpenF1Session, OpenF1Stint, RaceInputs } from "./types.js";

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type QueryParams = Record<string, string | number | undefined | null>;

export async function fetchOpenF1<T>(path: string, params: QueryParams = {}, attempt = 1): Promise<T> {
  const url = new URL(`${config.apiBaseUrl}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);

  if (response.status === 429 && attempt < 3) {
    await sleep(1000 * attempt);
    return fetchOpenF1(path, params, attempt + 1);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenF1 ${response.status} ${response.statusText}: ${url}\n${body}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchRaceInputs(sessionKey: string | number): Promise<RaceInputs> {
  const params = { session_key: sessionKey };
  const sessionRows = await fetchOpenF1<OpenF1Session[]>("/sessions", params);
  await sleep(config.requestDelayMs);
  const drivers = await fetchOpenF1<OpenF1Driver[]>("/drivers", params);
  await sleep(config.requestDelayMs);
  const stints = await fetchOpenF1<OpenF1Stint[]>("/stints", params);
  await sleep(config.requestDelayMs);
  const pits = await fetchOpenF1<OpenF1Pit[]>("/pit", params);
  await sleep(config.requestDelayMs);
  const laps = await fetchOpenF1<OpenF1Lap[]>("/laps", params);

  return {
    session: sessionRows[0] || { session_key: Number(sessionKey) },
    drivers,
    stints,
    pits,
    laps,
  };
}
