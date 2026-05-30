export type EmailType =
  | 'welcome'
  | 'phase_open'
  | 'phase_close'
  | 'tournament_end'
  | 'winner'

interface BaseCtx {
  appUrl: string
  recipientName: string
}

export interface PodiumEntry {
  name: string
  points: number
  position: 1 | 2 | 3
}

interface PhaseCtx extends BaseCtx {
  phaseLabel: string
  nextPhaseLabel?: string | null
  podium?: PodiumEntry[] | null
  // If the recipient is in the podium, render the personalized prize-winner
  // variant (different header copy + "present this email to claim").
  recipientPosition?: 1 | 2 | 3 | null
  // The phase identifier (e.g. 'grupos', 'final') used to look up the prize
  // description in STAGE_PRIZES. Distinct from phaseLabel which is the
  // display string.
  stageKey?: 'grupos' | 'tournament' | null
  // Number of OTHER participants tied at the same podium position (i.e. same
  // total_pts AND same exact_count — the exact-count tiebreaker didn't
  // resolve it). When > 0 the prize block switches to the "draw pending"
  // variant: prize is decided by a random draw between the tied participants.
  recipientSharedCount?: number
}

interface TournamentEndCtx extends BaseCtx {
  position: number
  totalParticipants: number
  points: number
  winnerName: string
  // If recipient is in top-3, render personalized prize block instead of the
  // generic "your finish" stats.
  recipientPodiumPosition?: 1 | 2 | 3 | null
  // Same semantics as PhaseCtx.recipientSharedCount.
  recipientSharedCount?: number
}

// Prize descriptions per stage and position. Sourced from the prize images on
// the home page (/group-stage-prizes.jpg, /knockout-stage-prizes.jpg).
const STAGE_PRIZES: Record<'grupos' | 'tournament', Record<1 | 2 | 3, string>> = {
  grupos: {
    1: '6 Empanadas + Argentinian Flag',
    2: 'Argentinian Sample Box',
    3: 'Bite & Sip Combo',
  },
  tournament: {
    1: '12 Empanadas + Football World Cup Ball',
    2: '6 Empanadas',
    3: 'Argentinian Sample Box',
  },
}

interface WinnerCtx extends BaseCtx {
  points: number
}

export interface EmailPayload {
  subject: string
  html: string
}

function shell(appUrl: string, body: string): string {
  return `
    <body style="margin:0;padding:0;background:#F5EEE6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1C2B38;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5EEE6;padding:32px 16px;">
        <tr><td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:18px;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
            <tr><td style="padding:32px 32px 8px 32px;text-align:center;">
              <img src="${appUrl}/logo-black.png" alt="La Juanita" width="160" style="display:inline-block;height:auto;max-width:160px;" />
            </td></tr>
            <tr><td style="padding:8px 32px 32px 32px;">
              ${body}
            </td></tr>
            <tr><td style="padding:16px 32px 24px 32px;border-top:1px solid rgba(0,0,0,0.06);text-align:center;">
              <p style="margin:0;font-size:12px;color:#7A8E9B;letter-spacing:0.5px;">
                LA JUANITA · WORLD CUP 2026 PREDICTIONS GAME
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  `
}

function button(href: string, label: string): string {
  return `
    <div style="text-align:center;margin-top:24px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;background:#1C2B38;color:#FFFFFF;font-weight:700;border-radius:10px;text-decoration:none;font-size:14px;letter-spacing:0.5px;">
        ${label}
      </a>
    </div>
  `
}

function heading(text: string): string {
  return `<h1 style="font-size:22px;margin:0 0 16px 0;color:#1C2B38;text-align:center;font-weight:700;">${text}</h1>`
}

function paragraph(text: string): string {
  return `<p style="font-size:15px;color:#5A6E7B;line-height:1.6;margin:0 0 12px 0;">${text}</p>`
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Strip CRLF / control chars from any user-controlled string before it lands
// in an email Subject header. Without this an attacker could sign up with
// `Alice\r\nBcc: evil@x.com` and inject extra SMTP headers via the subject.
function headerSafe(value: string): string {
  return value.replace(/[\r\n\t\0]+/g, ' ').slice(0, 200)
}

export function welcomeEmail(ctx: BaseCtx): EmailPayload {
  const name = escape(ctx.recipientName)
  return {
    subject: 'Welcome to La Juanita · Predictions Game 🏆',
    html: shell(
      ctx.appUrl,
      `
        ${heading(`Welcome, ${name}!`)}
        ${paragraph(`Your account is confirmed and ready to play. Time to lock in your predictions for the FIFA World Cup 2026.`)}
        <div style="margin:20px 0;padding:16px 20px;background:#F5EEE6;border-radius:12px;">
          <p style="margin:0 0 10px 0;font-weight:700;color:#1C2B38;font-size:14px;letter-spacing:0.3px;">How it works</p>
          <ol style="margin:0;padding-left:20px;color:#5A6E7B;font-size:14px;line-height:1.8;">
            <li>Submit the exact score for each match.</li>
            <li>Predictions lock 12 hours before kickoff.</li>
            <li><strong style="color:#1C2B38;">3 pts</strong> if you nail the exact score (draws included, e.g. 1-1 vs 1-1).</li>
            <li><strong style="color:#1C2B38;">1 pt</strong> if you get the outcome right (winner or draw) but miss the score (e.g. predict 3-3, real is 1-1).</li>
            <li>Climb the leaderboard to win the pool.</li>
          </ol>
        </div>
        ${button(`${ctx.appUrl}/matches`, 'Submit my predictions →')}
      `
    ),
  }
}

export function phaseOpenEmail(ctx: PhaseCtx): EmailPayload {
  const name = escape(ctx.recipientName)
  const phase = escape(ctx.phaseLabel)
  return {
    subject: `${ctx.phaseLabel} is open — La Juanita`,
    html: shell(
      ctx.appUrl,
      `
        ${heading(`${phase} is now open`)}
        ${paragraph(`Hi ${name}, predictions for the <strong style="color:#1C2B38;">${phase}</strong> are open. Submit your picks before they lock.`)}
        ${paragraph(`Remember: each match locks 12 hours before kickoff.`)}
        ${button(`${ctx.appUrl}/matches`, 'Submit predictions →')}
      `
    ),
  }
}

function podiumBlock(phaseLabel: string, podium: PodiumEntry[]): string {
  const medals: Record<1 | 2 | 3, { emoji: string; bg: string; color: string }> = {
    1: { emoji: '🥇', bg: '#FBF3E2', color: '#B8924A' },
    2: { emoji: '🥈', bg: '#F0EFEC', color: '#5A6E7B' },
    3: { emoji: '🥉', bg: '#F5E9DD', color: '#9C6B3D' },
  }
  // Group by position so ties stack under the same row visually
  const byPos = new Map<1 | 2 | 3, PodiumEntry[]>()
  for (const e of podium) {
    if (!byPos.has(e.position)) byPos.set(e.position, [])
    byPos.get(e.position)!.push(e)
  }
  const rows = ([1, 2, 3] as const)
    .filter((pos) => byPos.has(pos))
    .map((pos) => {
      const m = medals[pos]
      const entries = byPos.get(pos)!
      const names = entries.map((e) => escape(e.name)).join(' & ')
      const points = entries[0].points
      const tieNote = entries.length > 1 ? ' · prize split' : ''
      return `
        <tr>
          <td style="padding:10px 14px;background:${m.bg};border-radius:10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:20px;width:36px;vertical-align:middle;">${m.emoji}</td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:15px;color:${m.color};font-weight:700;">${names}</p>
                  <p style="margin:2px 0 0 0;font-size:12px;color:#5A6E7B;">${points} points${tieNote}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:6px;line-height:6px;">&nbsp;</td></tr>
      `
    })
    .join('')
  return `
    <div style="margin:8px 0 20px 0;padding:20px;background:#FFFFFF;border-radius:12px;border:1px solid rgba(184,146,74,0.25);">
      <p style="margin:0 0 12px 0;font-size:12px;color:#7A8E9B;letter-spacing:1px;text-transform:uppercase;text-align:center;">${escape(phaseLabel)} podium</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      <p style="margin:8px 0 0 0;font-size:12px;color:#5A6E7B;text-align:center;">Standings keep adding up into the next stage.</p>
    </div>
  `
}

// Motivational block shown at the end of the Group Stage close email.
// Reminds everyone (winners AND non-winners) that points carry over and that
// there's a bigger Pool Champion prize still up for grabs.
function keepPlayingBlock(isPodiumWinner: boolean): string {
  const opener = isPodiumWinner
    ? `You won a Group Stage prize — congrats. But your points keep rolling, and the biggest prize is still ahead.`
    : `Your run isn't over. <strong style="color:#1C2B38;">Your points do not reset</strong> — every point you earned in the Group Stage keeps adding up across the knockouts. Whoever leads the leaderboard after the Final wins the pool.`
  return `
    <div style="margin:16px 0;padding:18px;background:#FBF3E2;border-radius:12px;border:1px solid rgba(184,146,74,0.3);">
      <p style="margin:0 0 8px 0;font-size:12px;color:#B8924A;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Still everything to play for</p>
      <p style="margin:0 0 14px 0;font-size:14px;color:#1C2B38;line-height:1.6;">${opener}</p>
      <p style="margin:0 0 8px 0;font-size:12px;color:#7A8E9B;letter-spacing:1px;text-transform:uppercase;font-weight:600;">Pool Champion prizes</p>
      <p style="margin:0;font-size:13px;color:#5A6E7B;line-height:1.9;">
        🥇 <strong style="color:#1C2B38;">${STAGE_PRIZES.tournament[1]}</strong><br/>
        🥈 <strong style="color:#1C2B38;">${STAGE_PRIZES.tournament[2]}</strong><br/>
        🥉 <strong style="color:#1C2B38;">${STAGE_PRIZES.tournament[3]}</strong>
      </p>
    </div>
  `
}

// Variant of prizeClaimBlock for participants tied at a podium position who
// couldn't be split by the exact-count tiebreaker. Shows the prize on the
// line and explains the random draw policy.
function sharedPrizeBlock(
  stageKey: 'grupos' | 'tournament',
  position: 1 | 2 | 3,
  phaseLabel: string,
  sharedWithCount: number
): string {
  const prize = STAGE_PRIZES[stageKey][position]
  const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'
  const ordinal = position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'
  const others =
    sharedWithCount === 1
      ? '1 other participant'
      : `${sharedWithCount} other participants`
  const otherWord = sharedWithCount === 1 ? 'participant' : 'participants'
  return `
    <div style="margin:8px 0 20px 0;padding:24px;background:#FFFFFF;border-radius:14px;border:2px solid #B8924A;text-align:center;">
      <p style="margin:0;font-size:48px;line-height:1;">${medal}🤝</p>
      <p style="margin:12px 0 0 0;font-size:12px;color:#B8924A;letter-spacing:2px;text-transform:uppercase;font-weight:700;">${ordinal} place · ${escape(phaseLabel)}</p>
      <p style="margin:8px 0 0 0;font-size:20px;color:#1C2B38;font-weight:700;line-height:1.3;">Tied with ${others}</p>
      <p style="margin:12px 0 0 0;font-size:14px;color:#5A6E7B;line-height:1.6;">
        Same total points <strong style="color:#1C2B38;">and</strong> same exact-score count — the standard tiebreaker didn't resolve it. Per the pool rules, the <strong style="color:#1C2B38;">${ordinal}-place prize</strong> (${escape(prize)}) will be decided by a <strong style="color:#1C2B38;">random draw</strong> between you and the tied ${otherWord}.
      </p>
      <p style="margin:10px 0 0 0;font-size:13px;color:#7A8E9B;">
        We'll reach out once the draw is done.
      </p>
    </div>
  `
}

function prizeClaimBlock(stageKey: 'grupos' | 'tournament', position: 1 | 2 | 3, phaseLabel: string): string {
  const prize = STAGE_PRIZES[stageKey][position]
  const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'
  const ordinal = position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'
  return `
    <div style="margin:8px 0 20px 0;padding:24px;background:#FFFFFF;border-radius:14px;border:2px solid #B8924A;text-align:center;">
      <p style="margin:0;font-size:48px;line-height:1;">${medal}</p>
      <p style="margin:12px 0 0 0;font-size:12px;color:#B8924A;letter-spacing:2px;text-transform:uppercase;font-weight:700;">${ordinal} place · ${escape(phaseLabel)}</p>
      <p style="margin:8px 0 0 0;font-size:20px;color:#1C2B38;font-weight:700;line-height:1.3;">Your prize: ${escape(prize)}</p>
      <p style="margin:12px 0 0 0;font-size:14px;color:#5A6E7B;line-height:1.5;">
        Stop by <strong style="color:#1C2B38;">La Juanita</strong> to claim it — just show this email at the counter.
      </p>
    </div>
  `
}

export function phaseCloseEmail(ctx: PhaseCtx): EmailPayload {
  const name = escape(ctx.recipientName)
  const phase = escape(ctx.phaseLabel)
  const next = ctx.nextPhaseLabel ? escape(ctx.nextPhaseLabel) : null
  const hasPodium = !!(ctx.podium && ctx.podium.length)
  const isPodiumWinner = !!(ctx.recipientPosition && ctx.stageKey)
  // Only the Group Stage close has another prize stage still ahead — at other
  // phase closes (octavos/cuartos/etc.) the motivational block doesn't apply.
  const isGroupStageClose = ctx.stageKey === 'grupos' || ctx.phaseLabel === 'Group Stage'
  const keepPlayingHtml = isGroupStageClose ? keepPlayingBlock(isPodiumWinner) : ''

  // ── Variant A: recipient is in the top-3 → personalized prize-claim email ──
  if (isPodiumWinner) {
    const sharedCount = ctx.recipientSharedCount ?? 0
    const isShared = sharedCount > 0
    const ordinal = ctx.recipientPosition === 1 ? '1st' : ctx.recipientPosition === 2 ? '2nd' : '3rd'
    return {
      subject: isShared
        ? `${ctx.phaseLabel} is over — you tied for ${ordinal} · draw pending 🤝`
        : `${ctx.phaseLabel} is over — you finished ${ordinal}! 🏆`,
      html: shell(
        ctx.appUrl,
        `
          ${heading(isShared ? `Tied at ${ordinal} place, ${name}!` : `Congrats, ${name}!`)}
          ${paragraph(
            isShared
              ? `The <strong style="color:#1C2B38;">${phase}</strong> is over — and you finished tied at ${ordinal} place.`
              : `The <strong style="color:#1C2B38;">${phase}</strong> is over — and you finished in the top 3.`
          )}
          ${
            isShared
              ? sharedPrizeBlock(ctx.stageKey!, ctx.recipientPosition!, ctx.phaseLabel, sharedCount)
              : prizeClaimBlock(ctx.stageKey!, ctx.recipientPosition!, ctx.phaseLabel)
          }
          ${hasPodium ? podiumBlock(ctx.phaseLabel, ctx.podium!) : ''}
          ${keepPlayingHtml}
          ${
            next
              ? button(`${ctx.appUrl}/matches`, `Open ${next} →`)
              : button(`${ctx.appUrl}/leaderboard`, 'View leaderboard →')
          }
        `
      ),
    }
  }

  // ── Variant B: everyone else → celebratory recap with the podium visible ──
  const headerCopy = hasPodium
    ? `The ${phase} is over — here are the results!`
    : `${phase} predictions are locked`
  return {
    subject: hasPodium
      ? `${ctx.phaseLabel} is over — here are the results`
      : `${ctx.phaseLabel} is locked${next ? ` · ${ctx.nextPhaseLabel} is open` : ''}`,
    html: shell(
      ctx.appUrl,
      `
        ${heading(headerCopy)}
        ${paragraph(`Hi ${name}, predictions for the <strong style="color:#1C2B38;">${phase}</strong> are now locked. No further edits are possible for this stage.`)}
        ${hasPodium ? podiumBlock(ctx.phaseLabel, ctx.podium!) : ''}
        ${keepPlayingHtml}
        ${
          next
            ? button(`${ctx.appUrl}/matches`, `Open ${next} →`)
            : button(`${ctx.appUrl}/leaderboard`, 'View leaderboard →')
        }
      `
    ),
  }
}

export function tournamentEndEmail(ctx: TournamentEndCtx): EmailPayload {
  const name = escape(ctx.recipientName)
  const winner = escape(ctx.winnerName)
  const ordinal = formatOrdinal(ctx.position)
  const podiumPos = ctx.recipientPodiumPosition
  const isPodium = podiumPos === 1 || podiumPos === 2 || podiumPos === 3

  // ── Top-3 variant: personalized prize-claim ───────────────────────────────
  if (isPodium) {
    const sharedCount = ctx.recipientSharedCount ?? 0
    const isShared = sharedCount > 0
    const podiumOrdinal = podiumPos === 1 ? '1st' : podiumPos === 2 ? '2nd' : '3rd'
    return {
      subject: isShared
        ? `The pool is over — you tied for ${podiumOrdinal} · draw pending 🤝`
        : `The pool is over — you finished ${podiumOrdinal}! 🏆`,
      html: shell(
        ctx.appUrl,
        `
          ${heading(isShared ? `Tied at ${podiumOrdinal} place, ${name}!` : `Congrats, ${name}!`)}
          ${paragraph(
            isShared
              ? `The FIFA World Cup 2026 is done — and you finished tied at ${podiumOrdinal} place in the predictions pool.`
              : `The FIFA World Cup 2026 is done — and you finished in the top 3 of the predictions pool.`
          )}
          ${
            isShared
              ? sharedPrizeBlock('tournament', podiumPos!, 'Final Standings', sharedCount)
              : prizeClaimBlock('tournament', podiumPos!, 'Final Standings')
          }
          <div style="margin:16px 0;padding:20px;background:#F5EEE6;border-radius:12px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#7A8E9B;letter-spacing:1px;text-transform:uppercase;">Your finish</p>
            <p style="margin:6px 0 0 0;font-size:22px;color:#1C2B38;font-weight:700;">${ordinal} out of ${ctx.totalParticipants}</p>
            <p style="margin:4px 0 0 0;font-size:13px;color:#5A6E7B;">${ctx.points} points</p>
          </div>
          ${button(`${ctx.appUrl}/leaderboard`, 'View full leaderboard →')}
        `
      ),
    }
  }

  // ── Default recap: non-podium users ───────────────────────────────────────
  return {
    subject: headerSafe(`Final results · ${ctx.winnerName} wins the pool`),
    html: shell(
      ctx.appUrl,
      `
        ${heading(`The pool is over`)}
        ${paragraph(`Hi ${name}, the FIFA World Cup 2026 is done — and so is the predictions pool.`)}
        <div style="margin:20px 0;padding:20px;background:#F5EEE6;border-radius:12px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#7A8E9B;letter-spacing:1px;text-transform:uppercase;">Pool winner</p>
          <p style="margin:6px 0 0 0;font-size:22px;color:#B8924A;font-weight:700;letter-spacing:0.5px;">🏆 ${winner}</p>
        </div>
        <div style="margin:16px 0;padding:20px;background:#F5EEE6;border-radius:12px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#7A8E9B;letter-spacing:1px;text-transform:uppercase;">Your finish</p>
          <p style="margin:6px 0 0 0;font-size:22px;color:#1C2B38;font-weight:700;">${ordinal} out of ${ctx.totalParticipants}</p>
          <p style="margin:4px 0 0 0;font-size:13px;color:#5A6E7B;">${ctx.points} points</p>
        </div>
        ${button(`${ctx.appUrl}/leaderboard`, 'View full leaderboard →')}
      `
    ),
  }
}

export function winnerEmail(ctx: WinnerCtx): EmailPayload {
  const name = escape(ctx.recipientName)
  return {
    subject: `🏆 You won the La Juanita pool!`,
    html: shell(
      ctx.appUrl,
      `
        ${heading(`Champion: ${name}`)}
        <div style="margin:8px 0 20px 0;padding:24px;background:#1C2B38;border-radius:14px;text-align:center;">
          <p style="margin:0;font-size:14px;color:#B8924A;letter-spacing:2px;text-transform:uppercase;font-weight:700;">FIFA World Cup 2026</p>
          <p style="margin:8px 0 0 0;font-size:28px;color:#FFFFFF;font-weight:800;letter-spacing:0.5px;">Pool Champion</p>
          <p style="margin:6px 0 0 0;font-size:14px;color:#7A8E9B;">${ctx.points} points</p>
        </div>
        ${paragraph(`Congratulations — you topped the leaderboard. The rest of us are jealous.`)}
        ${paragraph(`Keep an eye on your inbox: we'll be in touch about your prize.`)}
        ${button(`${ctx.appUrl}/leaderboard`, 'See the final leaderboard →')}
      `
    ),
  }
}

function formatOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
