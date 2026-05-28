'use client'

import { useState, useTransition } from 'react'
import { togglePhase, saveResult, updateMatchTeams, makeAdmin } from '@/lib/actions'
import { PHASE_ORDER, PHASE_LABELS, getFlag } from '@/lib/matches-data'
import type { Database } from '@/types/database'

type Match = Database['public']['Tables']['matches']['Row']
type ActivePhase = Database['public']['Tables']['active_phases']['Row']

interface Props {
  matches: Match[]
  activePhases: ActivePhase[]
  isAdmin: boolean
}

export default function AdminPanel({ matches, activePhases, isAdmin: initialIsAdmin }: Props) {
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin)
  const [adminPw, setAdminPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [toast, setToast] = useState('')
  const [isPending, startTransition] = useTransition()
  const [phases, setPhases] = useState(Object.fromEntries(activePhases.map((p) => [p.phase, p.is_active])))
  const [resultInputs, setResultInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [teamInputs, setTeamInputs] = useState<Record<string, { home: string; away: string }>>({})

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    startTransition(async () => {
      const res = await makeAdmin(adminPw)
      if (res.error) { setPwError(res.error) } else { setIsAdmin(true); showToast('Admin access granted ✓') }
    })
  }

  function handleToggle(phase: string) {
    const next = !phases[phase]
    startTransition(async () => {
      const res = await togglePhase(phase, next)
      if (!res.error) {
        setPhases((prev) => ({ ...prev, [phase]: next }))
        showToast(`${PHASE_LABELS[phase as keyof typeof PHASE_LABELS]} ${next ? 'enabled' : 'disabled'}`)
      }
    })
  }

  function handleSyncResults() {
    startTransition(async () => {
      const res = await fetch('/api/sync-results', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        showToast('Sync error: ' + data.error)
      } else {
        showToast(`✓ ${data.updated} results synced from API`)
      }
    })
  }

  async function postNotify(payload: Record<string, unknown>): Promise<{ sent?: number; failed?: number; error?: string; winner?: string }> {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.json()
  }

  function handleNotifyPhase(phase: string, kind: 'phase_open' | 'phase_close') {
    startTransition(async () => {
      const data = await postNotify({ type: kind, phase })
      if (data.error) showToast('Error: ' + data.error)
      else showToast(`📧 ${data.sent} emails sent · ${kind === 'phase_open' ? 'open' : 'close'}`)
    })
  }

  function handleNotifyTournamentEnd() {
    if (!confirm('Send end-of-tournament email to ALL users with their leaderboard position?')) return
    startTransition(async () => {
      const data = await postNotify({ type: 'tournament_end' })
      if (data.error) showToast('Error: ' + data.error)
      else showToast(`🏆 ${data.sent} emails sent · winner: ${data.winner ?? '—'}`)
    })
  }

  function handleNotifyWinner() {
    if (!confirm('Send special winner email to the top of the leaderboard?')) return
    startTransition(async () => {
      const data = await postNotify({ type: 'winner' })
      if (data.error) showToast('Error: ' + data.error)
      else showToast(`👑 Winner notified: ${data.winner ?? '—'}`)
    })
  }

  async function postSimulate(payload: Record<string, unknown>): Promise<{ updated?: number; cleared?: number; scoresCleared?: number; skipped?: number; error?: string }> {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.json()
  }

  function handleSimFill(phase: string, mode: 'random' | 'argentina-wins') {
    if (!confirm(`Fill ALL ${phase} matches with ${mode} scores? Existing scores in TBD-free matches will be overwritten.`)) return
    startTransition(async () => {
      const data = await postSimulate({ action: 'fill-phase', phase, mode })
      if (data.error) showToast('Error: ' + data.error)
      else showToast(`🎲 ${data.updated} matches filled (${data.skipped ?? 0} TBD skipped)`)
    })
  }

  function handleSimClear(phase: string) {
    if (!confirm(`Clear all scores in ${phase}?`)) return
    startTransition(async () => {
      const data = await postSimulate({ action: 'clear-phase', phase })
      if (data.error) showToast('Error: ' + data.error)
      else showToast(`🧹 ${data.cleared} scores cleared in ${phase}`)
    })
  }

  function handleSimReset() {
    if (!confirm('RESET EVERYTHING: clear all match scores, all prize-winner snapshots, and deactivate all phases. This is destructive but only really makes sense in simulation. Proceed?')) return
    startTransition(async () => {
      const data = await postSimulate({ action: 'reset-all' })
      if (data.error) showToast('Error: ' + data.error)
      else showToast(`♻️ Reset complete (${data.scoresCleared} scores)`)
    })
  }

  function handleSaveResult(match: Match) {
    const inp = resultInputs[match.id]
    if (!inp || inp.home === '' || inp.away === '') { showToast('Enter both scores'); return }
    startTransition(async () => {
      const res = await saveResult(match.id, parseInt(inp.home), parseInt(inp.away))
      showToast(res.error ? 'Error: ' + res.error : 'Result saved ✓')
    })
  }

  function handleUpdateTeams(match: Match) {
    const inp = teamInputs[match.id]
    if (!inp || !inp.home || !inp.away) { showToast('Enter both team names'); return }
    startTransition(async () => {
      const res = await updateMatchTeams(match.id, inp.home, inp.away)
      showToast(res.error ? 'Error: ' + res.error : 'Teams updated ✓')
    })
  }

  if (!isAdmin) {
    return (
      <div className="max-w-sm mx-auto mt-8 relative z-10">
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} className="rounded-xl p-6">
          <div className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">Admin Password</div>
          <form onSubmit={handleAdminLogin} className="space-y-3">
            <input
              type="password"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              placeholder="Password..."
              style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-gold"
            />
            {pwError && <p className="text-danger text-sm">{pwError}</p>}
            <button type="submit" disabled={isPending} className="w-full py-2.5 bg-navy text-white font-bold rounded-lg text-sm hover:bg-navy2 transition-colors disabled:opacity-40">
              Enter
            </button>
          </form>
          <p className="text-xs text-muted mt-3">
            Default: <code style={{ background: '#ECE6DC' }} className="px-1.5 py-0.5 rounded text-text">juanita2026</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 relative z-10">
      {/* Sync button */}
      <div
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}
        className="rounded-xl p-4 mb-6 flex items-center justify-between gap-4"
      >
        <div>
          <p className="text-sm font-semibold text-text">Auto-sync results</p>
          <p className="text-xs text-muted mt-0.5">Fetches finished match scores from football-data.org</p>
        </div>
        <button
          onClick={handleSyncResults}
          disabled={isPending}
          className="px-4 py-2 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy2 transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          🔄 Sync Results
        </button>
      </div>

      <h2 style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }} className="font-bebas text-2xl tracking-widest text-gold mb-4 pb-2">
        Active Stages
      </h2>
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} className="rounded-xl p-4 mb-8">
        {PHASE_ORDER.map((phase, i) => (
          <div key={phase} style={i < PHASE_ORDER.length - 1 ? { borderBottom: '1px solid rgba(0,0,0,0.06)' } : {}} className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-text">{PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(phase)}
                disabled={isPending}
                style={phases[phase] ? { background: '#2DAA5E', color: '#fff', border: '1px solid #2DAA5E' } : { background: 'none', border: '1px solid rgba(0,0,0,0.15)', color: '#7A8E9B' }}
                className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all disabled:opacity-50"
              >
                {phases[phase] ? '✓ Active' : 'Disabled'}
              </button>
              {phases[phase] && (
                <button
                  onClick={() => handleNotifyPhase(phase, 'phase_open')}
                  disabled={isPending}
                  style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#5A6E7B' }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 hover:border-gold hover:text-gold"
                >
                  📧 Open
                </button>
              )}
              <button
                onClick={() => handleNotifyPhase(phase, 'phase_close')}
                disabled={isPending}
                style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#5A6E7B' }}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 hover:border-gold hover:text-gold"
              >
                🔒 Close
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }} className="font-bebas text-2xl tracking-widest text-gold mb-4 pb-2">
        Tournament Wrap-up
      </h2>
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} className="rounded-xl p-4 mb-8 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-text">End-of-tournament recap</p>
            <p className="text-xs text-muted mt-0.5">Sends every user their final position + the winner&apos;s name.</p>
          </div>
          <button
            onClick={handleNotifyTournamentEnd}
            disabled={isPending}
            style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#5A6E7B' }}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-all disabled:opacity-50 hover:border-gold hover:text-gold whitespace-nowrap"
          >
            🏆 Notify tournament end
          </button>
        </div>
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} className="pt-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-text">Winner-only email</p>
            <p className="text-xs text-muted mt-0.5">Single special email to whoever sits at #1 on the leaderboard.</p>
          </div>
          <button
            onClick={handleNotifyWinner}
            disabled={isPending}
            style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#5A6E7B' }}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-all disabled:opacity-50 hover:border-gold hover:text-gold whitespace-nowrap"
          >
            👑 Notify winner
          </button>
        </div>
      </div>

      {process.env.NEXT_PUBLIC_SIMULATION_MODE === 'true' && (
        <>
          <h2 style={{ borderBottom: '1px solid rgba(184,146,74,0.4)' }} className="font-bebas text-2xl tracking-widest text-gold mb-4 pb-2 flex items-center gap-2">
            🧪 Simulation
            <span className="text-[10px] uppercase tracking-wider font-sans font-normal text-muted2 normal-case">test mode — disable in production</span>
          </h2>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(184,146,74,0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} className="rounded-xl p-4 mb-8 space-y-3">
            <p className="text-xs text-muted leading-relaxed">
              Bypasses the tournament-window guard so you can run the full lifecycle locally. Fill phase scores → trigger the cron with <code className="bg-s2 px-1 rounded">🔄 Sync Results</code> → auto-close should fire emails + lock in stage winners.
            </p>
            {PHASE_ORDER.map((phase) => (
              <div key={phase} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} className="pt-3 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-semibold text-text">{PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleSimFill(phase, 'random')}
                    disabled={isPending}
                    style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#5A6E7B' }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 hover:border-gold hover:text-gold"
                  >
                    🎲 Fill random
                  </button>
                  <button
                    onClick={() => handleSimFill(phase, 'argentina-wins')}
                    disabled={isPending}
                    style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#5A6E7B' }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 hover:border-gold hover:text-gold"
                  >
                    🇦🇷 Argentina wins
                  </button>
                  <button
                    onClick={() => handleSimClear(phase)}
                    disabled={isPending}
                    style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#5A6E7B' }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 hover:border-danger hover:text-danger"
                  >
                    🧹 Clear
                  </button>
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} className="pt-3 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-text">Reset everything</p>
                <p className="text-xs text-muted mt-0.5">Wipes scores, prize-winner snapshots and deactivates every phase.</p>
              </div>
              <button
                onClick={handleSimReset}
                disabled={isPending}
                style={{ background: 'rgba(212,64,64,0.08)', border: '1px solid rgba(212,64,64,0.3)', color: '#D44040' }}
                className="px-4 py-2 rounded-full text-xs font-semibold transition-all disabled:opacity-50 whitespace-nowrap"
              >
                ♻️ Reset all
              </button>
            </div>
          </div>
        </>
      )}

      {PHASE_ORDER.map((phase) => {
        const phaseMatches = matches.filter((m) => m.phase === phase)
        if (!phaseMatches.length) return null
        return (
          <div key={phase} className="mb-8">
            <h3 style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }} className="font-bebas text-xl tracking-widest text-gold mb-3 pb-2">
              {PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}
            </h3>
            <div className="space-y-2">
              {phaseMatches.map((match) => {
                const hasResult = match.home_score !== null
                const isTBD = match.home_team.startsWith('TBD') || match.away_team.startsWith('TBD')
                const ri = resultInputs[match.id] ?? { home: hasResult ? String(match.home_score) : '', away: hasResult ? String(match.away_score) : '' }
                const ti = teamInputs[match.id] ?? { home: match.home_team, away: match.away_team }
                return (
                  <div key={match.id} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }} className="rounded-xl p-4">
                    {isTBD && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <input type="text" value={ti.home} onChange={(e) => setTeamInputs((p) => ({ ...p, [match.id]: { ...ti, home: e.target.value } }))} placeholder="Home team" style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }} className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm outline-none focus:border-gold" />
                        <span className="text-muted">vs</span>
                        <input type="text" value={ti.away} onChange={(e) => setTeamInputs((p) => ({ ...p, [match.id]: { ...ti, away: e.target.value } }))} placeholder="Away team" style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }} className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm outline-none focus:border-gold" />
                        <button onClick={() => handleUpdateTeams(match)} disabled={isPending} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-navy text-white disabled:opacity-40 hover:bg-navy2 transition-colors">Update</button>
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold flex-1 text-text">{getFlag(match.home_team)} {match.home_team} vs {getFlag(match.away_team)} {match.away_team}</span>
                      {hasResult && <span className="text-xs font-bold text-green">✓ {match.home_score}-{match.away_score}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <input type="number" className="score-inp" min={0} max={20} value={ri.home} onChange={(e) => setResultInputs((p) => ({ ...p, [match.id]: { ...ri, home: e.target.value } }))} placeholder="-" />
                      <span className="text-muted font-bold">:</span>
                      <input type="number" className="score-inp" min={0} max={20} value={ri.away} onChange={(e) => setResultInputs((p) => ({ ...p, [match.id]: { ...ri, away: e.target.value } }))} placeholder="-" />
                      <button onClick={() => handleSaveResult(match)} disabled={isPending} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-green text-white disabled:opacity-40 hover:opacity-90 transition-all">Confirm</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {toast && (
        <div style={{ border: '1px solid #B8924A', background: '#FFFFFF', color: '#1C2B38', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-medium z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
