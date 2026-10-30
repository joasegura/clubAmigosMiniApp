import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/jost'
import './index.css'
import App from './App.tsx'
import { initStore } from './lib/store'

// Los datos de la demo (y las fotos guardadas) se cargan antes de mostrar la app
void initStore().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
