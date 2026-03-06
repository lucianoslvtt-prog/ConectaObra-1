import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Store, Users, User, MessageCircle } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

const tabs = [
    { path: '/dashboard', icon: Home, key: 'nav_home' },
    { path: '/directory', icon: Store, key: 'nav_stores' },
    { path: '/community', icon: Users, key: 'nav_community' },
    { path: '/chat', icon: MessageCircle, key: 'nav_chat' },
    { path: '/profile', icon: User, key: 'nav_profile' },
];

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();

    return (
        <nav className="bottom-nav">
            {tabs.map((tab) => (
                <button
                    key={tab.path}
                    className={`bottom-nav-item ${location.pathname === tab.path ? 'active' : ''}`}
                    onClick={() => navigate(tab.path)}
                >
                    <tab.icon size={22} />
                    <span>{t(tab.key)}</span>
                </button>
            ))}
        </nav>
    );
};

export default BottomNav;
