import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, ChevronRight, Hammer, Store, Droplets, TreePine, Square, Zap, Paintbrush, CircleDot } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useLanguage } from '../lib/LanguageContext';

const stores = [
    { id: 'hardware', name: 'Ferretería', tkey: 'store_hardware', dkey: 'store_hardware_desc', icon: Hammer, color: '#f59e0b', count: 42 },
    { id: 'materials', name: 'Materiales de obra', tkey: 'store_materials', dkey: 'store_materials_desc', icon: Store, color: '#8b5cf6', count: 38 },
    { id: 'plumbing', name: 'Fontanería', tkey: 'store_plumbing', dkey: 'store_plumbing_desc', icon: Droplets, color: '#22c55e', count: 27 },
    { id: 'wood', name: 'Maderas', tkey: 'store_wood', dkey: 'store_wood_desc', icon: TreePine, color: '#a16207', count: 19 },
    { id: 'aluminum', name: 'Aluminio', tkey: 'store_aluminum', dkey: 'store_aluminum_desc', icon: Square, color: '#64748b', count: 15 },
    { id: 'electrical', name: 'Electricidad', tkey: 'store_electrical', dkey: 'store_electrical_desc', icon: Zap, color: '#ef4444', count: 31 },
    { id: 'paint', name: 'Pinturas', tkey: 'store_paint', dkey: 'store_paint_desc', icon: Paintbrush, color: '#3b82f6', count: 24 },
    { id: 'iron', name: 'Hierros', tkey: 'store_iron', dkey: 'store_iron_desc', icon: CircleDot, color: '#78716c', count: 12 },
];

const Directory = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const { t } = useLanguage();

    const filtered = stores.filter(s =>
        (t(s.tkey) || s.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        t(s.dkey).toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="page">
            <div className="page-content">
                {/* Header */}
                <div style={{ padding: '20px 20px 0' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px' }}>{t('dir_title')}</h1>

                    {/* Search */}
                    <div className="search-bar">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder={t('dir_search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Store categories */}
                <div style={{ padding: '20px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        {filtered.length} {t('dir_categories')}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filtered.map((store, i) => (
                            <motion.div
                                key={store.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="card card-hover"
                                onClick={() => navigate(`/store/${store.id}`)}
                                style={{ display: 'flex', gap: '14px', alignItems: 'center' }}
                            >
                                <div style={{
                                    width: '52px', height: '52px', borderRadius: '14px',
                                    background: `${store.color}18`,
                                    border: `1px solid ${store.color}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <store.icon size={24} color={store.color} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '15px', fontWeight: '700', marginBottom: '3px' }}>{t(store.tkey) || store.name}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t(store.dkey)}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MapPin size={11} color="var(--text-muted)" />
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{store.count} {t('store_near')}</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} color="var(--text-muted)" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default Directory;
