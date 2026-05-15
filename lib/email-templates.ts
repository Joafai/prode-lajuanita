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

interface PhaseCtx extends BaseCtx {
  phaseLabel: string
  nextPhaseLabel?: string | null
  leader?: { name: string; points: number } | null
}

interface TournamentEndCtx extends BaseCtx {
  position: number
  totalParticipants: number
  points: number
  winnerName: string
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
        ${button(`${ctx.appUrl}/partidos`, 'Submit my predictions →')}
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
        ${button(`${ctx.appUrl}/partidos`, 'Submit predictions →')}
      `
    ),
  }
}

export function phaseCloseEmail(ctx: PhaseCtx): EmailPayload {
  const name = escape(ctx.recipientName)
  const phase = escape(ctx.phaseLabel)
  const next = ctx.nextPhaseLabel ? escape(ctx.nextPhaseLabel) : null
  const leader = ctx.leader
    ? `
      <div style="margin:8px 0 20px 0;padding:20px;background:#F5EEE6;border-radius:12px;text-align:center;border:1px solid rgba(184,146,74,0.25);">
        <p style="margin:0;font-size:12px;color:#7A8E9B;letter-spacing:1px;text-transform:uppercase;">${escape(ctx.phaseLabel)} prize winner</p>
        <p style="margin:6px 0 0 0;font-size:22px;color:#B8924A;font-weight:700;letter-spacing:0.5px;">🏆 ${escape(ctx.leader!.name)}</p>
        <p style="margin:4px 0 0 0;font-size:13px;color:#5A6E7B;">${ctx.leader!.points} points · standings keep adding up into the next stage</p>
      </div>
    `
    : ''
  return {
    subject: `${ctx.phaseLabel} is locked${next ? ` · ${ctx.nextPhaseLabel} is open` : ''}`,
    html: shell(
      ctx.appUrl,
      `
        ${heading(`${phase} predictions are locked`)}
        ${paragraph(`Hi ${name}, predictions for the <strong style="color:#1C2B38;">${phase}</strong> are now locked. No further edits are possible for this stage.`)}
        ${leader}
        ${
          next
            ? `${paragraph(`The <strong style="color:#1C2B38;">${next}</strong> is now open — points keep adding up on top of what you already have.`)}
               ${button(`${ctx.appUrl}/partidos`, `Open ${next} →`)}`
            : paragraph(`Check the leaderboard to see how you stack up against the rest.`) +
              button(`${ctx.appUrl}/tabla`, 'View leaderboard →')
        }
      `
    ),
  }
}

export function tournamentEndEmail(ctx: TournamentEndCtx): EmailPayload {
  const name = escape(ctx.recipientName)
  const winner = escape(ctx.winnerName)
  const ordinal = formatOrdinal(ctx.position)
  return {
    subject: `Final results · ${winner} wins the pool`,
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
        ${button(`${ctx.appUrl}/tabla`, 'View full leaderboard →')}
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
        ${button(`${ctx.appUrl}/tabla`, 'See the final leaderboard →')}
      `
    ),
  }
}

function formatOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
