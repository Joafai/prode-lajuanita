import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { PHASE_LABELS, type Phase } from '@/lib/matches-data'
import {
  notifyPhaseOpen,
  notifyPhaseClose,
  notifyTournamentEnd,
  notifyWinner,
  notifyFinalsOpen,
  notifyFinalsClose,
} from '@/lib/notify-actions'
import type { EmailType } from '@/lib/email-templates'

export const runtime = 'nodejs'

type NotifyType = Extract<EmailType, 'phase_open' | 'phase_close' | 'tournament_end' | 'winner'>

// `phase` can be a real DB phase or the virtual 'finals' key used by the
// admin UI to bundle Third Place + Final into one row.
interface NotifyRequest {
  type: NotifyType
  phase?: Phase | 'finals'
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
      // 'finals' is a virtual phase used by the admin UI to bundle Third Place
      // and Final into one row. Open → single combined email; Close → closes
      // both phases in DB and fires the tournament_end + winner emails.
      if (body.phase === 'finals') {
        const result =
          type === 'phase_open'
            ? await notifyFinalsOpen(supabase, appUrl)
            : await notifyFinalsClose(supabase, appUrl)
        return NextResponse.json(result)
      }
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
      const result = await notifyTournamentEnd(supabase, appUrl)
      // Pool Champion card on /leaderboard reads from stage_winners — bust the
      // cache so the new snapshot shows up immediately.
      revalidatePath('/leaderboard')
      return NextResponse.json(result)
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
