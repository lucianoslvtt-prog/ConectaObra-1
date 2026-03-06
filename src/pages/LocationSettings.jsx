import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Plus, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

import { spanishLocations } from '../data/locations';

const MAX_LOCATIONS = 6;

const LocationSettings = () => {
    const [locations, setLocations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();
    const { t } = useLanguage();

    // Load saved locations
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('proLocations') || '[]');
        if (saved.length > 0) {
            setLocations(saved);
        }
    }, []);

    const filteredCities = spanishLocations.filter(city =>
        city.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !locations.includes(city)
    );

    const addLocation = (city) => {
        if (locations.length >= MAX_LOCATIONS) return;
        if (locations.includes(city)) return;
        const updated = [...locations, city];
        setLocations(updated);
        setSearchQuery('');
        setShowSearch(false);
    };

    const removeLocation = (city) => {
        setLocations(prev => prev.filter(l => l !== city));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            localStorage.setItem('proLocations', JSON.stringify(locations));

            // Also update Supabase if possible
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const locationStr = locations.join(', ');
                // Save to profiles (always works)
                await supabase.from('profiles').update({
                    location: locationStr
                }).eq('id', user.id);
                // Also save to professionals (best-effort)
                await supabase.from('professionals').update({
                    location: locationStr
                }).eq('user_id', user.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
            navigate(-1);
        }
    };

    return (
        <div className="page">
            <div className="page-content" style={{ paddingBottom: '100px' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="header-back" onClick={() => navigate(-1)}>
                            <ChevronLeft size={22} />
                        </button>
                        <h1 style={{ fontSize: '20px', fontWeight: '800' }}>{t('loc_title')}</h1>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {locations.length}/{MAX_LOCATIONS}
                    </span>
                </div>

                {/* Info */}
                <div style={{ padding: '0 20px 16px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {t('loc_desc')}
                    </p>
                </div>

                {/* Selected locations */}
                <div style={{ padding: '0 20px' }}>
                    <AnimatePresence>
                        {locations.map((city, i) => (
                            <motion.div
                                key={city}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="card"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    marginBottom: '8px', padding: '14px 16px'
                                }}
                            >
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: 'var(--accent-soft)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <MapPin size={16} color="var(--accent)" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '14px', fontWeight: '600' }}>{city}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>España</p>
                                </div>
                                <button
                                    onClick={() => removeLocation(city)}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        background: 'rgba(239,68,68,0.1)', border: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={14} color="#ef4444" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Add location button / search */}
                    {locations.length < MAX_LOCATIONS && (
                        <>
                            {showSearch ? (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                                        <MapPin size={16} style={{
                                            position: 'absolute', left: '14px', top: '50%',
                                            transform: 'translateY(-50%)', color: 'var(--accent)'
                                        }} />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('loc_search_placeholder')}
                                            autoFocus
                                            style={{ paddingLeft: '40px' }}
                                        />
                                        <button
                                            onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                                            style={{
                                                position: 'absolute', right: '10px', top: '50%',
                                                transform: 'translateY(-50%)', background: 'none',
                                                border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Search results */}
                                    {searchQuery.length > 0 && (
                                        <div style={{
                                            maxHeight: '240px', overflowY: 'auto',
                                            borderRadius: 'var(--radius)',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-card)', marginBottom: '12px'
                                        }}>
                                            {filteredCities.length > 0 ? filteredCities.slice(0, 8).map(city => (
                                                <button
                                                    key={city}
                                                    onClick={() => addLocation(city)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        width: '100%', padding: '12px 14px',
                                                        background: 'transparent', border: 'none',
                                                        borderBottom: '1px solid var(--border)',
                                                        color: 'var(--text-primary)', fontSize: '14px',
                                                        cursor: 'pointer', fontFamily: 'Inter', textAlign: 'left'
                                                    }}
                                                >
                                                    <MapPin size={14} color="var(--text-muted)" />
                                                    <span>{city}</span>
                                                    <Plus size={14} color="var(--accent)" style={{ marginLeft: 'auto' }} />
                                                </button>
                                            )) : (
                                                <div style={{ padding: '16px', textAlign: 'center' }}>
                                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('loc_no_results')}</p>
                                                    {searchQuery.length > 1 && (
                                                        <button
                                                            onClick={() => addLocation(searchQuery)}
                                                            className="btn btn-primary"
                                                            style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px' }}
                                                        >
                                                            <Plus size={14} /> {t('loc_add_custom')} "{searchQuery}"
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => setShowSearch(true)}
                                    className="card card-hover"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        width: '100%', padding: '14px 16px', marginBottom: '8px',
                                        border: '2px dashed var(--border)', background: 'transparent',
                                        cursor: 'pointer', color: 'var(--text-secondary)',
                                        fontSize: '14px', fontFamily: 'Inter', textAlign: 'left'
                                    }}
                                >
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: 'var(--accent-soft)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        <Plus size={16} color="var(--accent)" />
                                    </div>
                                    {t('loc_add_btn')}
                                </motion.button>
                            )}
                        </>
                    )}

                    {/* Limit message */}
                    {locations.length >= MAX_LOCATIONS && (
                        <div style={{
                            padding: '12px', borderRadius: 'var(--radius)',
                            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                            marginTop: '8px'
                        }}>
                            <p style={{ fontSize: '12px', color: '#f59e0b', textAlign: 'center' }}>
                                {t('loc_max_reached')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Save button */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                padding: '16px 20px', background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border)',
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'
            }}>
                <button
                    className="btn btn-primary w-full"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: '16px', fontSize: '15px' }}
                >
                    <Check size={18} /> {saving ? '...' : t('loc_save')}
                </button>
            </div>
        </div>
    );
};

export default LocationSettings;
