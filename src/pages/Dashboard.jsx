import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Star, Globe, Heart, Shield, Users, Zap, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BottomNav from '../components/BottomNav';
import { featuredTrades, tradeGroups, trades } from '../data/categories';
import { useLanguage } from '../lib/LanguageContext';
import CompassIcon from '../components/CompassIcon';

const langOptions = [
    { code: 'es', label: '🇪🇸 ES' },
    { code: 'en', label: '🇬🇧 EN' },
    { code: 'fr', label: '🇫🇷 FR' },
];

const Dashboard = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [recentPros, setRecentPros] = useState([]);
    const [favPros, setFavPros] = useState([]);
    const [favStores, setFavStores] = useState([]);
    const [showAllTrades, setShowAllTrades] = useState(false);
    const [showAllRecent, setShowAllRecent] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [userLocation, setUserLocation] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(null);
    const navigate = useNavigate();
    const { t, lang, setLang } = useLanguage();

    const translateSpecialty = (specialtyStr) => {
        if (!specialtyStr) return '';
        return specialtyStr.split(',').map(s => {
            const tradeId = s.trim();
            const trade = trades.find(tr => tr.id === tradeId);
            return trade ? (t(trade.tkey) || trade.name) : tradeId;
        }).join(', ');
    };

    const loadRecent = () => {
        try {
            const stored = JSON.parse(localStorage.getItem('recentPros') || '[]');
            // Filter out stale entries with the old hardcoded default name
            const cleaned = stored.filter(p => p.name && p.name !== 'Marcus Thorne');
            if (cleaned.length !== stored.length) {
                localStorage.setItem('recentPros', JSON.stringify(cleaned));
            }
            setRecentPros(cleaned.slice(0, 10));
        } catch { setRecentPros([]); }
    };

    const loadFavorites = () => {
        try {
            setFavPros(JSON.parse(localStorage.getItem('favPros') || '[]'));
        } catch { setFavPros([]); }
        try {
            setFavStores(JSON.parse(localStorage.getItem('favStores') || '[]'));
        } catch { setFavStores([]); }
    };

    const loadUserLocation = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase.from('profiles').select('location').eq('id', user.id).single();
            if (data?.location) {
                const firstZone = data.location.split(',')[0].trim();
                setUserLocation(firstZone);
            }
        } catch { /* ignore */ }
    };

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsLoggedIn(!!user);
        };
        checkAuth();
        loadRecent();
        loadFavorites();
        loadUserLocation();

        const handleSubscriptionRedirects = async () => {
            const params = new URLSearchParams(window.location.search);
            const subSuccess = params.get('subscription');
            const subCancelled = params.get('cancelled');

            if (subSuccess === 'success') {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('professionals').update({ subscription_status: 'active' }).eq('user_id', user.id);
                    alert('¡Pago completado! Tu suscripción Profesional ya está activa.');
                    navigate('/dashboard', { replace: true });
                }
            } else if (subCancelled === 'true') {
                alert('El proceso de suscripción fue cancelado.');
                navigate('/dashboard', { replace: true });
            }
        };
        handleSubscriptionRedirects();

        const onFocus = () => { loadRecent(); loadFavorites(); };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [navigate]);

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <div className="page">
            <div className="page-content">
                {/* Header */}
                <div style={{ padding: '20px 20px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: 'linear-gradient(135deg, #1e3a8a, #172554)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(37,99,235,0.2)'
                            }}>
                                <CompassIcon size={18} color="white" />
                            </div>
                            <h1 style={{ fontSize: '22px', fontWeight: '800' }}>ConectaObra</h1>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Language selector */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowLangMenu(!showLangMenu)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        borderRadius: '20px', padding: '5px 10px',
                                        color: 'var(--text-primary)', cursor: 'pointer',
                                        fontSize: '12px', fontWeight: '600', fontFamily: 'Inter'
                                    }}
                                >
                                    <Globe size={14} color="var(--accent)" />
                                    {langOptions.find(l => l.code === lang)?.label}
                                </button>
                                {showLangMenu && (
                                    <>
                                        <div onClick={() => setShowLangMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            style={{
                                                position: 'absolute', right: 0, top: '100%', marginTop: '6px',
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border-light)',
                                                borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                                zIndex: 50, overflow: 'hidden', minWidth: '100px'
                                            }}
                                        >
                                            {langOptions.map(opt => (
                                                <button
                                                    key={opt.code}
                                                    onClick={() => { setLang(opt.code); setShowLangMenu(false); }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                        width: '100%', padding: '10px 14px',
                                                        background: lang === opt.code ? 'var(--accent-soft)' : 'transparent',
                                                        border: 'none', borderBottom: '1px solid var(--border)',
                                                        color: lang === opt.code ? 'var(--accent)' : 'var(--text-primary)',
                                                        fontSize: '13px', fontWeight: lang === opt.code ? '700' : '500',
                                                        cursor: 'pointer', fontFamily: 'Inter', textAlign: 'left'
                                                    }}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    </>
                                )}
                            </div>
                            {userLocation && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'var(--accent-soft, rgba(37,99,235,0.1))',
                                padding: '5px 12px', borderRadius: '20px',
                                border: '1px solid rgba(37,99,235,0.15)',
                            }}>
                                <span style={{ fontSize: '13px' }}>📍</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                    {t('dash_searching_in')} <strong style={{ color: 'var(--text-primary)' }}>{userLocation}</strong>
                                </span>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="search-bar" style={{ marginTop: '16px' }}>
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder={t('dash_search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>
                </div>

                {/* Hero for non-logged-in users */}
                {isLoggedIn === false && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ padding: '20px 20px 0' }}
                    >
                        <div style={{
                            position: 'relative',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            background: 'linear-gradient(135deg, #0c1a30 0%, #162d50 50%, #1a3a6a 100%)',
                            border: '1px solid rgba(37,99,235,0.2)',
                            padding: '28px 24px 24px',
                        }}>
                            {/* Decorative glow */}
                            <div style={{
                                position: 'absolute', top: '-40px', right: '-40px',
                                width: '160px', height: '160px',
                                background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)',
                                borderRadius: '50%', pointerEvents: 'none',
                            }} />
                            <div style={{
                                position: 'absolute', bottom: '-30px', left: '-20px',
                                width: '120px', height: '120px',
                                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                                borderRadius: '50%', pointerEvents: 'none',
                            }} />

                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <motion.h2
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 }}
                                    style={{
                                        fontSize: '22px', fontWeight: '800', color: '#ffffff',
                                        lineHeight: 1.3, marginBottom: '10px',
                                    }}
                                >
                                    {t('hero_title')}
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    style={{
                                        fontSize: '14px', color: 'rgba(255,255,255,0.7)',
                                        lineHeight: 1.6, marginBottom: '20px', maxWidth: '320px',
                                    }}
                                >
                                    {t('hero_desc')}
                                </motion.p>

                                {/* Value props */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.35 }}
                                    style={{ display: 'flex', gap: '16px', marginBottom: '22px', flexWrap: 'wrap' }}
                                >
                                    {[
                                        { icon: Users, text: t('hero_feat_1'), color: '#60a5fa' },
                                        { icon: Shield, text: t('hero_feat_2'), color: '#34d399' },
                                        { icon: Zap, text: t('hero_feat_3'), color: '#fbbf24' },
                                    ].map((feat, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '8px',
                                                background: `${feat.color}18`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <feat.icon size={14} color={feat.color} />
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
                                                {feat.text}
                                            </span>
                                        </div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Browse by Trade */}
                <div style={{ padding: '28px 20px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '17px', fontWeight: '700' }}>{t('dash_trades')}</h2>
                        <button
                            onClick={() => setShowAllTrades(!showAllTrades)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter' }}
                        >
                            {showAllTrades ? '−' : t('dash_see_all')}
                        </button>
                    </div>

                    {!showAllTrades ? (
                        <div className="grid-3">
                            {featuredTrades.map((cat, i) => (
                                <motion.div
                                    key={cat.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="card card-hover"
                                    onClick={() => navigate(`/category/${cat.id}`)}
                                    style={{ textAlign: 'center', padding: '16px 8px' }}
                                >
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '12px',
                                        background: `${cat.color}20`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 10px'
                                    }}>
                                        <cat.icon size={22} color={cat.color} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        {t(cat.tkey) || cat.name}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {tradeGroups.map((group) => (
                                <div key={group.name}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {t(group.tkey) || group.name}
                                    </h3>
                                    <div className="grid-3" style={{ gap: '8px' }}>
                                        {group.trades.map((cat, i) => (
                                            <motion.div
                                                key={cat.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                className="card card-hover"
                                                onClick={() => navigate(`/category/${cat.id}`)}
                                                style={{ textAlign: 'center', padding: '12px 6px' }}
                                            >
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '10px',
                                                    background: `${cat.color}20`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    margin: '0 auto 8px'
                                                }}>
                                                    <cat.icon size={18} color={cat.color} />
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', lineHeight: 1.3, display: 'block' }}>
                                                    {t(cat.tkey) || cat.name}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pro CTA */}
                <div style={{ padding: '24px 20px 0' }}>
                    <div className="card card-hover" onClick={() => navigate('/onboarding-pro')} style={{
                        background: 'linear-gradient(135deg, #162032, #1a2740)',
                        border: '1px solid var(--border-light)',
                        display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px',
                            background: 'var(--accent-soft)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <Star size={24} color="var(--accent)" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{t('dash_join_pro')}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('dash_join_pro_desc')}</p>
                        </div>
                        <ChevronRight size={20} color="var(--text-muted)" />
                    </div>
                </div>

                {/* Recently Viewed */}
                <div style={{ padding: '24px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '17px', fontWeight: '700' }}>{t('dash_recent')}</h2>
                        {recentPros.length > 3 && (
                            <button
                                onClick={() => setShowAllRecent(!showAllRecent)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter' }}
                            >
                                {showAllRecent ? '−' : t('dash_see_all')}
                            </button>
                        )}
                    </div>
                    {recentPros.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(showAllRecent ? recentPros : recentPros.slice(0, 3)).map((pro) => (
                                <div key={pro.id} className="card card-hover" onClick={() => navigate(`/professional/${pro.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div className="avatar" style={{
                                        background: 'linear-gradient(135deg, #2563eb40, transparent)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                                    }}>
                                        {pro.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '14px', fontWeight: '600' }}>{pro.name || 'Profesional'}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{translateSpecialty(pro.specialty)}</p>
                                    </div>
                                    {pro.rating && <span className="badge badge-blue">{pro.rating} ★</span>}
                                    <ChevronRight size={18} color="var(--text-muted)" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('dash_no_recent')}</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{t('dash_no_recent_desc')}</p>
                        </div>
                    )}
                </div>

                {/* Favorites */}
                <div style={{ padding: '0 20px 24px' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Heart size={18} color="#ef4444" fill="#ef4444" /> {t('fav_title')}
                    </h2>

                    {(favPros.length > 0 || favStores.length > 0) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Favorite Professionals */}
                            {favPros.length > 0 && (
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {t('fav_professionals')}
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                                        {favPros.map(pro => (
                                            <motion.div
                                                key={pro.id}
                                                whileTap={{ scale: 0.97 }}
                                                className="card card-hover"
                                                onClick={() => navigate(`/professional/${pro.id}`)}
                                                style={{ minWidth: '160px', maxWidth: '180px', padding: '14px', flexShrink: 0, cursor: 'pointer' }}
                                            >
                                                <div style={{
                                                    width: '44px', height: '44px', borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #2563eb40, transparent)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '18px', fontWeight: '700', marginBottom: '10px', color: 'var(--accent)'
                                                }}>
                                                    {pro.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <p style={{ fontSize: '13px', fontWeight: '700', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pro.name}</p>
                                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{translateSpecialty(pro.specialty)}</p>
                                                {pro.rating && <span className="badge badge-blue" style={{ fontSize: '11px' }}>{pro.rating} ★</span>}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Favorite Stores */}
                            {favStores.length > 0 && (
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {t('fav_stores')}
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                                        {favStores.map((store, i) => (
                                            <motion.div
                                                key={`${store.categoryId}-${store.id}`}
                                                whileTap={{ scale: 0.97 }}
                                                className="card card-hover"
                                                onClick={() => navigate(`/store/${store.categoryId}`)}
                                                style={{ minWidth: '180px', maxWidth: '200px', padding: '14px', flexShrink: 0, cursor: 'pointer' }}
                                            >
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '10px',
                                                    background: 'rgba(245,158,11,0.12)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    marginBottom: '10px'
                                                }}>
                                                    <Star size={18} color="#f59e0b" />
                                                </div>
                                                <p style={{ fontSize: '13px', fontWeight: '700', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.name}</p>
                                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.address}</p>
                                                {store.rating && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#f59e0b' }}>{store.rating}</span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
                            <Heart size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('fav_no_favorites')}</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{t('fav_no_favorites_desc')}</p>
                        </div>
                    )}
                </div>

                <div style={{ padding: '0 20px 100px' }}>
                    <button
                        className="btn btn-primary w-full"
                        onClick={() => navigate('/directory')}
                        style={{ padding: '16px', fontSize: '15px' }}
                    >
                        {t('dash_search')} <ChevronRight size={18} />
                    </button>
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default Dashboard;
