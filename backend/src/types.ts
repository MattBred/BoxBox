export interface OpenF1Session {
  session_key: number;
  meeting_key?: number;
  year?: number;
  country_name?: string;
  location?: string;
  session_name?: string;
  date_start?: string;
  date_end?: string;
}

export interface OpenF1Driver {
  driver_number: number;
  name_acronym?: string;
  broadcast_name?: string;
  full_name?: string;
  team_name?: string;
  team_colour?: string;
}

export interface OpenF1Stint {
  driver_number: number;
  stint_number?: number;
  compound?: string;
  lap_start: number;
  lap_end: number;
}

export interface OpenF1Pit {
  driver_number: number;
  lap_number?: number;
  pit_duration?: number;
  date?: string;
}

export interface OpenF1Lap {
  driver_number: number;
  lap_number: number;
  lap_duration?: number;
}

export interface RaceInputs {
  session: OpenF1Session;
  drivers: OpenF1Driver[];
  stints: OpenF1Stint[];
  pits: OpenF1Pit[];
  laps: OpenF1Lap[];
}

export interface SessionOption {
  sessionKey: number;
  meetingKey?: number;
  year?: number;
  countryName?: string;
  location?: string;
  sessionName?: string;
  dateStart?: string;
  label: string;
}

export interface StrategyPayload {
  session: {
    sessionKey: number;
    meetingKey?: number;
    year?: number;
    countryName?: string;
    location?: string;
    sessionName?: string;
    dateStart?: string;
    dateEnd?: string;
  };
  totalLaps: number;
  drivers: Array<{
    driverNumber: number;
    code: string;
    fullName: string;
    teamName: string | null;
    teamColor: string | null;
    stints: Array<{
      stintNumber?: number;
      compound: string;
      lapStart: number;
      lapEnd: number;
      lapCount: number;
      averageLapTime: number | null;
    }>;
    pits: Array<{
      lap?: number;
      duration?: number;
      date?: string;
    }>;
  }>;
  source: {
    fetchedAt: string;
    counts: {
      drivers: number;
      stints: number;
      pits: number;
      laps: number;
    };
  };
}
