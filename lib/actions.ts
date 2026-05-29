'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function savePicks(
  picks: { matchId: string; homeScore: number; awayScore: number }[]
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('picks').upsert(
    picks.map((p) => ({
      user_id: user.id,
      match_id: p.matchId,
      home_score: p.homeScore,
      away_score: p.awayScore,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'user_id,match_id' }
  )

  revalidatePath('/matches')
  revalidatePath('/dashboard')
  revalidatePath('/leaderboard')

  return { error: error?.message }
}

export async function saveResult(matchId: string, homeScore: number, awayScore: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore })
    .eq('id', matchId)

  revalidatePath('/admin')
  revalidatePath('/leaderboard')
  revalidatePath('/matches')

  return { error: error?.message }
}

export async function updateMatchTeams(matchId: string, homeTeam: string, awayTeam: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('matches')
    .update({ home_team: homeTeam, away_team: awayTeam })
    .eq('id', matchId)

  revalidatePath('/admin')
  revalidatePath('/matches')

  return { error: error?.message }
}

export async function togglePhase(phase: string, isActive: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('active_phases')
    .update({
      is_active: isActive,
      activated_at: isActive ? new Date().toISOString() : null,
    })
    .eq('phase', phase)

  revalidatePath('/admin')
  revalidatePath('/matches')

  return { error: error?.message }
}

export async function makeAdmin(password: string) {
  const adminPass = process.env.ADMIN_PASSWORD ?? 'juanita2026'
  if (password !== adminPass) return { error: 'Contraseña incorrecta' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', user.id)

  revalidatePath('/admin')

  return { error: error?.message }
}
