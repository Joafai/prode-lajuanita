// These templates are NOT consumed by the app — they are the HTML you paste into
// Supabase Dashboard → Authentication → Email Templates. Supabase substitutes the
// `{{ .ConfirmationURL }}` and other variables at send time.
//
// 1. Confirm signup → CONFIRM_SIGNUP_HTML
// 2. Reset password → RESET_PASSWORD_HTML
//
// To change copy or styling, edit here and re-paste into the dashboard.

const APP_NAME = 'La Juanita'
const SITE_URL = 'https://prode-lajuanita.vercel.app'
const LOGO_URL = `${SITE_URL}/logo-black.png`

function shell(body: string): string {
  return `
<body style="margin:0;padding:0;background:#F5EEE6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1C2B38;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5EEE6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:18px;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="padding:32px 32px 8px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="${APP_NAME}" width="160" style="display:inline-block;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:8px 32px 32px 32px;">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 32px 24px 32px;border-top:1px solid rgba(0,0,0,0.06);text-align:center;">
          <p style="margin:0;font-size:12px;color:#7A8E9B;letter-spacing:0.5px;">
            ${APP_NAME.toUpperCase()} · WORLD CUP 2026 PREDICTIONS GAME
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>`.trim()
}

export const CONFIRM_SIGNUP_HTML = shell(`
  <h1 style="font-size:22px;margin:0 0 16px 0;color:#1C2B38;text-align:center;font-weight:700;">
    Welcome to ${APP_NAME}!
  </h1>
  <p style="font-size:15px;color:#5A6E7B;line-height:1.6;margin:0 0 12px 0;">
    Thanks for signing up to the FIFA World Cup 2026 predictions game. Confirm your email to activate your account and start submitting picks.
  </p>
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
  <div style="text-align:center;margin-top:24px;">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;background:#1C2B38;color:#FFFFFF;font-weight:700;border-radius:10px;text-decoration:none;font-size:14px;letter-spacing:0.5px;">
      Confirm my account →
    </a>
  </div>
  <p style="margin:20px 0 0 0;font-size:12px;color:#7A8E9B;text-align:center;line-height:1.5;">
    If you didn't sign up to ${APP_NAME}, you can ignore this email.
  </p>
`)

export const RESET_PASSWORD_HTML = shell(`
  <h1 style="font-size:22px;margin:0 0 16px 0;color:#1C2B38;text-align:center;font-weight:700;">
    Reset your password
  </h1>
  <p style="font-size:15px;color:#5A6E7B;line-height:1.6;margin:0 0 12px 0;">
    We received a request to reset the password on your ${APP_NAME} account. Click the button below to choose a new one. The link expires in 1 hour.
  </p>
  <div style="text-align:center;margin-top:24px;">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;background:#1C2B38;color:#FFFFFF;font-weight:700;border-radius:10px;text-decoration:none;font-size:14px;letter-spacing:0.5px;">
      Reset password →
    </a>
  </div>
  <p style="margin:20px 0 0 0;font-size:12px;color:#7A8E9B;text-align:center;line-height:1.5;">
    If you didn't request a password reset you can ignore this email — your password won't change.
  </p>
`)
