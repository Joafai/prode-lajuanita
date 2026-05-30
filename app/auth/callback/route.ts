import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-send'
import { welcomeEmail } from '@/lib/email-templates'

// Restrict `next` to local relative paths so a crafted magic-link can't bounce
// the user to attacker.com after authentication. Rejects: protocol-relative
// (`//host`), absolute URLs (`https://host`), userinfo tricks (`@host`),
// backslash variants, and anything that doesn't start with `/`.
function safeNextPath(raw: string | null): string {
  const fallback = '/dashboard'
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  if (/[\r\n]/.test(raw)) return fallback
  // Disallow embedded scheme/userinfo even when prefixed by `/`
  if (raw.includes('://') || raw.includes('@')) return fallback
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))
  const errDesc = searchParams.get('error_description')

  if (errDesc) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(errDesc)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`)
  }

  const isPasswordReset = next.startsWith('/auth/reset-password')
  if (!isPasswordReset) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email_confirmed_at && !user.user_metadata?.welcome_sent && user.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin
        const recipientName = (user.user_metadata?.name as string | undefined) ?? user.email.split('@')[0]
        const tpl = welcomeEmail({ appUrl, recipientName })
        await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html })
        await supabase.auth.updateUser({ data: { welcome_sent: true } })
      }
    } catch {
      // Don't block sign-in if the welcome email fails — log silently and continue.
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
