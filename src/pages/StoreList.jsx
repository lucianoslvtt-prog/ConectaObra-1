import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, Star, Phone, Clock, Navigation, Heart } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useLanguage } from '../lib/LanguageContext';
import { supabase } from '../lib/supabase';

// Map from route categoryId to store- specialty ids
const categoryMap = {
    hardware:   'store-hardware',
    materials:  'store-materials',
    plumbing:   'store-plumbing',
    wood:       'store-wood',
    aluminum:   'store-aluminum',
    electrical: 'store-electrical',
    paint:      'store-paint',
    iron:       'store-iron',
};

const categoryNames = {
    hardware:   'Ferretería',
    materials:  'Materiales de obra',
    plumbing:   'Fontanería',
    wood:       'Maderas',
    aluminum:   'Aluminio',
    electrical: 'Electricidad',
    paint:      'Pinturas',
    iron:       'Hierros',
};

const StoreList = () => {
    const navigate = useNavigate();
    const { categoryId } = useParams();
    const { t } = useLanguage();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [favIds, setFavIds] = useState(new Set());

    useEffect(() => {
        try {
            const favs = JSON.parse(localStorage.getItem('favStores') || '[]');
            setFavIds(new Set(favs.map(f => `${f.categoryId}-${f.id}`)));
        } catch { setFavIds(new Set()); }
    }, []);

    useEffect(() => {
        loadStores();
    }, [categoryId]);

    const loadStores = async () => {
        setLoading(true);
        try {
            const specialtyId = categoryMap[categoryId];
            if (!specialtyId) { setStores([]); setLoading(false); return; }

            const { data, error } = await supabase
                .from('professionals')
                .select(`
                    id, full_name, phone, location, bio, business_hours,
                    profiles:user_id ( username, avatar_url, full_name )
                `)
                .ilike('specialty', `%${specialtyId}%`);

            if (!error && data) {
                setStores(data.map(s => ({
                    id: s.id,
                    name: s.full_name || s.profiles?.full_name || s.profiles?.username || 'Tienda',
                    address: s.location || '',
                    phone: s.phone || '',
                    rating: null,
                    reviews: 0,
                    hours: s.business_hours || '',
                    distance: '',
                })));
            }
        } catch (e) {
            console.error('Error loading stores:', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleFav = (store, e) => {
        e.stopPropagation();
        try {
            const favs = JSON.parse(localStorage.getItem('favStores') || '[]');
            const key = `${categoryId}-${store.id}`;
            if (favIds.has(key)) {
                const updated = favs.filter(f => !(f.categoryId === categoryId && f.id === store.id));
                localStorage.setItem('favStores', JSON.stringify(updated));
                setFavIds(prev => { const n = new Set(prev); n.delete(key); return n; });
            } else {
                const entry = { id: store.id, categoryId, name: store.name, address: store.address, rating: store.rating };
                localStorage.setItem('favStores', JSON.stringify([entry, ...favs]));
                setFavIds(prev => new Set(prev).add(key));
            }
        } catch { /* ignore */ }
    };

    const categoryName = categoryNames[categoryId] || 'Tienda';

    if (loading) {
        return (
            <div className="page">
                <div className="page-content" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Cargando tiendas...</p>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-content">
                {/* Header */}
                <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <button className="header-back" onClick={() => navigate(-1)}>
                            <ChevronLeft size={22} />
                        </button>
                        <h1 style={{ fontSize: '20px', fontWeight: '800' }}>{categoryName}</h1>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '34px' }}>
                        {stores.length} {stores.length === 1 ? 'tienda encontrada' : 'tiendas encontradas'}
                    </p>
                </div>

                {/* Store list */}
                <div style={{ padding: '8px 20px 100px' }}>
                    {stores.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)' }}>
                            <p style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</p>
                            <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Sin tiendas aún</p>
                            <p style={{ fontSize: '14px' }}>Sé el primero en publicar tu tienda en esta categoría.</p>
                        </div>
                    ) : (
                        stores.map((store, i) => (
                            <motion.div
                                key={store.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="card"
                                style={{ marginBottom: '12px', padding: '18px' }}
                            >
                                {/* Store name & rating */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{store.name}</h3>
                                        {store.address ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                <MapPin size={13} /> {store.address}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        {store.rating !== null && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245,158,11,0.15)', padding: '4px 10px', borderRadius: '20px' }}>
                                                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b' }}>{store.rating}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => toggleFav(store, e)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Heart size={18} fill={favIds.has(`${categoryId}-${store.id}`) ? '#ef4444' : 'transparent'} color={favIds.has(`${categoryId}-${store.id}`) ? '#ef4444' : 'var(--text-muted)'} />
                                        </button>
                                    </div>
                                </div>

                                {/* Info row */}
                                {(store.hours || store.distance || store.reviews > 0) && (
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {store.hours && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {store.hours}</span>}
                                        {store.distance && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation size={12} /> {store.distance}</span>}
                                        {store.reviews > 0 && <span>{store.reviews} {t('store_reviews')}</span>}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {store.phone ? (
                                        <a href={`tel:${store.phone.replace(/\s/g, '')}`} className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>
                                            <Phone size={14} /> {t('store_call')}
                                        </a>
                                    ) : (
                                        <div className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: '13px', opacity: 0.4, cursor: 'not-allowed' }}>
                                            <Phone size={14} /> {t('store_call')}
                                        </div>
                                    )}
                                    {store.address ? (
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-outline"
                                            style={{ flex: 1, padding: '10px', fontSize: '13px', textDecoration: 'none', textAlign: 'center' }}
                                        >
                                            <MapPin size={14} /> {t('store_directions')}
                                        </a>
                                    ) : (
                                        <div className="btn btn-outline" style={{ flex: 1, padding: '10px', fontSize: '13px', opacity: 0.4, cursor: 'not-allowed', textAlign: 'center' }}>
                                            <MapPin size={14} /> {t('store_directions')}
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

export default StoreList;
