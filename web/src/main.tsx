import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useLangStore, applyDocumentLang } from './i18n/useLang'
import './index.css'

// Set lang/dir before first paint, then keep them in step with the toggle.
applyDocumentLang(useLangStore.getState().lang)
useLangStore.subscribe((s) => applyDocumentLang(s.lang))

const host = document.getElementById('root')
if (!host) throw new Error('main: #root is missing from index.html')

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
