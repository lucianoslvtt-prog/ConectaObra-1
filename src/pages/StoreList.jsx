import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, Star, Phone, Clock, ChevronRight, Navigation, Heart } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useLanguage } from '../lib/LanguageContext';

const storeData = {
    hardware: {
        name: 'Ferretería',
        stores: [
            { id: 1, name: 'Ferretería López', address: 'C/ Gran Vía 45, Madrid', rating: 4.8, reviews: 127, phone: '+34 912 345 678', hours: '8:00 - 20:00', distance: '0.8 km' },
            { id: 2, name: 'Bricomart Alcorcón', address: 'Av. de Lisboa s/n, Alcorcón', rating: 4.6, reviews: 342, phone: '+34 916 543 210', hours: '7:00 - 21:00', distance: '5.2 km' },
            { id: 3, name: 'Ferretería El Tornillo', address: 'C/ Atocha 89, Madrid', rating: 4.7, reviews: 89, phone: '+34 913 456 789', hours: '9:00 - 19:30', distance: '1.3 km' },
            { id: 4, name: 'Hiper Ferretería Madrid', address: 'C/ Alcalá 210, Madrid', rating: 4.5, reviews: 203, phone: '+34 917 654 321', hours: '8:30 - 20:30', distance: '3.1 km' },
        ]
    },
    materials: {
        name: 'Materiales de obra',
        stores: [
            { id: 1, name: 'BigMat Getafe', address: 'Pol. Ind. Los Ángeles, Getafe', rating: 4.7, reviews: 256, phone: '+34 916 789 012', hours: '7:00 - 19:00', distance: '8.4 km' },
            { id: 2, name: 'Materiales Ruiz', address: 'C/ Embajadores 156, Madrid', rating: 4.4, reviews: 78, phone: '+34 913 210 987', hours: '8:00 - 18:00', distance: '2.1 km' },
            { id: 3, name: 'Cementos y Áridos Sur', address: 'Ctra. Andalucía km 12, Getafe', rating: 4.6, reviews: 145, phone: '+34 916 543 876', hours: '7:30 - 17:30', distance: '12.0 km' },
            { id: 4, name: 'Almacén San José', address: 'C/ Toledo 78, Madrid', rating: 4.3, reviews: 62, phone: '+34 912 876 543', hours: '8:00 - 19:00', distance: '1.8 km' },
        ]
    },
    plumbing: {
        name: 'Fontanería',
        stores: [
            { id: 1, name: 'Roca Gallery Madrid', address: 'C/ José Abascal 57, Madrid', rating: 4.9, reviews: 312, phone: '+34 913 456 000', hours: '10:00 - 20:00', distance: '2.5 km' },
            { id: 2, name: 'Fontanería Industrial SL', address: 'C/ Bravo Murillo 234, Madrid', rating: 4.5, reviews: 95, phone: '+34 915 678 901', hours: '8:00 - 18:30', distance: '3.7 km' },
            { id: 3, name: 'AquaStore', address: 'Av. de la Albufera 120, Madrid', rating: 4.3, reviews: 67, phone: '+34 914 321 567', hours: '9:00 - 19:00', distance: '4.2 km' },
        ]
    },
    wood: {
        name: 'Maderas',
        stores: [
            { id: 1, name: 'Maderas Abad', address: 'Pol. Ind. Cobo Calleja, Fuenlabrada', rating: 4.8, reviews: 189, phone: '+34 916 420 100', hours: '8:00 - 18:00', distance: '15.3 km' },
            { id: 2, name: 'Tableros y Maderas García', address: 'C/ Méndez Álvaro 44, Madrid', rating: 4.6, reviews: 73, phone: '+34 914 567 890', hours: '8:30 - 17:30', distance: '1.9 km' },
            { id: 3, name: 'Leroy Merlin Majadahonda', address: 'C.C. Equinoccio, Majadahonda', rating: 4.4, reviews: 521, phone: '+34 916 340 200', hours: '9:00 - 21:30', distance: '11.2 km' },
        ]
    },
    aluminum: {
        name: 'Aluminio',
        stores: [
            { id: 1, name: 'Aluminios Cortizo Madrid', address: 'C/ Alcalá 540, Madrid', rating: 4.7, reviews: 134, phone: '+34 917 890 123', hours: '8:00 - 18:00', distance: '6.1 km' },
            { id: 2, name: 'Ventanas y Cerramientos Sol', address: 'C/ Princesa 82, Madrid', rating: 4.5, reviews: 88, phone: '+34 915 432 109', hours: '9:00 - 19:00', distance: '2.8 km' },
            { id: 3, name: 'AluTech Perfiles', address: 'Pol. Ind. Vallecas, Madrid', rating: 4.6, reviews: 56, phone: '+34 913 789 456', hours: '8:00 - 17:00', distance: '7.5 km' },
        ]
    },
    electrical: {
        name: 'Electricidad',
        stores: [
            { id: 1, name: 'Fegime Madrid', address: 'C/ Orense 32, Madrid', rating: 4.8, reviews: 210, phone: '+34 915 678 234', hours: '7:30 - 19:00', distance: '3.3 km' },
            { id: 2, name: 'Electro Stocks Villaverde', address: 'Pol. Ind. Villaverde, Madrid', rating: 4.5, reviews: 165, phone: '+34 917 123 456', hours: '8:00 - 18:30', distance: '9.6 km' },
            { id: 3, name: 'Material Eléctrico Luna', address: 'C/ Luna 19, Madrid', rating: 4.4, reviews: 42, phone: '+34 912 345 111', hours: '9:00 - 18:00', distance: '0.9 km' },
            { id: 4, name: 'Iluminación Pro', address: 'C/ Serrano 88, Madrid', rating: 4.7, reviews: 98, phone: '+34 914 567 222', hours: '10:00 - 20:00', distance: '2.4 km' },
        ]
    },
    paint: {
        name: 'Pinturas',
        stores: [
            { id: 1, name: 'Pinturas Isaval Madrid', address: 'C/ Fuencarral 115, Madrid', rating: 4.6, reviews: 178, phone: '+34 913 210 555', hours: '9:00 - 19:30', distance: '1.6 km' },
            { id: 2, name: 'Montó Pinturas', address: 'Av. de Aragón 312, Madrid', rating: 4.7, reviews: 92, phone: '+34 917 654 888', hours: '8:30 - 19:00', distance: '5.8 km' },
            { id: 3, name: 'ColorPlus Centro', address: 'C/ Mayor 56, Madrid', rating: 4.3, reviews: 35, phone: '+34 912 876 999', hours: '10:00 - 20:00', distance: '0.5 km' },
        ]
    },
    iron: {
        name: 'Hierros',
        stores: [
            { id: 1, name: 'Hierros Alfonso', address: 'Pol. Ind. San Fernando, Madrid', rating: 4.7, reviews: 143, phone: '+34 916 789 333', hours: '7:00 - 17:00', distance: '10.2 km' },
            { id: 2, name: 'Aceros y Perfiles Madrid', address: 'C/ Méndez Álvaro 90, Madrid', rating: 4.5, reviews: 76, phone: '+34 914 321 444', hours: '8:00 - 18:00', distance: '2.3 km' },
            { id: 3, name: 'Corrugados Express', address: 'Ctra. Valencia km 7, Rivas', rating: 4.4, reviews: 58, phone: '+34 916 543 777', hours: '7:30 - 16:30', distance: '13.5 km' },
        ]
    },
};

const StoreList = () => {
    const navigate = useNavigate();
    const { categoryId } = useParams();
    const { t } = useLanguage();
    const category = storeData[categoryId];
    const [favIds, setFavIds] = useState(new Set());

    useEffect(() => {
        try {
            const favs = JSON.parse(localStorage.getItem('favStores') || '[]');
            setFavIds(new Set(favs.map(f => `${f.categoryId}-${f.id}`)));
        } catch { setFavIds(new Set()); }
    }, []);

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

    if (!category) {
        return (
            <div className="page">
                <div className="page-content" style={{ padding: '20px' }}>
                    <button className="header-back" onClick={() => navigate(-1)}>
                        <ChevronLeft size={22} /> Volver
                    </button>
                    <p style={{ color: 'var(--text-muted)', marginTop: '40px', textAlign: 'center' }}>{t('store_not_found')}</p>
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
                        <h1 style={{ fontSize: '20px', fontWeight: '800' }}>{category.name}</h1>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '34px' }}>
                        {category.stores.length} {t('store_found')}
                    </p>
                </div>

                {/* Store list */}
                <div style={{ padding: '8px 20px 100px' }}>
                    {category.stores.map((store, i) => (
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                        <MapPin size={13} /> {store.address}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245,158,11,0.15)', padding: '4px 10px', borderRadius: '20px' }}>
                                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b' }}>{store.rating}</span>
                                    </div>
                                    <button
                                        onClick={(e) => toggleFav(store, e)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <Heart size={18} fill={favIds.has(`${categoryId}-${store.id}`) ? '#ef4444' : 'transparent'} color={favIds.has(`${categoryId}-${store.id}`) ? '#ef4444' : 'var(--text-muted)'} />
                                    </button>
                                </div>
                            </div>

                            {/* Info row */}
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {store.hours}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Navigation size={12} /> {store.distance}
                                </span>
                                <span>{store.reviews} {t('store_reviews')}</span>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <a href={`tel:${store.phone}`} className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>
                                    <Phone size={14} /> {t('store_call')}
                                </a>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline"
                                    style={{ flex: 1, padding: '10px', fontSize: '13px', textDecoration: 'none', textAlign: 'center' }}
                                >
                                    <MapPin size={14} /> {t('store_directions')}
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default StoreList;
