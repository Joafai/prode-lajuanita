export const PHASE_ORDER = [
  'grupos',
  'dieciseisavos',
  'octavos',
  'cuartos',
  'semis',
  'tercero',
  'final',
] as const

export type Phase = (typeof PHASE_ORDER)[number]

export const PHASE_LABELS: Record<Phase, string> = {
  grupos: 'Group Stage',
  dieciseisavos: 'Round of 32',
  octavos: 'Round of 16',
  cuartos: 'Quarterfinals',
  semis: 'Semifinals',
  tercero: 'Third Place',
  final: 'Final',
}

export function translateGroupName(name: string | null): string {
  if (!name) return 'Matches'
  const map: Record<string, string> = {
    'Grupo A': 'Group A', 'Grupo B': 'Group B', 'Grupo C': 'Group C',
    'Grupo D': 'Group D', 'Grupo E': 'Group E', 'Grupo F': 'Group F',
    'Grupo G': 'Group G', 'Grupo H': 'Group H', 'Grupo I': 'Group I',
    'Grupo J': 'Group J', 'Grupo K': 'Group K', 'Grupo L': 'Group L',
    '16avos de Final': 'Round of 32',
    'Octavos de Final': 'Round of 16',
    'Cuartos de Final': 'Quarterfinals',
    'Semifinales': 'Semifinals',
    'Tercer Puesto': 'Third Place',
    'Final': 'Final',
  }
  return map[name] ?? name
}

// English and Spanish aliases so flags work before and after migration 003
export const FLAGS: Record<string, string> = {
  Mexico: '🇲🇽', 'México': '🇲🇽',
  'South Korea': '🇰🇷', 'Corea del Sur': '🇰🇷',
  'South Africa': '🇿🇦', 'Sudáfrica': '🇿🇦',
  'Czech Republic': '🇨🇿', 'República Checa': '🇨🇿',
  Canada: '🇨🇦', 'Canadá': '🇨🇦',
  Switzerland: '🇨🇭', 'Suiza': '🇨🇭',
  Qatar: '🇶🇦',
  'Bosnia & Herzegovina': '🇧🇦', 'Bosnia-Herzegovina': '🇧🇦',
  Brazil: '🇧🇷', 'Brasil': '🇧🇷',
  Morocco: '🇲🇦', 'Marruecos': '🇲🇦',
  Haiti: '🇭🇹', 'Haití': '🇭🇹',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  USA: '🇺🇸', 'Estados Unidos': '🇺🇸',
  Australia: '🇦🇺',
  Paraguay: '🇵🇾',
  Turkey: '🇹🇷', 'Turquía': '🇹🇷',
  Germany: '🇩🇪', 'Alemania': '🇩🇪',
  'Curaçao': '🇨🇼', 'Curazao': '🇨🇼',
  "Côte d'Ivoire": '🇨🇮', 'Costa de Marfil': '🇨🇮',
  Ecuador: '🇪🇨',
  Netherlands: '🇳🇱', 'Países Bajos': '🇳🇱',
  Japan: '🇯🇵', 'Japón': '🇯🇵',
  Sweden: '🇸🇪', 'Suecia': '🇸🇪',
  Tunisia: '🇹🇳', 'Túnez': '🇹🇳',
  Belgium: '🇧🇪', 'Bélgica': '🇧🇪',
  Iran: '🇮🇷', 'Irán': '🇮🇷',
  Egypt: '🇪🇬', 'Egipto': '🇪🇬',
  'New Zealand': '🇳🇿', 'Nueva Zelanda': '🇳🇿',
  Spain: '🇪🇸', 'España': '🇪🇸',
  Uruguay: '🇺🇾',
  'Saudi Arabia': '🇸🇦', 'Arabia Saudita': '🇸🇦',
  'Cape Verde': '🇨🇻', 'Cabo Verde': '🇨🇻',
  France: '🇫🇷', 'Francia': '🇫🇷',
  Senegal: '🇸🇳',
  Norway: '🇳🇴', 'Noruega': '🇳🇴',
  Iraq: '🇮🇶', 'Irak': '🇮🇶',
  Argentina: '🇦🇷',
  Austria: '🇦🇹',
  Algeria: '🇩🇿', 'Argelia': '🇩🇿',
  Jordan: '🇯🇴', 'Jordania': '🇯🇴',
  Portugal: '🇵🇹',
  Colombia: '🇨🇴',
  Uzbekistan: '🇺🇿', 'Uzbekistán': '🇺🇿',
  'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Croatia: '🇭🇷', 'Croacia': '🇭🇷',
  Panama: '🇵🇦', 'Panamá': '🇵🇦',
  Ghana: '🇬🇭',
}

export function getFlag(team: string): string {
  return FLAGS[team] ?? '🏳️'
}

// How long after kickoff a match in the "open" override stays editable: ~3h,
// covering 90' + extra time + penalties. After that it's treated as finished.
export const MATCH_LOCK_AFTER_KICKOFF_MS = 3 * 60 * 60 * 1000

// Match ids whose picks stay open until the match ENDS instead of locking at
// kickoff — set via NEXT_PUBLIC_OPEN_PICK_MATCH_IDS (comma-separated, e.g.
// "16_1,16_2"). Use it to re-open a single in-progress match (e.g. when its
// matchup was wrong at kickoff). Readable on client AND server thanks to the
// NEXT_PUBLIC_ prefix, so the lock stays consistent on both sides. Once a match
// has a result (or 3h pass) it locks regardless, so the flag is safe to leave on.
export function openPickMatchIds(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_OPEN_PICK_MATCH_IDS ?? ''
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))
}

// Default: picks lock at kickoff (you can edit right up until the match starts).
// Exception: ids in the open-pick override stay editable until the match is over
// (~3h after kickoff). A loaded result locks the match either way — the caller
// checks home_score. Mirrored server-side in lib/actions.ts (savePicks).
export function isMatchLocked(matchId: string, matchDate: string | null | undefined): boolean {
  if (!matchDate) return false
  const kickoff = new Date(matchDate).getTime()
  if (openPickMatchIds().has(matchId)) {
    return Date.now() - kickoff > MATCH_LOCK_AFTER_KICKOFF_MS
  }
  return Date.now() >= kickoff
}

// Formats a match date as Miami time (America/New_York). Used in /matches when
// the match hasn't been played yet so the user knows when to check back.
export function formatMatchDateMiami(matchDate: string | null | undefined): string | null {
  if (!matchDate) return null
  const d = new Date(matchDate)
  if (isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(d)
}
