import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';


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
import VerifyIdentity from './pages/VerifyIdentity';

function App() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            // Determine which dev account to use via ?user= query param
            const params = new URLSearchParams(window.location.search);
            const userParam = params.get('user');

            const accounts = {
                '1': { email: 'lucianose21@gmail.com', password: 'luciano' },
                '2': { email: 'lucianoslvtt@gmail.com', password: 'luciano' }
            };

            const account = accounts[userParam] || accounts['1'];

            // Check current session
            const { data: { session } } = await supabase.auth.getSession();

            // If logged in as a different user than requested, sign out first
            if (session && session.user.email !== account.email) {
                await supabase.auth.signOut();
            }

            // Sign in if not already logged in as the correct user
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                await supabase.auth.signInWithPassword({
                    email: account.email,
                    password: account.password
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
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
                <Route path="/verify-identity" element={<VerifyIdentity />} />
            </Routes>
        </Router>
    );
}

export default App;
