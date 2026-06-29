import type {
  OpenF1Driver,
  OpenF1Lap,
  OpenF1Session,
  RaceInputs,
  SessionOption,
  StrategyPayload,
} from "./types.js";

function average(values: Array<number | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  if (numeric.length === 0) {
    return null;
  }

  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)?.push(item);
  }

  return grouped;
}

function driverCode(driver: OpenF1Driver) {
  return driver.name_acronym || driver.broadcast_name || String(driver.driver_number);
}

function normalizeSession(session: OpenF1Session): StrategyPayload["session"] {
  return {
    sessionKey: session.session_key,
    meetingKey: session.meeting_key,
    year: session.year,
    countryName: session.country_name,
    location: session.location,
    sessionName: session.session_name,
    dateStart: session.date_start,
    dateEnd: session.date_end,
  };
}

export function normalizeSessionOption(session: OpenF1Session): SessionOption {
  const country = session.country_name || session.location || "Unknown";
  const name = session.session_name || "Session";

  return {
    sessionKey: session.session_key,
    meetingKey: session.meeting_key,
    year: session.year,
    countryName: session.country_name,
    location: session.location,
    sessionName: session.session_name,
    dateStart: session.date_start,
    label: `${session.year || ""} ${country} - ${name}`.trim(),
  };
}

export function transformStrategy({ session, drivers, stints, pits, laps }: RaceInputs): StrategyPayload {
  if (!Array.isArray(stints) || stints.length === 0) {
    throw new Error("No stint data found for this session.");
  }

  const driverMap = new Map<number, OpenF1Driver>(drivers.map((driver) => [driver.driver_number, driver]));
  const lapsByDriver = groupBy<OpenF1Lap, number>(laps, (lap) => lap.driver_number);
  const pitsByDriver = groupBy(pits, (pit) => pit.driver_number);
  const stintsByDriver = groupBy(stints, (stint) => stint.driver_number);
  const totalLaps = Math.max(...laps.map((lap) => lap.lap_number).filter(Number.isFinite), 0);

  const strategies = [...stintsByDriver.entries()]
    .map(([driverNumber, driverStints]) => {
      const driver = driverMap.get(driverNumber) || { driver_number: driverNumber };
      const driverLaps = lapsByDriver.get(driverNumber) || [];
      const driverPits = (pitsByDriver.get(driverNumber) || []).toSorted(
        (a, b) => (a.lap_number || 0) - (b.lap_number || 0),
      );

      const normalizedStints = driverStints
        .filter((stint) => Number.isFinite(stint.lap_start) && Number.isFinite(stint.lap_end))
        .toSorted((a, b) => (a.stint_number || 0) - (b.stint_number || 0))
        .map((stint) => {
          const lapTimes = driverLaps
            .filter((lap) => lap.lap_number >= stint.lap_start && lap.lap_number <= stint.lap_end)
            .map((lap) => lap.lap_duration);

          return {
            stintNumber: stint.stint_number,
            compound: stint.compound || "UNKNOWN",
            lapStart: stint.lap_start,
            lapEnd: stint.lap_end,
            lapCount: stint.lap_end - stint.lap_start + 1,
            averageLapTime: average(lapTimes),
          };
        });

      return {
        driverNumber,
        code: driverCode(driver),
        fullName: driver.full_name || driver.broadcast_name || driverCode(driver),
        teamName: driver.team_name || null,
        teamColor: driver.team_colour || null,
        stints: normalizedStints,
        pits: driverPits.map((pit) => ({
          lap: pit.lap_number,
          duration: pit.pit_duration,
          date: pit.date,
        })),
      };
    })
    .filter((strategy) => strategy.stints.length > 0)
    .toSorted((a, b) => a.driverNumber - b.driverNumber);

  return {
    session: normalizeSession(session),
    totalLaps,
    drivers: strategies,
    source: {
      fetchedAt: new Date().toISOString(),
      counts: {
        drivers: drivers.length,
        stints: stints.length,
        pits: pits.length,
        laps: laps.length,
      },
    },
  };
}
