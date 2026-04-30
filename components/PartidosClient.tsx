'use client'

import { useState, useTransition } from 'react'
import { savePicks } from '@/lib/actions'
import { PHASE_ORDER, PHASE_LABELS, getFlag, isMatchLocked, translateGroupName, type Phase } from '@/lib/matches-data'
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

export default function PartidosClient({ initialMatches, initialPicks, activePhases }: Props) {
  const phaseMap = Object.fromEntries(activePhases.map((p) => [p.phase, p.is_active]))
  const firstActive = PHASE_ORDER.find((p) => phaseMap[p]) ?? 'grupos'

  const [currentPhase, setCurrentPhase] = useState<Phase>(firstActive as Phase)
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
    const phaseMatches = initialMatches.filter((m) => m.phase === currentPhase)
    const toSave = phaseMatches
      .filter((m) => {
        const s = scores[m.id]
        return s && s.home !== '' && s.away !== '' && !isMatchLocked(m.match_date) && m.home_score === null
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
      } else {
        showToast(`✓ ${toSave.length} predictions saved`)
      }
    })
  }

  const phaseMatches = initialMatches.filter((m) => m.phase === currentPhase)
  const filledInPhase = phaseMatches.filter((m) => {
    const s = scores[m.id]
    return s && s.home !== '' && s.away !== ''
  }).length

  const groupedMatches = phaseMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group_name ?? 'Matches'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 relative z-10">
      {/* Phase tabs */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {PHASE_ORDER.map((phase) => {
          const active = phase === currentPhase
          const locked = !phaseMap[phase]
          return (
            <button
              key={phase}
              onClick={() => {
                if (locked) { showToast('This stage is not available yet'); return }
                setCurrentPhase(phase as Phase)
              }}
              style={
                active
                  ? { background: '#B8924A', color: '#FFFFFF', border: '1px solid #B8924A' }
                  : { background: 'none', border: '1px solid rgba(0,0,0,0.12)', color: locked ? '#C8C0B8' : '#7A8E9B' }
              }
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            >
              {PHASE_LABELS[phase as Phase]}
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
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mt-5 mb-2 pl-1">
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
  const locked = hasResult || isMatchLocked(match.match_date)

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
        {hasResult ? (
          <>
            <span className="text-xl font-bold text-text">{match.home_score} - {match.away_score}</span>
            <span className="text-[11px] text-muted">your pick: {hasPick ? `${pick.home_score}-${pick.away_score}` : '—'}</span>
            {ptsEl}
          </>
        ) : locked && !isTBD ? (
          <span className="text-sm text-muted">Locked</span>
        ) : isTBD ? (
          <span className="text-xs text-muted">TBD</span>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <input type="number" className="score-inp" min={0} max={20} value={scores?.home ?? ''} onChange={(e) => onScore(match.id, 'home', e.target.value)} placeholder="-" />
              <span className="text-muted font-bold text-lg">:</span>
              <input type="number" className="score-inp" min={0} max={20} value={scores?.away ?? ''} onChange={(e) => onScore(match.id, 'away', e.target.value)} placeholder="-" />
            </div>
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
