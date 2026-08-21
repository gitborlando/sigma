import cloudbaseSDK from '@cloudbase/js-sdk'

export const cloudbase = cloudbaseSDK.init({
  env: 'sigma-d0gybhj1ddf11d8ef',
  region: 'ap-shanghai',
  auth: { detectSessionInUrl: true },
  accessKey:
    'eyJhbGciOiJSUzI1NiIsImtpZCI6ImYzMzY4NDNiLTgzNGUtNDFhZi1hMGE0LTMwYmRlNmNhYjExMiJ9.eyJpc3MiOiJodHRwczovL3NpZ21hLWQwZ3liaGoxZGRmMTFkOGVmLmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJzaWdtYS1kMGd5YmhqMWRkZjExZDhlZiIsImV4cCI6NDA5MDcyMjA2MSwiaWF0IjoxNzg3MDM4ODYxLCJub25jZSI6Im16bmN5Y1RoUTBxbmF0eFBkZ08wQ1EiLCJhdF9oYXNoIjoibXpuY3ljVGhRMHFuYXR4UGRnTzBDUSIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJzaWdtYS1kMGd5YmhqMWRkZjExZDhlZiIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.awR-UE-qxnoH_Nlv4ZWHPW_sKX3nTsbN5j7YNJdBsnWSftXzn9GgHhQhAKd4RVewLTKH3WV-S1eeEiUw5k2PupGmVRZEx39JB9mL2o4Lx3PnUnsJRX74Z7ydHXbVTdG_a25cl7dqI4rYOcUAcopQImChjn2IucQ9oC_6qX2_F2INtepAkWQpCpppJj9gIWx4mdX2pHJYlw1IimNrLYEkxDV3LFoyOSe3toIKKIOMLF2xLBO-iLX51MhIj8-Yg8c7QkNxuMd3YEfKbfEmaQOfwYGje1mh432uEhUajZ1CbCoBavfpat7YCwBtnNDgV2yvhs8KINXXAM5GAK3GrVo92Q',
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
