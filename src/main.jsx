import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LanguageProvider } from './lib/LanguageContext.jsx'
import { isNative } from './lib/platform.js'
import './index.css'

// Initialize native plugins when running on iOS/Android
const initNative = async () => {
    if (isNative()) {
        try {
            const { StatusBar, Style } = await import('@capacitor/status-bar');
            await StatusBar.setStyle({ style: Style.Dark });
        } catch (e) {
            // StatusBar not available on web
        }
        try {
            const { Keyboard } = await import('@capacitor/keyboard');
            Keyboard.setAccessoryBarVisible({ isVisible: true });
        } catch (e) {
            // Keyboard not available on web
        }
    }
};

initNative();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <LanguageProvider>
            <App />
        </LanguageProvider>
    </React.StrictMode>,
)
