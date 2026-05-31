import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, Search, Heart, Users } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { trades } from '../data/categories';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [pros, setPros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(query);
    const [favIds, setFavIds] = useState(new Set());

    useEffect(() => {
        if (query) searchProfessionals(query);
        try {
            const favs = JSON.parse(localStorage.getItem('favPros') || '[]');
            setFavIds(new Set(favs.map(f => f.id)));
        } catch { setFavIds(new Set()); }
    }, [query]);

    const searchProfessionals = async (q) => {
        setLoading(true);
        try {
            // Search professionals by location (zone) or name
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, specialty, location, languages')
                .eq('role', 'professional');

            if (!error && data) {
                const lower = q.toLowerCase();
                const filtered = data.filter(p => {
                    const name = (p.full_name || p.username || '').toLowerCase();
                    const loc = (p.location || '').toLowerCase();
                    const spec = (p.specialty || '').toLowerCase();
                    return loc.split(',').some(zone => zone.trim().includes(lower)) ||
                        name.includes(lower) ||
                        spec.includes(lower);
                });

                setPros(filtered.map(p => ({
                    id: p.id,
                    name: p.full_name || p.username || 'Profesional',
                    avatar_url: p.avatar_url,
                    specialty: p.specialty || '',
                    location: p.location || '',
                    initial: (p.full_name || p.username || 'P')[0].toUpperCase(),
                })));
            }
        } catch (e) {
            console.error('Search error:', e);
        } finally {
            setLoading(false);
        }
    };

    const renderSpecialties = (specialtyStr, defaultColor) => {
        if (!specialtyStr) return null;

        // Also keep string return for localStorage/navigation state
        if (defaultColor === 'string_only') {
            return specialtyStr.split(',').map(s => {
                const tr = trades.find(x => x.id === s.trim());
                return tr ? (t(tr.tkey) || tr.name) : s.trim();
            }).join(', ');
        }

        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {specialtyStr.split(',').map(s => {
                    const tradeId = s.trim();
                    if (!tradeId) return null;
                    const tr = trades.find(x => x.id === tradeId);
                    const name = tr ? (t(tr.tkey) || tr.name) : tradeId;
                    const color = tr ? tr.color : (defaultColor || 'var(--accent)');
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

    const toggleFav = (pro, e) => {
        e.stopPropagation();
        try {
            const favs = JSON.parse(localStorage.getItem('favPros') || '[]');
            if (favIds.has(pro.id)) {
                const updated = favs.filter(f => f.id !== pro.id);
                localStorage.setItem('favPros', JSON.stringify(updated));
                setFavIds(prev => { const n = new Set(prev); n.delete(pro.id); return n; });
            } else {
                const entry = { id: pro.id, name: pro.name, specialty: pro.specialty, location: pro.location };
                localStorage.setItem('favPros', JSON.stringify([entry, ...favs]));
                setFavIds(prev => new Set(prev).add(pro.id));
            }
        } catch { /* ignore */ }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchInput.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`, { replace: true });
        }
    };

    return (
        <div className="page">
            <div className="page-content">
                {/* Header */}
                <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <button className="header-back" onClick={() => navigate(-1)}>
                            <ChevronLeft size={22} />
                        </button>
                        <h1 style={{ fontSize: '18px', fontWeight: '800' }}>
                            {t('search_results') || 'Resultados'}
                        </h1>
                    </div>
                    <div className="search-bar">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={handleSearch}
                            placeholder={t('dash_search') || 'Buscar profesional o zona...'}
                        />
                    </div>
                    {query && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '10px' }}>
                            {pros.length} {pros.length === 1 ? 'profesional' : 'profesionales'} para "{query}"
                        </p>
                    )}
                </div>

                {/* Results */}
                <div style={{ padding: '0 20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <p style={{ color: 'var(--text-muted)' }}>{t('loading') || 'Buscando...'}</p>
                        </div>
                    ) : pros.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: 'var(--accent-soft)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 16px'
                            }}>
                                <Users size={24} color="var(--accent)" />
                            </div>
                            <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                                No se encontraron profesionales
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                Prueba buscando otra zona o especialidad
                            </p>
                        </div>
                    ) : (
                        pros.map((pro, i) => {
                            const firstTradeId = pro.specialty?.split(',')[0]?.trim();
                            const trade = trades.find(tr => tr.id === firstTradeId);
                            const color = trade?.color || '#2563eb';
                            return (
                                <motion.div
                                    key={pro.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="card card-hover"
                                    onClick={() => navigate(`/professional/${pro.id}`, { state: { pro: { ...pro, specialty: renderSpecialties(pro.specialty, 'string_only') } } })}
                                    style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '10px' }}
                                >
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '14px',
                                        background: pro.avatar_url ? 'none' : `linear-gradient(135deg, ${color}30, ${color}10)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '22px', fontWeight: '700', color: color,
                                        flexShrink: 0, overflow: 'hidden',
                                    }}>
                                        {pro.avatar_url ? (
                                            <img
                                                src={pro.avatar_url}
                                                alt={pro.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = pro.initial; }}
                                            />
                                        ) : pro.initial}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <p style={{ fontSize: '15px', fontWeight: '700' }}>{pro.name}</p>
                                            <button
                                                onClick={(e) => toggleFav(pro, e)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                            >
                                                <Heart size={16} fill={favIds.has(pro.id) ? '#ef4444' : 'transparent'} color={favIds.has(pro.id) ? '#ef4444' : 'var(--text-muted)'} />
                                            </button>
                                        </div>
                                        {renderSpecialties(pro.specialty, color)}
                                        {pro.location && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={12} color="var(--text-muted)" />
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{pro.location}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default SearchResults;
