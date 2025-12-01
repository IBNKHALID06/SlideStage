import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
export * from './hooks/useSlidesCore'
export * from './hooks/useWebcamCore'
export * from './hooks/useMicCore'
export * from './hooks/useVoskCore'
export * from './hooks/useRecorderCore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
