export type Database = {
  public: {
    Tables: {
      files: {
        Row: { id: string; created_at: string; name: string | null; owner: string }
        Insert: {
          id?: string
          created_at?: string
          name?: string | null
          owner: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string | null
          owner?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
