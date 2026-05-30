export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          is_admin: boolean
          created_at: string
          confirmed_at: string | null
        }
        Insert: {
          id: string
          name: string
          email: string
          is_admin?: boolean
          created_at?: string
          confirmed_at?: string | null
        }
        Update: {
          name?: string
          email?: string
          is_admin?: boolean
          confirmed_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          phase: string
          group_name: string | null
          home_team: string
          away_team: string
          home_score: number | null
          away_score: number | null
          match_date: string | null
          sort_order: number
        }
        Insert: {
          id: string
          phase: string
          group_name?: string | null
          home_team: string
          away_team: string
          home_score?: number | null
          away_score?: number | null
          match_date?: string | null
          sort_order?: number
        }
        Update: {
          phase?: string
          group_name?: string | null
          home_team?: string
          away_team?: string
          home_score?: number | null
          away_score?: number | null
          match_date?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      active_phases: {
        Row: {
          phase: string
          is_active: boolean
          activated_at: string | null
        }
        Insert: {
          phase: string
          is_active?: boolean
          activated_at?: string | null
        }
        Update: {
          is_active?: boolean
          activated_at?: string | null
        }
        Relationships: []
      }
      stage_winners: {
        Row: {
          stage_key: string
          user_id: string
          name: string
          points: number
          position: number
          declared_at: string
        }
        Insert: {
          stage_key: string
          user_id: string
          name: string
          points: number
          position: number
          declared_at?: string
        }
        Update: {
          stage_key?: string
          user_id?: string
          name?: string
          points?: number
          position?: number
          declared_at?: string
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          user_id: string
          attempted_at: string
        }
        Insert: {
          user_id: string
          attempted_at?: string
        }
        Update: {
          attempted_at?: string
        }
        Relationships: []
      }
      picks: {
        Row: {
          id: string
          user_id: string
          match_id: string
          home_score: number
          away_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          match_id: string
          home_score: number
          away_score: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          home_score?: number
          away_score?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      get_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          name: string
          email: string
          total_pts: number
          exact_count: number
          winner_count: number
          picks_count: number
        }[]
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
