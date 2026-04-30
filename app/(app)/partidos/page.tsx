import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PartidosClient from '@/components/PartidosClient'
import PageDecor from '@/components/PageDecor'

export default async function PartidosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: matches }, { data: picks }, { data: phases }] = await Promise.all([
    supabase.from('matches').select('*').order('sort_order'),
    supabase.from('picks').select('*').eq('user_id', user.id),
    supabase.from('active_phases').select('*'),
  ])

  return (
    <>
      <PageDecor stickers={[
        { src: '/juanita-empanada-scarf.png', side: 'left',  vertical: 'bottom', rotate: -12, size: 420, offset: 60 },
        { src: '/juanita-empanada-flag.png',  side: 'right', vertical: 'bottom', rotate:  12, size: 420, offset: 60 },
      ]} />
      <PartidosClient
      initialMatches={matches ?? []}
      initialPicks={picks ?? []}
      activePhases={phases ?? []}
    />
    </>
  )
}
