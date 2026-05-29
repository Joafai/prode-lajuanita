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

// Picks lock 1 hour before kickoff. Mirror in lib/scoring.ts if you change this.
export function isMatchLocked(matchDate: string | null | undefined): boolean {
  if (!matchDate) return false
  return new Date(matchDate).getTime() - Date.now() < 60 * 60 * 1000
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
