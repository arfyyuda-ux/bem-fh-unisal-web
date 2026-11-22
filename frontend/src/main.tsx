import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { Toaster } from './components/ui/sonner'

// Gambar yang gagal dimuat (URL mati atau offline) diganti placeholder lokal satu kali.
document.addEventListener(
  'error',
  (event) => {
    const el = event.target
    if (el instanceof HTMLImageElement && !el.dataset.fallback) {
      el.dataset.fallback = '1'
      el.src = '/images/placeholder.svg'
    }
  },
  true,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster richColors />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
