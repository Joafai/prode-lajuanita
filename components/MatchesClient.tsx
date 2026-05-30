'use client'

import { useState, useTransition } from 'react'
import { savePicks } from '@/lib/actions'
import { PHASE_ORDER, PHASE_LABELS, getFlag, isMatchLocked, translateGroupName, formatMatchDateMiami, type Phase } from '@/lib/matches-data'
import { calcMatchPts } from '@/lib/scoring'
import type { Database } from '@/types/database'

type Match = Database['public']['Tables']['matches']['Row']
type Pick = Database['public']['Tables']['picks']['Row']
type ActivePhase = Database['public']['Tables']['active_phases']['Row']

interface Props {
  initialMatches: Match[]
  initialPicks: Pick[]
  activePhases: ActivePhase[]
}

type ScoreMap = Record<string, { home: string; away: string }>

// When true, individual match locks (12h-pre-kickoff guard + "has real result")
// are bypassed so test users can edit picks freely while a phase is active.
// Only enabled when NEXT_PUBLIC_SIMULATION_MODE=true — production stays strict.
const SIMULATION_MODE = process.env.NEXT_PUBLIC_SIMULATION_MODE === 'true'

// Third Place and Final are played as a single block (within 1-2 days of each
// other in real tournaments). The UI shows ONE tab "Final" that includes both
// — clicking it surfaces both matches. The DB still tracks them as separate
// phases (`tercero` and `final`) for the rest of the system (emails, podium,
// tournament_end logic).
const TAB_PHASES: Phase[] = ['grupos', 'dieciseisavos', 'octavos', 'cuartos', 'semis', 'final']

function matchesInTab(matches: Match[], tab: Phase): Match[] {
  if (tab === 'final') return matches.filter((m) => m.phase === 'tercero' || m.phase === 'final')
  return matches.filter((m) => m.phase === tab)
}

function isTabActive(phaseMap: Record<string, boolean>, tab: Phase): boolean {
  if (tab === 'final') return !!phaseMap['tercero'] || !!phaseMap['final']
  return !!phaseMap[tab]
}

type TabStatus = 'open' | 'not_yet' | 'closed'

// Phase status uses match results as the source of truth (not `activated_at`,
// which isn't reliably set when phases are seeded as active). A tab is:
//   - 'open'    → at least one of its phases is currently is_active
//   - 'closed'  → not active AND every match has a real result
//   - 'not_yet' → not active AND no real results yet
function tabStatus(activePhases: ActivePhase[], matches: Match[], tab: Phase): TabStatus {
  const phases: Phase[] = tab === 'final' ? ['tercero', 'final'] : [tab]
  const rows = phases
    .map((p) => activePhases.find((a) => a.phase === p))
    .filter((r): r is ActivePhase => !!r)
  if (rows.some((r) => r.is_active)) return 'open'
  const tabMatches = matches.filter((m) => phases.includes(m.phase as Phase))
  if (tabMatches.length && tabMatches.every((m) => m.home_score !== null && m.away_score !== null)) {
    return 'closed'
  }
  return 'not_yet'
}

export default function MatchesClient({ initialMatches, initialPicks, activePhases }: Props) {
  const phaseMap = Object.fromEntries(activePhases.map((p) => [p.phase, p.is_active]))
  // If only `tercero` is active (final not yet), map firstActive to 'final' tab
  // so the user lands on the combined view.
  const firstActive: Phase = (TAB_PHASES.find((p) => isTabActive(phaseMap, p)) ?? 'grupos') as Phase

  const [currentPhase, setCurrentPhase] = useState<Phase>(firstActive)
  const [scores, setScores] = useState<ScoreMap>(() => {
    const m: ScoreMap = {}
    initialPicks.forEach((p) => {
      m[p.match_id] = { home: String(p.home_score), away: String(p.away_score) }
    })
    return m
  })
  const [toast, setToast] = useState('')
  const [isPending, startTransition] = useTransition()

  const pickMap = Object.fromEntries(initialPicks.map((p) => [p.match_id, p]))

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleScore(matchId: string, side: 'home' | 'away', val: string) {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 2)
    setScores((prev) => ({
      ...prev,
      [matchId]: { home: prev[matchId]?.home ?? '', away: prev[matchId]?.away ?? '', [side]: clean },
    }))
  }

  function handleSave() {
    const phaseMatches = matchesInTab(initialMatches, currentPhase)
    const toSave = phaseMatches
      .filter((m) => {
        const s = scores[m.id]
        if (!s || s.home === '' || s.away === '') return false
        // Match with a real result is always locked — pick can't change after the match.
        if (m.home_score !== null) return false
        // 1h-pre-kickoff lock only applies in production; in SIMULATION_MODE we don't
        // have real kickoff times to test against.
        if (!SIMULATION_MODE && isMatchLocked(m.match_date)) return false
        return true
      })
      .map((m) => ({
        matchId: m.id,
        homeScore: parseInt(scores[m.id].home),
        awayScore: parseInt(scores[m.id].away),
      }))

    if (!toSave.length) { showToast('No new predictions to save'); return }

    startTransition(async () => {
      const result = await savePicks(toSave)
      if (result.error) {
        showToast('Error saving: ' + result.error)
        return
      }
      // savePicks may silently drop picks that fail the server-side lock
      // (phase deactivated mid-save, match already played, kickoff window).
      // Report both numbers so the user knows some weren't persisted.
      const saved = result.saved ?? toSave.length
      const rejected = result.rejected ?? 0
      if (rejected > 0) {
        showToast(`✓ ${saved} saved · ${rejected} blocked (locked)`)
      } else {
        showToast(`✓ ${saved} predictions saved`)
      }
    })
  }

  const phaseMatches = matchesInTab(initialMatches, currentPhase)
  const filledInPhase = phaseMatches.filter((m) => {
    const s = scores[m.id]
    return s && s.home !== '' && s.away !== ''
  }).length

  // For the combined "Final" tab, group by phase so the user sees Third Place
  // and Final as separate sections.
  const groupedMatches = phaseMatches.reduce<Record<string, Match[]>>((acc, m) => {
    let key: string
    if (currentPhase === 'final') {
      key = m.phase === 'tercero' ? 'Third Place' : 'Final'
    } else {
      key = m.group_name ?? 'Matches'
    }
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 relative z-10">
      {/* Phase tabs */}
      <div className="flex gap-1.5 overflow-x-auto mb-6 pb-1 scrollbar-thin justify-center">
        {TAB_PHASES.map((phase) => {
          const active = phase === currentPhase
          const status = tabStatus(activePhases, initialMatches, phase)
          const locked = status !== 'open'
          const label = phase === 'final' ? 'Finals' : PHASE_LABELS[phase]
          return (
            <button
              key={phase}
              onClick={() => {
                if (status === 'not_yet') { showToast('This stage is not available yet'); return }
                if (status === 'closed') { showToast('This stage is not available anymore'); return }
                setCurrentPhase(phase as Phase)
              }}
              style={
                active
                  ? { background: '#B8924A', color: '#FFFFFF', border: '1px solid #B8924A' }
                  : { background: 'none', border: '1px solid rgba(0,0,0,0.12)', color: locked ? '#C8C0B8' : '#7A8E9B' }
              }
              className="shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap mb-4">
        {[
          { color: '#2DAA5E', label: 'Exact (+3)' },
          { color: '#B8924A', label: 'Winner (+1)' },
          { color: '#D44040', label: 'Wrong' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Match cards */}
      {Object.entries(groupedMatches).map(([groupName, matches]) => (
        <div key={groupName}>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mt-5 mb-2 text-center">
            {translateGroupName(groupName)}
          </div>
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              pick={pickMap[match.id]}
              scores={scores[match.id]}
              onScore={handleScore}
            />
          ))}
        </div>
      ))}

      {/* Save bar */}
      <div
        style={{ background: 'rgba(245,238,230,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(0,0,0,0.08)' }}
        className="fixed bottom-0 left-0 right-0 px-6 py-3 flex items-center justify-between gap-3 z-40"
      >
        <p className="text-sm text-muted">
          {filledInPhase} of {phaseMatches.length} predictions
        </p>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-navy text-white font-bold rounded-lg hover:bg-navy2 transition-colors disabled:opacity-40 text-sm"
        >
          {isPending ? 'Saving...' : 'Save predictions'}
        </button>
      </div>

      {toast && (
        <div
          style={{ border: '1px solid #B8924A', background: '#FFFFFF', color: '#1C2B38', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-medium z-50 whitespace-nowrap"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

function MatchCard({
  match, pick, scores, onScore,
}: {
  match: Match
  pick?: Pick
  scores?: { home: string; away: string }
  onScore: (id: string, side: 'home' | 'away', val: string) => void
}) {
  const hasResult = match.home_score !== null && match.away_score !== null
  const hasPick = pick !== undefined
  // A match is locked when:
  //   - it already has a real result (always, regardless of mode), or
  //   - in production, it's within the 1h-pre-kickoff window.
  const locked = hasResult || (!SIMULATION_MODE && isMatchLocked(match.match_date))

  let cardStyle: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }
  let ptsEl: React.ReactNode = null

  if (hasResult && hasPick) {
    const pts = calcMatchPts(pick.home_score, pick.away_score, match.home_score!, match.away_score!)
    if (pts === 3) {
      cardStyle = { background: 'rgba(45,170,94,0.06)', border: '1px solid #2DAA5E' }
      ptsEl = <span style={{ background: '#2DAA5E', color: '#fff' }} className="text-xs font-bold px-2.5 py-0.5 rounded-full">+3</span>
    } else if (pts === 1) {
      cardStyle = { background: 'rgba(184,146,74,0.06)', border: '1px solid #B8924A' }
      ptsEl = <span style={{ background: '#B8924A', color: '#fff' }} className="text-xs font-bold px-2.5 py-0.5 rounded-full">+1</span>
    } else {
      cardStyle = { background: 'rgba(212,64,64,0.04)', border: '1px solid rgba(212,64,64,0.4)' }
      ptsEl = <span style={{ background: 'rgba(212,64,64,0.12)', color: '#D44040' }} className="text-xs font-bold px-2.5 py-0.5 rounded-full">0</span>
    }
  } else if (hasPick) {
    ptsEl = <span style={{ background: '#ECE6DC', color: '#7A8E9B' }} className="text-xs font-bold px-2.5 py-0.5 rounded-full">pending</span>
  }

  const isTBD = match.home_team.startsWith('TBD') || match.away_team.startsWith('TBD')

  return (
    <div style={cardStyle} className="rounded-xl px-4 py-3 mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{getFlag(match.home_team)}</span>
        <span className="text-sm font-medium leading-tight text-text">{match.home_team}</span>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        {isTBD ? (
          <span className="text-xs text-muted">TBD</span>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                className="score-inp disabled:opacity-60 disabled:cursor-not-allowed"
                min={0}
                max={20}
                value={scores?.home ?? ''}
                onChange={(e) => onScore(match.id, 'home', e.target.value)}
                placeholder="-"
                disabled={locked}
              />
              <span className="text-muted font-bold text-lg">:</span>
              <input
                type="number"
                className="score-inp disabled:opacity-60 disabled:cursor-not-allowed"
                min={0}
                max={20}
                value={scores?.away ?? ''}
                onChange={(e) => onScore(match.id, 'away', e.target.value)}
                placeholder="-"
                disabled={locked}
              />
            </div>
            {hasResult ? (
              <span className="text-base font-bold text-blue">outcome: {match.home_score}-{match.away_score}</span>
            ) : match.match_date ? (
              <span className="text-xs text-muted">{formatMatchDateMiami(match.match_date)}</span>
            ) : null}
            {ptsEl}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-row-reverse text-right">
        <span className="text-2xl leading-none">{getFlag(match.away_team)}</span>
        <span className="text-sm font-medium leading-tight text-text">{match.away_team}</span>
      </div>
    </div>
  )
}
