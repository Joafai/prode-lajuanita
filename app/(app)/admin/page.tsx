import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from '@/components/AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: matches }, { data: phases }] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    supabase.from('matches').select('*').order('sort_order'),
    supabase.from('active_phases').select('*'),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="font-bebas text-3xl tracking-widest text-gold mb-6 flex items-center gap-4">
        Admin Panel
        <span className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
      </div>
      <AdminPanel
        matches={matches ?? []}
        activePhases={phases ?? []}
        isAdmin={profile?.is_admin ?? false}
      />
    </div>
  )
}
