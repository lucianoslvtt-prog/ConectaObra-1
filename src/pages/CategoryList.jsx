import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, Filter, Heart, Search, X, Users } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { trades, getTradeById } from '../data/categories';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

const CategoryList = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const trade = getTradeById(id);
    const { t } = useLanguage();

    const [pros, setPros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locationFilter, setLocationFilter] = useState('');
    const [showLocationFilter, setShowLocationFilter] = useState(false);
    const [favIds, setFavIds] = useState(new Set());

    useEffect(() => {
        loadProfessionals();
        try {
            const favs = JSON.parse(localStorage.getItem('favPros') || '[]');
            setFavIds(new Set(favs.map(f => f.id)));
        } catch { setFavIds(new Set()); }
    }, [id]);

    const loadProfessionals = async () => {
        setLoading(true);
        try {
            // Query profiles where role = 'professional' and specialty contains this trade id
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, specialty, location, languages')
                .eq('role', 'professional')
                .ilike('specialty', `%${id}%`);

            if (!error && data) {
                setPros(data.map(p => ({
                    id: p.id,
                    name: p.full_name || p.username || 'Profesional',
                    avatar_url: p.avatar_url,
                    specialty: p.specialty || '',
                    location: p.location || '',
                    languages: p.languages || '',
                    initial: (p.full_name || p.username || 'P')[0].toUpperCase(),
                })));
            }
        } catch (e) {
            console.error('Error loading professionals:', e);
        } finally {
            setLoading(false);
        }
    };

    // Filter pros by location
    const filteredPros = locationFilter.trim()
        ? pros.filter(p => {
            const query = locationFilter.toLowerCase().trim();
            return p.location.toLowerCase().split(',').some(zone =>
                zone.trim().toLowerCase().includes(query)
            );
        })
        : pros;

    const toggleFav = (pro, e) => {
        e.stopPropagation();
        try {
            const favs = JSON.parse(localStorage.getItem('favPros') || '[]');
            if (favIds.has(pro.id)) {
                const updated = favs.filter(f => f.id !== pro.id);
                localStorage.setItem('favPros', JSON.stringify(updated));
                setFavIds(prev => { const n = new Set(prev); n.delete(pro.id); return n; });
            } else {
                const entry = { id: pro.id, name: pro.name, specialty: pro.specialty, rating: null, location: pro.location };
                localStorage.setItem('favPros', JSON.stringify([entry, ...favs]));
                setFavIds(prev => new Set(prev).add(pro.id));
            }
        } catch { /* ignore */ }
    };

    // Render specialty badges
    const renderSpecialties = (specialtyStr, defaultColor) => {
        if (!specialtyStr) return null;

        // Also keep string return for localStorage
        if (defaultColor === 'string_only') {
            return specialtyStr.split(',').map(s => {
                const tTrade = trades.find(tr => tr.id === s.trim());
                return tTrade ? t(tTrade.tkey) || tTrade.name : s.trim();
            }).join(', ');
        }

        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {specialtyStr.split(',').map(s => {
                    const tradeId = s.trim();
                    if (!tradeId) return null;
                    const tTrade = trades.find(tr => tr.id === tradeId);
                    const name = tTrade ? t(tTrade.tkey) || tTrade.name : tradeId;
                    const color = tTrade ? tTrade.color : (defaultColor || 'var(--accent)');
                    return (
                        <span key={tradeId} style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '2px 8px', borderRadius: '12px',
                            background: `${color}15`,
                            color: color,
                            fontSize: '11px', fontWeight: '600',
                            border: `1px solid ${color}30`
                        }}>
                            {name}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="page">
            <div className="page-content">
                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button className="header-back" onClick={() => navigate(-1)}>
                        <ChevronLeft size={22} />
                    </button>
                    <span style={{ fontSize: '16px', fontWeight: '700' }}>{trade ? t(trade.tkey) || trade.name : 'Categoría'}</span>
                    <button
                        onClick={() => setShowLocationFilter(!showLocationFilter)}
                        style={{
                            background: showLocationFilter ? 'var(--accent)' : 'none',
                            border: 'none',
                            color: showLocationFilter ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Filter size={18} />
                    </button>
                </div>

                {/* Location filter */}
                {showLocationFilter && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ padding: '0 20px 12px' }}
                    >
                        <div style={{ position: 'relative' }}>
                            <MapPin size={16} style={{
                                position: 'absolute', left: '14px', top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--accent)'
                            }} />
                            <input
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                placeholder={t('loc_search_placeholder') || 'Buscar por zona... (ej: Mijas, Málaga)'}
                                autoFocus
                                style={{ paddingLeft: '40px', paddingRight: locationFilter ? '36px' : '12px' }}
                            />
                            {locationFilter && (
                                <button
                                    onClick={() => setLocationFilter('')}
                                    style={{
                                        position: 'absolute', right: '10px', top: '50%',
                                        transform: 'translateY(-50%)', background: 'none',
                                        border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center',
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        {locationFilter && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                {filteredPros.length} profesionales en "{locationFilter}"
                            </p>
                        )}
                    </motion.div>
                )}

                {/* Filter pills */}
                <div style={{ padding: '0 20px 16px', display: 'flex', gap: '8px' }}>
                    {[
                        { label: t('filter_all') || 'Todos', active: !locationFilter },
                        { label: t('filter_near') || 'Mi zona', action: () => setShowLocationFilter(true) },
                    ].map((filter, i) => (
                        <button
                            key={i}
                            onClick={filter.action || (() => { setLocationFilter(''); setShowLocationFilter(false); })}
                            style={{
                                padding: '7px 14px', borderRadius: '20px', border: 'none',
                                background: filter.active ? 'var(--accent)' : 'var(--bg-card)',
                                color: filter.active ? 'white' : 'var(--text-secondary)',
                                fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter'
                            }}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Professionals */}
                <div style={{ padding: '0 20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <p style={{ color: 'var(--text-muted)' }}>{t('loading') || 'Cargando...'}</p>
                        </div>
                    ) : filteredPros.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: 'var(--accent-soft)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 16px'
                            }}>
                                <Users size={24} color="var(--accent)" />
                            </div>
                            <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                                {locationFilter
                                    ? `No hay profesionales en "${locationFilter}"`
                                    : 'Aún no hay profesionales en esta categoría'
                                }
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                {locationFilter
                                    ? 'Prueba buscando otra zona o quita el filtro'
                                    : 'Sé el primero en registrarte como profesional'
                                }
                            </p>
                            {locationFilter && (
                                <button
                                    onClick={() => { setLocationFilter(''); setShowLocationFilter(false); }}
                                    className="btn btn-primary"
                                    style={{ marginTop: '16px', padding: '10px 20px', fontSize: '13px' }}
                                >
                                    Ver todos
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredPros.map((pro, i) => (
                            <motion.div
                                key={pro.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="card card-hover"
                                onClick={() => navigate(`/professional/${pro.id}`, { state: { pro: { ...pro, specialty: pro.specialty } } })}
                                style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '10px' }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '14px',
                                    background: pro.avatar_url
                                        ? 'none'
                                        : `linear-gradient(135deg, ${trade?.color || '#2563eb'}30, ${trade?.color || '#2563eb'}10)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '22px', fontWeight: '700', color: trade?.color || 'var(--accent)',
                                    flexShrink: 0, overflow: 'hidden',
                                }}>
                                    {pro.avatar_url ? (
                                        <img
                                            src={pro.avatar_url}
                                            alt={pro.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = pro.initial; }}
                                        />
                                    ) : (
                                        pro.initial
                                    )}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <p style={{ fontSize: '15px', fontWeight: '700' }}>{pro.name}</p>
                                        <button
                                            onClick={(e) => toggleFav(pro, e)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                        >
                                            <Heart size={16} fill={favIds.has(pro.id) ? '#ef4444' : 'transparent'} color={favIds.has(pro.id) ? '#ef4444' : 'var(--text-muted)'} />
                                        </button>
                                    </div>
                                    {renderSpecialties(pro.specialty, trade?.color)}
                                    {pro.location && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                            <MapPin size={12} color="var(--text-muted)" />
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {pro.location}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default CategoryList;
