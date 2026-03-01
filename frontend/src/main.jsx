import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ThemeProvider } from './ThemeContext'
import App from './App.jsx'
import './index.css'

// Import and initialize mobile-drag-drop polyfill
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour-drag-image-translate-override";

polyfill({
    // drag and drop items on hold (150ms) to avoid conflict with scroll
    holdToDrag: 150,
    // custom scroll behavior during drag
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});

// Optionally prevent browser from scrolling while dragging
// window.addEventListener('touchmove', function() {}, {passive: false});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
