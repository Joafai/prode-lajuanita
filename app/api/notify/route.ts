import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PHASE_LABELS } from '@/lib/matches-data'

export async function POST(request: Request) {
  const { phase } = await request.json()
  if (!phase) return NextResponse.json({ error: 'Missing phase' }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const resendKey = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM
  if (!resendKey || !resendFrom) {
    return NextResponse.json({ error: 'Resend not configured' }, { status: 400 })
  }

  const { data: profiles } = await supabase.from('profiles').select('name, email')
  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  const phaseLabel = PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? phase
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const results = await Promise.allSettled(
    profiles.map((p) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: p.email,
          subject: `🏆 ${phaseLabel} habilitada — Prode La Juanita`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0e1220;color:#e8edf8;padding:2rem;border-radius:12px;">
              <h1 style="color:#f0c040;font-size:1.8rem;margin-bottom:.5rem">¡Nueva fase habilitada!</h1>
              <p style="color:#8898bb">Hola <strong style="color:#e8edf8">${p.name}</strong>,</p>
              <p style="color:#8898bb;margin-top:12px">
                La <strong style="color:#e8edf8">${phaseLabel}</strong> ya está disponible en el Prode La Juanita.
                Entrá a cargar tus pronósticos antes de que cierren.
              </p>
              <a href="${appUrl}/partidos" style="display:inline-block;margin-top:1.5rem;padding:12px 24px;background:#f0c040;color:#000;font-weight:700;border-radius:8px;text-decoration:none;">
                Cargar pronósticos →
              </a>
              <hr style="border-color:rgba(255,255,255,.1);margin:1.5rem 0">
              <p style="font-size:12px;color:#6b7a9a">Prode La Juanita · Mundial 2026</p>
            </div>
          `,
        }),
      })
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  return NextResponse.json({ sent, total: profiles.length })
}
