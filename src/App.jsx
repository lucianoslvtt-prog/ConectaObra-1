import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

import Welcome from './pages/Welcome';
import Auth from './pages/Auth';
import OnboardingPro from './pages/OnboardingPro';
import Dashboard from './pages/Dashboard';
import Directory from './pages/Directory';
import CategoryList from './pages/CategoryList';
import ProfessionalProfile from './pages/ProfessionalProfile';
import Community from './pages/Community';
import Profile from './pages/Profile';
import LocationSettings from './pages/LocationSettings';
import StoreList from './pages/StoreList';
import Chat from './pages/Chat';
import ChatRoom from './pages/ChatRoom';
import MyProjects from './pages/MyProjects';
import MyReviews from './pages/MyReviews';
import SearchResults from './pages/SearchResults';
import PortfolioGallery from './pages/PortfolioGallery';
import ResetPassword from './pages/ResetPassword';

function App() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            // Check if already logged in
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Auto-login with dev account
                await supabase.auth.signInWithPassword({
                    email: 'lucianose21@gmail.com',
                    password: 'luciano'
                });
            }
            setReady(true);
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { });
        return () => subscription.unsubscribe();
    }, []);

    if (!ready) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)'
            }}>
                <p>Cargando...</p>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding-pro" element={<OnboardingPro />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/directory" element={<Directory />} />
                <Route path="/category/:id" element={<CategoryList />} />
                <Route path="/professional/:id" element={<ProfessionalProfile />} />
                <Route path="/professional/:id/portfolio" element={<PortfolioGallery />} />
                <Route path="/community" element={<Community />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/location-settings" element={<LocationSettings />} />
                <Route path="/store/:categoryId" element={<StoreList />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/chat/:id" element={<ChatRoom />} />
                <Route path="/my-projects" element={<MyProjects />} />
                <Route path="/my-reviews" element={<MyReviews />} />
                <Route path="/search" element={<SearchResults />} />
            </Routes>
        </Router>
    );
}

export default App;
