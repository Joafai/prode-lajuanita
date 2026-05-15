import PageDecor from '@/components/PageDecor'

export default function HowToPlayPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageDecor stickers={[
        { src: '/juanita-trophy.png', side: 'left', vertical: 'bottom', rotate: -8, size: 420, offset: 60 },
        { src: '/juanita-flag.png',   side: 'right', vertical: 'bottom', rotate: 10, size: 420, offset: 60 },
      ]} />

      <div className="font-bebas text-3xl tracking-widest text-gold mb-6 flex items-center gap-4">
        How to Play
        <span className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
      </div>

      {/* ── Gameplay overview ───────────────────────────────────────────────── */}
      <Section title="The basics">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-text leading-relaxed">
          <li>For every match of the FIFA World Cup 2026, predict the <strong>exact score</strong> (e.g. Argentina 2 - 1 France).</li>
          <li>You can edit your prediction up to <strong>12 hours before kickoff</strong>. After that, the match locks.</li>
          <li>Points accumulate across the whole tournament — group stage points carry over into the knockouts.</li>
          <li>The participant with the most points at the end of the tournament wins the pool.</li>
        </ol>
      </Section>

      {/* ── Scoring ─────────────────────────────────────────────────────────── */}
      <Section title="How points work">
        <div className="space-y-3">
          {[
            {
              pts: '+3',
              bg: '#2DAA5E',
              label: 'Exact score',
              detail: 'You nail both numbers — draws count too (e.g. predict 1-1, real is 1-1).',
            },
            {
              pts: '+1',
              bg: '#B8924A',
              label: 'Correct outcome',
              detail: 'You got the right winner OR the right draw, but the score is off (e.g. predict 3-3, real is 1-1; or predict 2-0, real is 3-1).',
            },
            {
              pts: '0',
              bg: 'rgba(212,64,64,0.12)',
              color: '#D44040',
              label: 'Wrong outcome',
              detail: 'Picked a winner and there was a draw, or vice-versa, or the wrong side won.',
            },
          ].map(({ pts, bg, color, label, detail }) => (
            <div key={pts} className="flex items-start gap-3">
              <span
                style={{ background: bg, color: color ?? '#fff' }}
                className="text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap mt-0.5"
              >
                {pts} pts
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text">{label}</p>
                <p className="text-xs text-muted2 mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Phases & prizes ─────────────────────────────────────────────────── */}
      <Section title="Phases & prizes">
        <p className="text-sm text-text leading-relaxed mb-3">
          The pool runs over two stages and has <strong>two prizes</strong> in total.
        </p>
        <ul className="space-y-3 text-sm mb-4">
          <li>
            <p className="font-semibold text-text">🏆 Group Stage prize</p>
            <p className="text-muted2 text-xs leading-relaxed">Awarded to whoever leads the leaderboard the moment the group stage ends.</p>
          </li>
          <li>
            <p className="font-semibold text-text">🏆 Knockout Stage prize (Pool champion)</p>
            <p className="text-muted2 text-xs leading-relaxed">Awarded to whoever leads the leaderboard at the end of the knockout stage — i.e. after the final match of the tournament.</p>
          </li>
        </ul>
        <div
          style={{ background: 'rgba(184,146,74,0.08)', border: '1px solid rgba(184,146,74,0.3)' }}
          className="rounded-lg px-4 py-3"
        >
          <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-1">Points carry over</p>
          <p className="text-xs text-text leading-relaxed">
            Your points <strong>do not reset</strong> when the group stage ends. Everything you earned in the groups keeps adding to your total throughout the knockouts. The Group Stage prize winner is decided at that snapshot, but their points stay on the board and still count toward the Pool champion.
          </p>
        </div>
      </Section>

      {/* ── Tiebreakers ─────────────────────────────────────────────────────── */}
      <Section title="Tiebreakers between participants">
        <p className="text-sm text-text leading-relaxed mb-3">
          If two or more participants end a stage tied on total points, the leaderboard breaks the tie in this order:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-text">
          <li>Most <strong>exact scores</strong> predicted.</li>
          <li>Most <strong>correct outcomes</strong> (winner or draw with wrong score).</li>
          <li>If still tied after both criteria, the prize is split equally between the tied participants.</li>
        </ol>
      </Section>

      {/* ── Legal ───────────────────────────────────────────────────────────── */}
      <div className="font-bebas text-2xl tracking-widest text-gold mt-10 mb-4 flex items-center gap-4">
        Legal Information
        <span className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
      </div>

      <div
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        className="rounded-xl p-5 mb-6"
      >
        <ul className="space-y-3 text-sm text-text leading-relaxed">
          <li className="flex gap-3">
            <span className="text-gold font-bold">•</span>
            <span>Participation in the pool is <strong>completely free</strong>. No fee is charged to sign up or to play.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold font-bold">•</span>
            <span>Only <strong>people aged 18 or over</strong> may participate.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold font-bold">•</span>
            <span>The rules of the pool are published in writing on this site and are also displayed in a visible location inside the La Juanita store.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold font-bold">•</span>
            <span>This pool is <strong>not affiliated with, sponsored by, or endorsed by FIFA</strong> or any official entity related to the FIFA World Cup 2026. It is a recreational activity organized by La Juanita.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold font-bold">•</span>
            <span>In the event of a <strong>tie in points between participants</strong>, tiebreakers are resolved according to the criteria stated above (most exact scores, then most correct outcomes). If the tie persists, the prize is split equally among the tied participants.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      className="rounded-xl p-5 mb-5"
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">{title}</div>
      {children}
    </div>
  )
}
