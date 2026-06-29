import { useEffect, useMemo, useState } from 'react'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface SessionOption {
  sessionKey: number
  label: string
}

interface Stint {
  stintNumber?: number
  compound: string
  lapStart: number
  lapEnd: number
  lapCount: number
  averageLapTime: number | null
}

interface PitStop {
  lap?: number
  duration?: number
}

interface DriverStrategy {
  driverNumber: number
  code: string
  fullName: string
  teamName: string | null
  teamColor: string | null
  stints: Stint[]
  pits: PitStop[]
}

interface StrategyPayload {
  totalLaps: number
  drivers: DriverStrategy[]
}

const compoundStyles: Record<string, string> = {
  SOFT: 'bg-red-600 text-white border-red-700',
  MEDIUM: 'bg-yellow-300 text-stone-950 border-yellow-400',
  HARD: 'bg-white text-stone-950 border-stone-300',
  INTERMEDIATE: 'bg-emerald-500 text-white border-emerald-600',
  WET: 'bg-sky-600 text-white border-sky-700',
  UNKNOWN: 'bg-zinc-400 text-white border-zinc-500',
}

function formatLapTime(seconds: number | null | undefined) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    return 'n/a'
  }

  const minutes = Math.floor(seconds / 60)
  const remaining = seconds - minutes * 60

  if (minutes === 0) {
    return `${remaining.toFixed(3)}s`
  }

  return `${minutes}:${remaining.toFixed(3).padStart(6, '0')}`
}

function formatPitDuration(seconds: number | null | undefined) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    return 'n/a'
  }

  return `${seconds.toFixed(1)}s`
}

function StintSegment({ stint, totalLaps }: { stint: Stint; totalLaps: number }) {
  const width = `${Math.max((stint.lapCount / totalLaps) * 100, 2)}%`
  const style = compoundStyles[stint.compound] || compoundStyles.UNKNOWN
  const title = `${stint.compound} laps ${stint.lapStart}-${stint.lapEnd}, avg lap ${formatLapTime(
    stint.averageLapTime,
  )}`

  return (
    <div
      className={`group relative flex h-10 min-w-8 items-center justify-center border-y border-r px-2 text-xs font-semibold ${style}`}
      style={{ width }}
      title={title}
    >
      <span className="truncate">{stint.compound}</span>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-56 -translate-x-1/2 rounded bg-stone-950 px-3 py-2 text-left text-xs font-medium text-white shadow-lg group-hover:block">
        <div>Laps {stint.lapStart}-{stint.lapEnd}</div>
        <div>{stint.compound}</div>
        <div>Avg {formatLapTime(stint.averageLapTime)}</div>
      </div>
    </div>
  )
}

function PitMarker({ pit, totalLaps }: { pit: PitStop; totalLaps: number }) {
  const lap = pit.lap ?? 0
  const left = `${Math.min(Math.max((lap / totalLaps) * 100, 0), 100)}%`

  return (
    <div
      className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left }}
      title={`Pit stop on lap ${lap}: ${formatPitDuration(pit.duration)}`}
    >
      <div className="flex h-9 min-w-12 items-center justify-center rounded border border-stone-950 bg-stone-950 px-2 text-xs font-bold text-white shadow">
        {formatPitDuration(pit.duration)}
      </div>
    </div>
  )
}

function StrategyRow({ driver, totalLaps }: { driver: DriverStrategy; totalLaps: number }) {
  return (
    <article className="grid gap-3 border-b border-stone-200 py-4 lg:grid-cols-[180px_1fr] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="h-10 w-1.5 rounded-full bg-stone-400"
          style={driver.teamColor ? { backgroundColor: `#${driver.teamColor}` } : undefined}
        />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-black text-stone-950">{driver.code}</h2>
            <span className="text-xs font-semibold text-stone-500">#{driver.driverNumber}</span>
          </div>
          <p className="truncate text-sm text-stone-600">{driver.teamName || driver.fullName}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-stone-300 bg-stone-100">
        <div className="relative min-h-14 min-w-[720px] p-2">
          <div className="flex overflow-hidden rounded border-l border-stone-300">
            {driver.stints.map((stint) => (
              <StintSegment
                key={`${driver.driverNumber}-${stint.stintNumber ?? stint.lapStart}`}
                stint={stint}
                totalLaps={totalLaps}
              />
            ))}
          </div>
          {driver.pits.map((pit) => (
            <PitMarker key={`${driver.driverNumber}-${pit.lap}-${pit.duration}`} pit={pit} totalLaps={totalLaps} />
          ))}
        </div>
      </div>
    </article>
  )
}

function App() {
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [selectedSessionKey, setSelectedSessionKey] = useState('')
  const [strategy, setStrategy] = useState<StrategyPayload | null>(null)
  const [sessionsStatus, setSessionsStatus] = useState<Status>('loading')
  const [strategyStatus, setStrategyStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSessions() {
      try {
        setSessionsStatus('loading')
        const response = await fetch('/api/sessions?year=2024&session_name=Race')

        if (!response.ok) {
          throw new Error('Could not load race sessions.')
        }

        const data = (await response.json()) as { sessions?: SessionOption[] }
        setSessions(data.sessions || [])
        setSelectedSessionKey(data.sessions?.[0]?.sessionKey ? String(data.sessions[0].sessionKey) : '')
        setSessionsStatus('ready')
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load race sessions.')
        setSessionsStatus('error')
      }
    }

    loadSessions()
  }, [])

  useEffect(() => {
    if (!selectedSessionKey) {
      return
    }

    async function loadStrategy() {
      try {
        setStrategyStatus('loading')
        setError('')
        const response = await fetch(`/api/strategy/${selectedSessionKey}`)

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error || 'Could not load strategy data.')
        }

        const data = (await response.json()) as StrategyPayload
        setStrategy(data)
        setStrategyStatus('ready')
      } catch (loadError) {
        setStrategy(null)
        setError(loadError instanceof Error ? loadError.message : 'Could not load strategy data.')
        setStrategyStatus('error')
      }
    }

    loadStrategy()
  }, [selectedSessionKey])

  const selectedSession = useMemo(
    () => sessions.find((session) => String(session.sessionKey) === selectedSessionKey),
    [sessions, selectedSessionKey],
  )

  const totalPitStops = useMemo(
    () => strategy?.drivers?.reduce((count, driver) => count + driver.pits.length, 0) || 0,
    [strategy],
  )
  const hasStrategyRows = strategyStatus === 'ready' && Boolean(strategy?.drivers.length)
  const hasEmptyStrategy = strategyStatus === 'ready' && strategy !== null && strategy.drivers.length === 0

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-5 border-b border-stone-300 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-red-700">Box, Box</p>
          <h1 className="text-3xl font-black text-stone-950 sm:text-4xl">F1 strategy visualizer</h1>
        </div>

        <label className="flex w-full flex-col gap-2 text-sm font-bold text-stone-700 lg:w-96">
          Race
          <select
            className="h-11 rounded border border-stone-400 bg-white px-3 text-base font-semibold text-stone-950 shadow-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-200"
            value={selectedSessionKey}
            disabled={sessionsStatus !== 'ready'}
            onChange={(event) => setSelectedSessionKey(event.target.value)}
          >
            {sessionsStatus === 'loading' && <option>Loading races...</option>}
            {sessions.map((session) => (
              <option key={session.sessionKey} value={session.sessionKey}>
                {session.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-stone-300 bg-white p-4">
          <p className="text-xs font-bold uppercase text-stone-500">Session</p>
          <p className="mt-1 text-lg font-black text-stone-950">{selectedSession?.label || 'No race selected'}</p>
        </div>
        <div className="rounded border border-stone-300 bg-white p-4">
          <p className="text-xs font-bold uppercase text-stone-500">Drivers</p>
          <p className="mt-1 text-lg font-black text-stone-950">{strategy?.drivers?.length || '-'}</p>
        </div>
        <div className="rounded border border-stone-300 bg-white p-4">
          <p className="text-xs font-bold uppercase text-stone-500">Race laps</p>
          <p className="mt-1 text-lg font-black text-stone-950">{strategy?.totalLaps || '-'}</p>
        </div>
        <div className="rounded border border-stone-300 bg-white p-4">
          <p className="text-xs font-bold uppercase text-stone-500">Pit stops</p>
          <p className="mt-1 text-lg font-black text-stone-950">{strategy ? totalPitStops : '-'}</p>
        </div>
      </section>

      {error && (
        <div className="mb-5 rounded border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      {strategyStatus === 'loading' && (
        <div className="rounded border border-stone-300 bg-white p-8 text-center font-semibold text-stone-600">
          Loading strategy data...
        </div>
      )}

      {hasStrategyRows && strategy && (
        <section className="rounded border border-stone-300 bg-white px-4 shadow-sm sm:px-5">
          {strategy.drivers.map((driver) => (
            <StrategyRow key={driver.driverNumber} driver={driver} totalLaps={strategy.totalLaps} />
          ))}
        </section>
      )}

      {hasEmptyStrategy && (
        <div className="rounded border border-stone-300 bg-white p-8 text-center font-semibold text-stone-600">
          No strategy data found for this session.
        </div>
      )}
    </main>
  )
}

export default App
