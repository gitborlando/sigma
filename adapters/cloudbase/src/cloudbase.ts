import cloudbaseSDK from '@cloudbase/js-sdk'

export const cloudbase = cloudbaseSDK.init({
  env: 'sigma-d5gib3idbcf18445b',
  region: 'ap-shanghai',
  auth: { detectSessionInUrl: true },
  accessKey:
    'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL3NpZ21hLWQ1Z2liM2lkYmNmMTg0NDViLmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJzaWdtYS1kNWdpYjNpZGJjZjE4NDQ1YiIsImV4cCI6NDA5MzA3NDc0NCwiaWF0IjoxNzg5MzkxNTQ0LCJub25jZSI6InRoNkNZblJXVHNHMEhvd0kzOXJxY3ciLCJhdF9oYXNoIjoidGg2Q1luUldUc0cwSG93STM5cnFjdyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJzaWdtYS1kNWdpYjNpZGJjZjE4NDQ1YiIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.I-uTJkIishIg2IaPm3vunrRW-CxsMhhxnvvba-Tul427gtoOFa-P99ECKGnh256YgtJ5i4ZNQ6CamRsIXd6SCAmpTJyNnJ8bWci8I5iHOJzlyWDDUKvVsRGFpQI-jIQ7B4USCFC2wWs9lT-zdzoxnkBrwuwSmc5HY0W1jPEYjkQFlJXzNlbPDXDqrHBFpc-dWBEMjX-PlOCFgMlSH8VfWTbnu9zJt1H81tr1iUlzIJsKMPieF_riFZ4h7tpc9SFgb_SquV0XG1iUkU53zo_FL4pz_Eb3MxjwhY2-yOG3vRP31uGXtdjoDIBehjoR2XGwWzdUaDgFyS4S0yt7kKn9GQ',
})

// generated schema start
// This section is generated. Do not edit it manually.
export interface PublicSchema {
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
// generated schema end
