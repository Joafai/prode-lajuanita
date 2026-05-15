import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-send'
import { welcomeEmail } from '@/lib/email-templates'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
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
