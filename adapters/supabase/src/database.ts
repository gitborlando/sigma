export type Database = {
  public: {
    Tables: {
      files: {
        Row: {
          id: string
          created_at: string
          name: string | null
          owner: string
          content: string | null
          revision: number
        }
        Insert: {
          id?: string
          created_at?: string
          name?: string | null
          owner: string
          content?: string | null
          revision?: number
        }
        Update: {
          id?: string
          created_at?: string
          name?: string | null
          owner?: string
          content?: string | null
          revision?: number
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
