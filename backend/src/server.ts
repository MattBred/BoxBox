import express from "express";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { config } from "./config.js";
import { readCachedStrategy, writeCachedStrategy } from "./cache.js";
import { fetchOpenF1, fetchRaceInputs } from "./openf1Client.js";
import { normalizeSessionOption, transformStrategy } from "./strategyTransform.js";
import type { OpenF1Session } from "./types.js";

const app = express();

app.use(express.json());

const healthHandler: RequestHandler = (_request, response) => {
  response.json({ ok: true });
};

const sessionsHandler: RequestHandler = async (request, response, next) => {
  try {
    const year = String(request.query.year || "2024");
    const sessionName = String(request.query.session_name || "Race");
    const countryName = typeof request.query.country_name === "string" ? request.query.country_name : undefined;

    const sessions = await fetchOpenF1<OpenF1Session[]>("/sessions", {
      year,
      session_name: sessionName,
      country_name: countryName,
    });

    response.json({
      sessions: sessions
        .map(normalizeSessionOption)
        .toSorted((a, b) => String(a.dateStart).localeCompare(String(b.dateStart))),
    });
  } catch (error) {
    next(error);
  }
};

const strategyHandler: RequestHandler = async (request, response, next) => {
  try {
    const sessionKey = request.params.sessionKey;

    if (typeof sessionKey !== "string" || !/^\d+$/.test(sessionKey)) {
      response.status(400).json({ error: "sessionKey must be numeric." });
      return;
    }

    const cached = await readCachedStrategy(sessionKey);

    if (cached) {
      response.json({ ...cached, cache: { hit: true } });
      return;
    }

    const raceInputs = await fetchRaceInputs(sessionKey);
    const payload = transformStrategy(raceInputs);

    await writeCachedStrategy(sessionKey, payload);
    response.json({ ...payload, cache: { hit: false } });
  } catch (error) {
    next(error);
  }
};

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  const status = message.includes("No stint data") ? 404 : 500;

  response.status(status).json({
    error: message,
  });
};

app.get("/health", healthHandler);
app.get("/api/sessions", sessionsHandler);
app.get("/api/strategy/:sessionKey", strategyHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Box, Box backend listening on http://localhost:${config.port}`);
});
