import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Star, Briefcase, Clock, Phone, Mail, MessageSquare, Heart, X, Send, Shield, Camera, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';
import { trades } from '../data/categories';
import { isOpenNow, formatDaySchedule, DAYS_CONFIG } from '../utils/businessHoursUtils';
import { getLanguageById } from '../utils/languagesUtils';

const defaultPro = {
    name: 'Marcus Thorne',
    specialty: 'Electricista',
    location: 'Madrid, España',
    rating: 4.9,
    reviews: 42,
    experience: 19,
    projects: 42,
    bio: 'Electricista certificado con más de 19 años de experiencia en instalaciones residenciales y comerciales. Especializado en domótica, eficiencia energética y reformas integrales.',
};

const bios = [
    'Profesional con amplia experiencia en el sector. Comprometido con la calidad y la satisfacción del cliente en cada proyecto.',
    'Especialista dedicado con años de experiencia. Me apasiona mi trabajo y cada proyecto es una oportunidad de superarme.',
    'Trabajo profesional garantizado. Con una sólida trayectoria y cientos de clientes satisfechos en toda España.',
];

const portfolioColors = ['#2563eb', '#f59e0b', '#22c55e', '#8b5cf6'];
const portfolioTitles = ['Reforma integral', 'Proyecto residencial', 'Instalación comercial', 'Mantenimiento'];

const ProfessionalProfile = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const [isFav, setIsFav] = useState(false);
    const [contacting, setContacting] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingValue, setRatingValue] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);
    const [reviewImages, setReviewImages] = useState([]);
    const [reviewImagePreviews, setReviewImagePreviews] = useState([]);
    const [lightbox, setLightbox] = useState({ isOpen: false, images: [], currentIndex: 0 });
    const [realReviews, setRealReviews] = useState([]);
    const [realAvgRating, setRealAvgRating] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [hasRated, setHasRated] = useState(false);
    const [dbProfile, setDbProfile] = useState(null);
    const [dbProData, setDbProData] = useState(null);
    const [portfolioImages, setPortfolioImages] = useState([]);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [showFullSchedule, setShowFullSchedule] = useState(false);
    const { t } = useLanguage();

    // Load favorite state
    useEffect(() => {
        try {
            const favs = JSON.parse(localStorage.getItem('favPros') || '[]');
            setIsFav(favs.some(f => f.id === id));
        } catch { setIsFav(false); }
    }, [id]);

    // Load profile from DB and real reviews
    useEffect(() => {
        const load = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) setCurrentUserId(user.id);

                // Load profile from DB (always, for when no state is passed)
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (profileData) setDbProfile(profileData);

                // Load professional data for experience and specific info
                const { data: proData } = await supabase
                    .from('professionals')
                    .select('*')
                    .eq('user_id', id)
                    .maybeSingle();
                if (proData) setDbProData(proData);

                // Load reviews
                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('*')
                    .eq('professional_id', id)
                    .order('created_at', { ascending: false });

                if (reviews && reviews.length > 0) {
                    setRealReviews(reviews);
                    const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
                    setRealAvgRating(avg.toFixed(1));
                    if (user) setHasRated(reviews.some(r => r.reviewer_id === user.id));
                }

                // Load portfolio images
                const { data: images } = await supabase
                    .from('portfolio_images')
                    .select('*')
                    .eq('professional_id', id)
                    .order('is_highlighted', { ascending: false })
                    .order('created_at', { ascending: false });

                if (images) {
                    setPortfolioImages(images);
                }

                // Load verification status
                try {
                    const { data: verif } = await supabase
                        .from('identity_verifications')
                        .select('status')
                        .eq('user_id', id)
                        .maybeSingle();
                    if (verif) setVerificationStatus(verif.status);
                } catch { /* ignore */ }
            } catch { /* ignore */ } finally {
                setPageLoading(false);
            }
        };
        load();
    }, [id]);

    // Get pro data from navigation state, DB, or defaults
    const passedPro = location.state?.pro;
    const isProRole = (dbProfile?.role === 'professional') || (passedPro?.role === 'professional');
    


    const pro = {
        name: passedPro?.name || dbProfile?.full_name || dbProfile?.username || defaultPro.name,
        specialty: isProRole ? (passedPro?.specialty || dbProfile?.specialty || defaultPro.specialty) : null,
        location: passedPro?.location || dbProfile?.location || '',
        languages: isProRole ? (Array.isArray(dbProfile?.languages) ? dbProfile.languages : []) : [],
        rating: realAvgRating || null,
        reviews: realReviews.length || 0,
        experience: isProRole ? (dbProData?.experience_years ?? passedPro?.experience ?? 0) : null,
        projects: isProRole ? (portfolioImages.length || passedPro?.projects || 0) : null,
        bio: isProRole ? (dbProData?.bio || dbProfile?.bio || bios[Math.abs(hashCode(id || '0')) % bios.length]) : null,
        avatar_url: passedPro?.avatar_url || dbProfile?.avatar_url || null,
        cover_url: dbProfile?.cover_url || null,
        role: dbProfile?.role || (passedPro?.role) || 'user',
    };

    // Simple hash for deterministic random from id
    function hashCode(s) {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        return h;
    }

    // Save to recently viewed — only after DB profile has loaded
    useEffect(() => {
        if (!dbProfile) return; // Wait for real data before saving
        try {
            const realName = dbProfile.full_name || dbProfile.username || '';
            if (!realName) return; // Don't save if we still have no name
            const stored = JSON.parse(localStorage.getItem('recentPros') || '[]');
            const filtered = stored.filter(p => p.id !== id);
            const entry = { id, name: realName, specialty: pro.specialty, rating: pro.rating, viewedAt: Date.now() };
            const updated = [entry, ...filtered].slice(0, 10);
            localStorage.setItem('recentPros', JSON.stringify(updated));
        } catch (e) { /* ignore */ }
    }, [id, dbProfile]);

    // Update stale favorites entry with latest data from DB
    useEffect(() => {
        if (!pro.specialty) return;
        try {
            const favs = JSON.parse(localStorage.getItem('favPros') || '[]');
            const idx = favs.findIndex(f => f.id === id);
            if (idx !== -1) {
                favs[idx] = { ...favs[idx], name: pro.name, specialty: pro.specialty, rating: pro.rating, location: pro.location };
                localStorage.setItem('favPros', JSON.stringify(favs));
            }
        } catch { /* ignore */ }
    }, [id, pro.specialty, pro.name, pro.rating, pro.location]);

    const handleReviewImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + reviewImages.length > 4) {
            alert('Puedes adjuntar un máximo de 4 imágenes por reseña.');
            return;
        }
        const newImages = [...reviewImages, ...files];
        setReviewImages(newImages);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setReviewImagePreviews([...reviewImagePreviews, ...newPreviews]);
    };

    const removeReviewImage = (index) => {
        const newImages = [...reviewImages];
        newImages.splice(index, 1);
        setReviewImages(newImages);
        const newPreviews = [...reviewImagePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setReviewImagePreviews(newPreviews);
    };

    const submitRating = async () => {
        if (ratingValue === 0 || !currentUserId) return;
        setSubmittingRating(true);
        try {
            const { data: myProfile } = await supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', currentUserId)
                .single();

            const reviewerName = myProfile?.full_name || myProfile?.username || 'Usuario';

            const imageUrls = [];
            if (reviewImages.length > 0) {
                for (const file of reviewImages) {
                    const ext = file.name.split('.').pop();
                    const fileName = `reviews/${currentUserId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                    const { error: uploadError } = await supabase.storage
                        .from('community-images')
                        .upload(fileName, file, { cacheControl: '3600', upsert: false });
                    
                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from('community-images')
                            .getPublicUrl(fileName);
                        if (urlData?.publicUrl) {
                            imageUrls.push(urlData.publicUrl);
                        }
                    }
                }
            }

            const { data: newReview, error } = await supabase
                .from('reviews')
                .insert({
                    professional_id: id,
                    reviewer_id: currentUserId,
                    rating: ratingValue,
                    comment: ratingComment.trim() || null,
                    reviewer_name: reviewerName,
                    image_urls: imageUrls,
                })
                .select()
                .single();

            if (!error && newReview) {
                setRealReviews(prev => [newReview, ...prev]);
                const allReviews = [newReview, ...realReviews];
                const avg = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length;
                setRealAvgRating(avg.toFixed(1));
                setHasRated(true);
            }
            setShowRatingModal(false);
            setRatingValue(0);
            setRatingComment('');
            setReviewImages([]);
            setReviewImagePreviews([]);
        } catch (e) {
            console.error('Rating error:', e);
        } finally {
            setSubmittingRating(false);
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    size={14}
                    fill={i <= Math.round(rating) ? '#f59e0b' : 'transparent'}
                    color={i <= Math.round(rating) ? '#f59e0b' : 'var(--text-muted)'}
                />
            );
        }
        return stars;
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `hace ${days}d`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `hace ${weeks} sem`;
        return `hace ${Math.floor(days / 30)} mes`;
    };

    if (pageLoading) {
        return (
            <div className="page">
                <div className="page-content" style={{ paddingBottom: '100px' }}>
                    {/* Back button */}
                    <div style={{ padding: '16px 20px' }}>
                        <button className="header-back" onClick={() => navigate(-1)}>
                            <ChevronLeft size={22} />
                        </button>
                    </div>
                    {/* Skeleton */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 24px', gap: '16px' }}>
                        {/* Avatar skeleton */}
                        <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        {/* Name skeleton */}
                        <div style={{ width: '140px', height: '20px', borderRadius: '8px', background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <div style={{ width: '80px', height: '14px', borderRadius: '8px', background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                    {/* Stats row skeleton */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', padding: '16px 20px' }}>
                        {[1,2].map(i => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '48px', height: '28px', borderRadius: '6px', background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                <div style={{ width: '60px', height: '12px', borderRadius: '4px', background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="page">
            <div className="page-content" style={{ paddingBottom: '100px' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button className="header-back" onClick={() => navigate(-1)}>
                        <ChevronLeft size={22} />
                    </button>
                    <motion.button
                        whileTap={{ scale: 1.3 }}
                        onClick={() => {
                            try {
                                const favs = JSON.parse(localStorage.getItem('favPros') || '[]');
                                if (isFav) {
                                    const updated = favs.filter(f => f.id !== id);
                                    localStorage.setItem('favPros', JSON.stringify(updated));
                                } else {
                                    const entry = { id, name: pro.name, specialty: pro.specialty, rating: pro.rating, location: pro.location };
                                    localStorage.setItem('favPros', JSON.stringify([entry, ...favs]));
                                }
                                setIsFav(!isFav);
                            } catch { /* ignore */ }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                    >
                        <Heart size={22} fill={isFav ? '#ef4444' : 'transparent'} color={isFav ? '#ef4444' : 'var(--text-secondary)'} />
                    </motion.button>
                </div>

                {/* Profile header */}
                <div style={{
                    textAlign: 'center', padding: '32px 20px 24px',
                    position: 'relative', overflow: 'hidden',
                    borderRadius: 'var(--radius)',
                    margin: '0 0 0 0',
                    backgroundImage: pro.cover_url ? `url(${pro.cover_url})` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                    {pro.cover_url && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(22,32,50,0.1), rgba(22,32,50,0.55))', zIndex: 0 }} />
                    )}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Avatar - top right corner */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            background: pro.avatar_url ? 'none' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'absolute',
                            top: '-16px',
                            right: '0px',
                            fontSize: '28px',
                            fontWeight: '800',
                            color: 'white',
                            border: '3px solid var(--accent)',
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                    >
                        {pro.avatar_url ? (
                            <img src={pro.avatar_url} alt={pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : pro.name[0]}
                    </motion.div>

                    <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>{pro.name}</h1>
                    {pro.specialty && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '8px', marginTop: '4px' }}>
                            {pro.specialty.split(',').map(s => s.trim()).filter(Boolean).map(specId => {
                                const trade = trades.find(t => t.id === specId || t.name === specId);
                                const displayName = trade ? t(trade.tkey) || trade.name : specId;
                                const color = trade?.color || 'var(--accent)';
                                return (
                                    <span key={specId} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        padding: '4px 10px', borderRadius: '16px',
                                        background: `${color}15`,
                                        color: color,
                                        fontSize: '12px', fontWeight: '600',
                                        border: `1px solid ${color}30`
                                    }}>
                                        {trade && <trade.icon size={12} />}
                                        {displayName}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                    <span className={`badge ${pro.role === 'professional' ? 'badge-blue' : 'badge-green'}`} style={{ marginBottom: '6px', display: 'inline-block' }}>
                        {pro.role === 'professional' ? `🔧 ${t('prof_professional')}` : `👤 ${t('prof_particular')}`}
                    </span>
                    {verificationStatus === 'approved' && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '4px 12px', borderRadius: '16px', marginLeft: '6px',
                            fontSize: '12px', fontWeight: '600',
                            background: 'rgba(34,197,94,0.15)',
                            color: '#22c55e',
                            border: '1px solid rgba(34,197,94,0.3)',
                        }}>
                            <Shield size={12} />
                            ✓ {t('verify_badge')}
                        </span>
                    )}
                    {dbProData?.business_hours && (() => {
                        const status = isOpenNow(dbProData.business_hours, dbProData.timezone || 'Europe/Madrid');
                        return (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '4px 12px', borderRadius: '16px', marginLeft: '6px',
                                fontSize: '12px', fontWeight: '600',
                                background: status.isOpen ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: status.isOpen ? '#22c55e' : '#ef4444',
                                border: `1px solid ${status.isOpen ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            }}>
                                {status.isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
                            </span>
                        );
                    })()}
                    {pro.location && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                            <MapPin size={13} /> {pro.location}
                        </div>
                    )}
                    {pro.languages && pro.languages.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                            {pro.languages.map(langId => {
                                const lang = getLanguageById(langId);
                                if (!lang) return null;
                                return (
                                    <span key={langId} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        padding: '4px 10px', borderRadius: '16px',
                                        background: 'var(--bg-card)', color: 'var(--text-primary)',
                                        fontSize: '12px', fontWeight: '600',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <span>{lang.flag}</span> {lang.name}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    </div>{/* end zIndex wrapper */}
                </div>

                {/* Stats Card - separate from cover */}
                <div style={{ padding: '0 20px', marginTop: '16px' }}>
                    <div className="card" style={{
                        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                        padding: '20px 12px',
                    }}>
                        {isProRole && (
                            <>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent)' }}>{pro.experience}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('pro_years_exp')}</p>
                                </div>
                                <div style={{ width: '1px', height: '36px', background: 'var(--border)' }} />
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent)' }}>{pro.projects}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('prof_projects_label')}</p>
                                </div>
                                <div style={{ width: '1px', height: '36px', background: 'var(--border)' }} />
                            </>
                        )}
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent)' }}>{pro.rating ?? '—'}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('prof_rating')}</p>
                        </div>
                        <div style={{ width: '1px', height: '36px', background: 'var(--border)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent)' }}>{pro.reviews}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('prof_reviews_label')}</p>
                        </div>
                    </div>
                </div>

                {/* Bio - only for professionals */}
                {isProRole && pro.bio && (
                    <div style={{ padding: '24px 20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>{t('pro_about')}</h3>
                        <div className="card" style={{ padding: '16px' }}>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                {pro.bio}
                            </p>
                        </div>
                    </div>
                )}

                {/* Business Hours */}
                {dbProData?.business_hours && (() => {
                    const status = isOpenNow(dbProData.business_hours, dbProData.timezone || 'Europe/Madrid');
                    const now = new Date();
                    const todayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];
                    const todaySlots = dbProData.business_hours[todayKey] || [];
                    return (
                        <div style={{ padding: '0 20px', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>🕐 Horario</h3>
                            <div className="card" style={{ padding: '16px' }}>
                                {/* Status badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        padding: '5px 14px', borderRadius: '20px',
                                        fontSize: '13px', fontWeight: '700',
                                        background: status.isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                        color: status.isOpen ? '#22c55e' : '#ef4444',
                                        border: `1px solid ${status.isOpen ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                    }}>
                                        {status.isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
                                        {status.label && <span style={{ fontWeight: '500', opacity: 0.8 }}>· {status.label}</span>}
                                    </span>
                                </div>
                                {/* Today summary */}
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                        {DAYS_CONFIG.find(d => d.key === todayKey)?.label || 'Hoy'}:
                                    </span>{' '}
                                    {formatDaySchedule(todaySlots)}
                                </div>
                                {/* Expand toggle */}
                                <button
                                    onClick={() => setShowFullSchedule(prev => !prev)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--accent)', fontSize: '12px', fontWeight: '600',
                                        padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px',
                                    }}
                                >
                                    {showFullSchedule ? 'Ocultar ▴' : 'Ver horario completo ▾'}
                                </button>
                                {/* Full schedule table */}
                                <AnimatePresence>
                                    {showFullSchedule && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden', marginTop: '10px' }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {DAYS_CONFIG.map(day => {
                                                    const slots = dbProData.business_hours[day.key] || [];
                                                    const isToday = day.key === todayKey;
                                                    const isClosed = slots.length === 0;
                                                    return (
                                                        <div key={day.key} style={{
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                            padding: '6px 10px', borderRadius: '8px',
                                                            background: isToday ? 'rgba(37,99,235,0.08)' : 'transparent',
                                                        }}>
                                                            <span style={{
                                                                fontSize: '13px',
                                                                fontWeight: isToday ? '700' : '500',
                                                                color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                                                            }}>
                                                                {day.label}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '13px',
                                                                fontWeight: isToday ? '600' : '400',
                                                                color: isClosed ? 'var(--text-muted)' : (isToday ? 'var(--accent)' : 'var(--text-secondary)'),
                                                            }}>
                                                                {formatDaySchedule(slots)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })()}

                {/* Portfolio - only for professionals */}
                {isProRole && (
                    <div style={{ padding: '0 20px', marginBottom: '16px' }}>
                        <div
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: '12px', cursor: 'pointer'
                            }}
                            onClick={() => navigate(`/professional/${id}/portfolio`)}
                        >
                            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{t('pro_portfolio')}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                                <span style={{ fontSize: '13px' }}>{t('pro_see_all')}</span>
                                <ChevronRight size={16} />
                            </div>
                        </div>

                        {portfolioImages.length > 0 ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '8px',
                                borderRadius: 'var(--radius)',
                                overflow: 'hidden'
                            }}>
                                {portfolioImages.slice(0, 4).map((img, i) => (
                                    <motion.div
                                        key={img.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        onClick={() => navigate(`/professional/${id}/portfolio`)}
                                        style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                                    >
                                        {img.image_url && img.image_url.match(/\.(mp4|mov|webm|avi)$/i) ? (
                                            <div style={{
                                                width: '100%', height: '100%', position: 'relative', background: '#000'
                                            }}>
                                                <video
                                                    src={img.image_url}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                <div style={{
                                                    position: 'absolute', inset: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.2)'
                                                }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%',
                                                        background: 'rgba(0,0,0,0.5)', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                                                    }}>
                                                        <div style={{
                                                            width: 0, height: 0,
                                                            borderTop: '6px solid transparent',
                                                            borderBottom: '6px solid transparent',
                                                            borderLeft: '10px solid white',
                                                            marginLeft: '3px'
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%',
                                                backgroundImage: `url(${img.image_url})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }} />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid-2">
                                {portfolioTitles.map((title, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        style={{
                                            height: '120px',
                                            borderRadius: 'var(--radius)',
                                            background: `linear-gradient(135deg, ${portfolioColors[i]}30, ${portfolioColors[i]}10)`,
                                            border: `1px solid ${portfolioColors[i]}30`,
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                            padding: '12px'
                                        }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                            {title}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}



                {/* Reviews */}
                <div style={{ padding: '0 20px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{t('pro_reviews')}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{pro.reviews} total</span>
                        </div>
                    </div>

                    {/* Real reviews from DB */}
                    {realReviews.length > 0 ? (
                        realReviews.map((review, i) => (
                            <div key={review.id} className="card" style={{ marginBottom: '10px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <div
                                        onClick={() => review.reviewer_id && navigate(`/professional/${review.reviewer_id}`)}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '14px', fontWeight: '700', color: 'var(--accent)',
                                            cursor: review.reviewer_id ? 'pointer' : 'default',
                                        }}
                                    >
                                        {(review.reviewer_name || 'U')[0]}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p
                                            onClick={() => review.reviewer_id && navigate(`/professional/${review.reviewer_id}`)}
                                            style={{
                                                fontSize: '13px', fontWeight: '600',
                                                cursor: review.reviewer_id ? 'pointer' : 'default',
                                                color: review.reviewer_id ? 'var(--accent)' : 'var(--text-primary)',
                                            }}
                                        >
                                            {review.reviewer_name || 'Usuario'}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ display: 'flex', gap: '2px' }}>{renderStars(review.rating)}</div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(review.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                {review.comment && (
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: review.image_urls?.length > 0 ? '8px' : '0' }}>{review.comment}</p>
                                )}
                                {review.image_urls && review.image_urls.length > 0 && (
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '8px' }}>
                                        {review.image_urls.map((url, idx) => (
                                            <img
                                                key={idx}
                                                src={url}
                                                alt="Review attachment"
                                                onClick={() => setLightbox({ isOpen: true, images: review.image_urls, currentIndex: idx })}
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', flexShrink: 0, border: '1px solid var(--border)' }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div style={{
                            textAlign: 'center', padding: '40px 20px',
                            color: 'var(--text-muted)'
                        }}>
                            <p style={{ fontSize: '14px' }}>Sin reseñas aún.</p>
                        </div>
                    )}
                </div>

                {/* Rating Modal */}
                <AnimatePresence>
                    {showRatingModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                                zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '20px',
                            }}
                            onClick={() => { setShowRatingModal(false); setReviewImages([]); setReviewImagePreviews([]); }}
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    background: 'var(--bg-secondary)', borderRadius: '20px',
                                    padding: '28px', width: '100%', maxWidth: '380px',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Valorar a {pro.name.split(' ')[0]}</h3>
                                    <button onClick={() => { setShowRatingModal(false); setReviewImages([]); setReviewImagePreviews([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Star selection */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <motion.button
                                            key={star}
                                            whileTap={{ scale: 1.3 }}
                                            onClick={() => setRatingValue(star)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                padding: '4px',
                                            }}
                                        >
                                            <Star
                                                size={36}
                                                fill={star <= ratingValue ? '#f59e0b' : 'transparent'}
                                                color={star <= ratingValue ? '#f59e0b' : 'var(--text-muted)'}
                                                strokeWidth={1.5}
                                            />
                                        </motion.button>
                                    ))}
                                </div>
                                <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                    {ratingValue === 0 ? 'Selecciona una puntuación' : ratingValue <= 2 ? 'Mejorable' : ratingValue <= 3 ? 'Aceptable' : ratingValue === 4 ? 'Muy bien' : 'Excelente'}
                                </p>

                                {/* Comment */}
                                <textarea
                                    value={ratingComment}
                                    onChange={(e) => setRatingComment(e.target.value)}
                                    placeholder="Añade un comentario (opcional)..."
                                    style={{
                                        minHeight: '80px', padding: '12px', fontSize: '14px',
                                        marginBottom: '16px', resize: 'none', width: '100%',
                                        borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)'
                                    }}
                                />

                                {/* Image Previews */}
                                {reviewImagePreviews.length > 0 && (
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
                                        {reviewImagePreviews.map((preview, idx) => (
                                            <div key={idx} style={{ position: 'relative', flexShrink: 0, width: '60px', height: '60px' }}>
                                                <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                                <button
                                                    onClick={() => removeReviewImage(idx)}
                                                    style={{
                                                        position: 'absolute', top: '-4px', right: '-4px', background: 'var(--text-primary)', color: 'var(--bg-primary)',
                                                        border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                    }}
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Toolbar */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                                            <input type="file" accept="image/*" multiple onChange={handleReviewImageSelect} style={{ display: 'none' }} />
                                            <Camera size={18} />
                                        </label>
                                    </div>
                                </div>

                                <button
                                    onClick={submitRating}
                                    disabled={ratingValue === 0 || submittingRating}
                                    className="btn btn-primary w-full"
                                    style={{ padding: '14px', fontSize: '15px', opacity: ratingValue === 0 ? 0.5 : 1 }}
                                >
                                    <Send size={16} /> {submittingRating ? 'Enviando...' : 'Enviar valoración'}
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Contact CTA */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border)',
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'
            }}>
                <button
                    className="btn btn-success w-full"
                    style={{ padding: '16px', fontSize: '15px', opacity: contacting ? 0.6 : 1 }}
                    disabled={contacting}
                    onClick={async () => {
                        setContacting(true);
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) {
                                const { data: refreshData } = await supabase.auth.refreshSession();
                                if (!refreshData?.session) {
                                    navigate('/auth');
                                    return;
                                }
                            }

                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) { navigate('/auth'); return; }

                            // Don't allow messaging yourself
                            if (user.id === id) {
                                setContacting(false);
                                return;
                            }

                            // Check for existing conversation via conversation_participants
                            const { data: myConvs } = await supabase
                                .from('conversation_participants')
                                .select('conversation_id')
                                .eq('user_id', user.id);

                            const myConvIds = (myConvs || []).map(c => c.conversation_id);

                            let existingConvId = null;
                            if (myConvIds.length > 0) {
                                const { data: shared } = await supabase
                                    .from('conversation_participants')
                                    .select('conversation_id')
                                    .eq('user_id', id)
                                    .in('conversation_id', myConvIds)
                                    .limit(1)
                                    .maybeSingle();
                                if (shared) existingConvId = shared.conversation_id;
                            }

                            if (existingConvId) {
                                navigate(`/chat/${existingConvId}`);
                                return;
                            }

                            // Create conversation with the professional
                            // Generate ID client-side to avoid SELECT policy conflict
                            // (SELECT policy checks conversation_participants which don't exist yet)
                            const convId = crypto.randomUUID();
                            const { error } = await supabase
                                .from('conversations')
                                .insert({
                                    id: convId,
                                    poster_name: pro.name,
                                    original_post_content: `${pro.specialty ? pro.specialty.split(',').map(s => { const tr = trades.find(x => x.id === s.trim() || x.name === s.trim()); return tr ? (t(tr.tkey) || tr.name) : s.trim(); }).join(', ') : ''} — ${pro.location}`,
                                    last_message: t('chat_reply_label') || 'Contacto',
                                    last_message_at: new Date().toISOString()
                                });

                            if (error) {
                                console.error('Error creating conversation:', error);
                                alert('Error al crear la conversación: ' + (error.message || 'Error desconocido'));
                                return;
                            }

                            // Add both participants
                            const { error: partError } = await supabase.from('conversation_participants').insert([
                                { conversation_id: convId, user_id: user.id },
                                { conversation_id: convId, user_id: id },
                            ]);
                            if (partError) {
                                console.error('Error adding participants:', partError);
                                alert('Error al añadir participantes: ' + (partError.message || 'Error desconocido'));
                                return;
                            }
                            navigate(`/chat/${convId}`);
                        } catch (e) {
                            console.error('Contact error:', e);
                            alert('Error al contactar: ' + (e.message || 'Error desconocido'));
                        } finally {
                            setContacting(false);
                        }
                    }}
                >
                    <MessageSquare size={18} /> {contacting ? '...' : `Contactar con ${pro.name.split(' ')[0]}`}
                </button>
            </div>
        </div>

            {/* Lightbox for Images */}
            <AnimatePresence>
                {lightbox.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
                            zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <button
                            onClick={() => setLightbox({ ...lightbox, isOpen: false })}
                            style={{
                                position: 'absolute', top: '20px', right: '20px',
                                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                                width: '40px', height: '40px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10
                            }}
                        >
                            <X size={24} />
                        </button>
                        
                        {lightbox.images.length > 1 && (
                            <>
                                <button
                                    onClick={() => setLightbox(prev => ({ ...prev, currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1 }))}
                                    style={{
                                        position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10
                                    }}
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={() => setLightbox(prev => ({ ...prev, currentIndex: prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0 }))}
                                    style={{
                                        position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10
                                    }}
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </>
                        )}
                        
                        <img
                            src={lightbox.images[lightbox.currentIndex]}
                            alt="Reseña"
                            style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain' }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ProfessionalProfile;
