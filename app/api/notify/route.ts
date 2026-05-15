import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PHASE_LABELS, type Phase } from '@/lib/matches-data'
import {
  notifyPhaseOpen,
  notifyPhaseClose,
  notifyTournamentEnd,
  notifyWinner,
} from '@/lib/notify-actions'
import type { EmailType } from '@/lib/email-templates'

export const runtime = 'nodejs'

type NotifyType = Extract<EmailType, 'phase_open' | 'phase_close' | 'tournament_end' | 'winner'>

interface NotifyRequest {
  type: NotifyType
  phase?: Phase
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<NotifyRequest> & { phase?: string }

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const type = body.type ?? (body.phase ? 'phase_open' : null)
  if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

  try {
    if (type === 'phase_open' || type === 'phase_close') {
      const phase = body.phase as Phase | undefined
      if (!phase || !PHASE_LABELS[phase]) {
        return NextResponse.json({ error: 'Invalid phase' }, { status: 400 })
      }
      const result =
        type === 'phase_open'
          ? await notifyPhaseOpen(supabase, phase, appUrl)
          : await notifyPhaseClose(supabase, phase, appUrl)
      return NextResponse.json(result)
    }

    if (type === 'tournament_end') {
      return NextResponse.json(await notifyTournamentEnd(supabase, appUrl))
    }

    if (type === 'winner') {
      return NextResponse.json(await notifyWinner(supabase, appUrl))
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'SMTP_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'SMTP not configured' }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
