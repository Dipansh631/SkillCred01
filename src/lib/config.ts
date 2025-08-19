// Configuration file for environment variables and API keys
export const config = {
  // Supabase configuration
  supabase: {
    url: 'https://baqjjhbnbrjjkbwcdoam.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhcWpqaGJuYnJqamtid2Nkb2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjk3NjcsImV4cCI6MjA0OTkwNTc2N30.yK5-kTAhOZKz6KfZNUy7LXyBHdHEz2Cn5_qzpqYgUx4'
  },
  
  // PDF.co API configuration
  pdfCo: {
    apiKey: 'dipanshumaheshwari73698@gmail.com_Wpkw4E6hKXrxnPvi1U9GwqHMUXc0hvMoV42V3SSXhUJNbPi1dzPpXvQcFZ2HdZcc',
    baseUrl: 'https://api.pdf.co/v1'
  },
  
  // Gemini API configuration (provided for development usage)
  gemini: {
    apiKey: 'AIzaSyC7TCx8-NvECzWdvpGs9rNE_GjPHPOTlaA'
  },
  
  // Development mode
  isDevelopment: import.meta.env.DEV
}
