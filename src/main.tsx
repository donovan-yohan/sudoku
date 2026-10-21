import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './quiet.css'
import { registerPwa } from './pwa'

const root = document.getElementById('root')
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>)
void registerPwa(import.meta.env.PROD)
