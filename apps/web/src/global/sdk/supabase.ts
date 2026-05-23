import { createClient } from '@supabase/supabase-js'
import { Database } from 'types/supabase'

export const supabase = createClient<Database>(
  'https://sucnlytjgnhjgvwykfbg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1Y25seXRqZ25oamd2d3lrZmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDMwOTUsImV4cCI6MjA3NDkxOTA5NX0.UbxPCHcIMeRBC-R5EsecmZapdZDxSUnAmPUcbBQHVSo',
)
