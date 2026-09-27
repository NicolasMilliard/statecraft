import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EditorToaster } from './editor/EditorToaster.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <EditorToaster />
  </StrictMode>,
)
