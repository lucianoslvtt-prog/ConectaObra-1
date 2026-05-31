import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, MapPin, Star, Briefcase, Camera, Edit2, ChevronRight, Image, Shield, Trash2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BottomNav from '../components/BottomNav';
import { useLanguage } from '../lib/LanguageContext';
import { trades } from '../data/categories';
import { getLanguageById } from '../utils/languagesUtils';

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [coverUploading, setCoverUploading] = useState(false);
    const [projectCount, setProjectCount] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);
    const [avgRating, setAvgRating] = useState(null);
    const [userId, setUserId] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            // Also try to fetch professional data (best-effort, may not exist)
            let proData = null;
            try {
                const { data: pd } = await supabase
                    .from('professionals')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();
                proData = pd;
            } catch (e) { /* ignore */ }

            const role = data?.role || user.user_metadata?.role || 'user';
            const displayName = data?.full_name || proData?.full_name || data?.username || user.user_metadata?.username || user.email?.split('@')[0];
            const specialty = data?.specialty || proData?.specialty || '';

            setProfile({
                ...(data || {}),
                username: displayName,
                email: user.email,
                role,
                specialty,
                location: proData?.location || data?.location || '',
                experience_years: proData?.experience_years || 0,
            });

            // Load project count
            try {
                const { count } = await supabase
                    .from('community_posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                setProjectCount(count || 0);
            } catch { /* ignore */ }

            // Load review count and average rating
            try {
                const { data: reviewsData, error: revErr } = await supabase
                    .from('reviews')
                    .select('rating')
                    .eq('professional_id', user.id);

                if (!revErr && reviewsData && reviewsData.length > 0) {
                    setReviewCount(reviewsData.length);
                    const avg = reviewsData.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsData.length;
                    setAvgRating(avg.toFixed(1));
                } else {
                    setReviewCount(0);
                    setAvgRating(0);
                }
            } catch {
                setReviewCount(0);
                setAvgRating(0);
            }

            // Load verification status
            try {
                const { data: verif } = await supabase
                    .from('identity_verifications')
                    .select('status')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (verif) setVerificationStatus(verif.status);
            } catch { /* ignore */ }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'ELIMINAR') return;
        setDeletingAccount(true);
        setDeleteError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('No session');

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Error al eliminar la cuenta');

            await supabase.auth.signOut();
            navigate('/');
        } catch (err) {
            setDeleteError(err.message || 'Error al eliminar la cuenta. Inténtalo de nuevo.');
        } finally {
            setDeletingAccount(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAvatarUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const ext = file.name.split('.').pop();
            const fileName = `${user.id}/avatar_${Date.now()}.${ext}`;

            const { error: uploadErr } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (uploadErr) {
                console.error('Upload error:', uploadErr);
                return;
            }

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const avatarUrl = urlData?.publicUrl;
            if (avatarUrl) {
                await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
                setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
            }
        } catch (err) {
            console.error('Avatar upload failed:', err);
        } finally {
            setAvatarUploading(false);
            e.target.value = '';
        }
    };

    const handleCoverUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCoverUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const ext = file.name.split('.').pop();
            const fileName = `${user.id}/cover_${Date.now()}.${ext}`;

            const { error: uploadErr } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (uploadErr) {
                console.error('Upload error:', uploadErr);
                return;
            }

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const coverUrl = urlData?.publicUrl;
            if (coverUrl) {
                await supabase.from('profiles').update({ cover_url: coverUrl }).eq('id', user.id);
                setProfile(prev => ({ ...prev, cover_url: coverUrl }));
            }
        } catch (err) {
            console.error('Cover upload failed:', err);
        } finally {
            setCoverUploading(false);
            e.target.value = '';
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-content">
                {/* Header */}
                <div style={{ padding: '20px 20px 0' }}>
                    <div style={{ marginBottom: '0' }}>
                        <h1 style={{ fontSize: '22px', fontWeight: '800' }}>{t('nav_profile')}</h1>
                    </div>
                </div>

                {/* Profile card */}
                <div style={{ padding: '24px 20px' }}>
                    <div className="card" style={{ 
                        textAlign: 'center', padding: '48px 20px', position: 'relative', overflow: 'hidden', minHeight: '220px',
                        backgroundImage: profile?.cover_url ? `url(${profile.cover_url})` : 'none',
                        backgroundSize: 'cover', backgroundPosition: 'center',
                    }}>
                        {profile?.cover_url && (
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(22, 32, 50, 0.1), rgba(22, 32, 50, 0.55))', zIndex: 0 }} />
                        )}
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCoverUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={() => coverInputRef.current?.click()}
                            disabled={coverUploading}
                            className="card-hover"
                            style={{
                                position: 'absolute', top: '12px', right: '12px', zIndex: 2,
                                background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '50%', width: '32px', height: '32px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', opacity: coverUploading ? 0.5 : 1, backdropFilter: 'blur(4px)'
                            }}
                        >
                            <Image size={16} />
                        </button>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            {/* Languages spoken */}
                        {profile?.languages && Array.isArray(profile.languages) && profile.languages.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
                                {profile.languages.map(langId => {
                                    const info = getLanguageById(langId);
                                    return (
                                        <span key={langId} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            padding: '3px 10px', borderRadius: '14px',
                                            background: 'rgba(37, 99, 235, 0.12)',
                                            border: '1px solid rgba(37, 99, 235, 0.25)',
                                            fontSize: '12px', color: 'var(--text-primary)'
                                        }}>
                                            <span style={{ fontSize: '14px' }}>{info?.flag || '🌐'}</span>
                                            {info?.name || langId}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                        {/* Avatar - top right corner */}
                        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 3 }}>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                style={{ display: 'none' }}
                            />
                            <div style={{
                                width: '65px',
                                height: '65px',
                                borderRadius: '50%',
                                background: profile?.avatar_url ? 'none' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '26px',
                                fontWeight: '800',
                                color: 'white',
                                border: '3px solid var(--accent)',
                                overflow: 'hidden',
                                opacity: avatarUploading ? 0.6 : 1,
                                transition: 'opacity 0.3s',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}>
                                {profile?.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt="Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = profile?.username?.[0]?.toUpperCase() || '?'; }}
                                    />
                                ) : (
                                    profile?.username?.[0]?.toUpperCase() || '?'
                                )}
                            </div>
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={avatarUploading}
                                style={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    right: '-2px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'var(--accent)',
                                    border: '2px solid var(--bg-card)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}>
                                <Camera size={10} color="white" />
                            </button>
                        </div>

                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
                            {profile?.username || 'Usuario'}
                        </h2>
                        {/* Email hidden for privacy */}
                        {profile?.specialty && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '8px' }}>
                                {profile.specialty.split(',').map(s => s.trim()).filter(Boolean).map(specId => {
                                    const trade = trades.find(t => t.id === specId);
                                    return (
                                        <span key={specId} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            padding: '4px 10px', borderRadius: '16px',
                                            background: trade ? `${trade.color}20` : 'var(--accent-soft)',
                                            color: trade?.color || 'var(--accent)',
                                            fontSize: '12px', fontWeight: '600',
                                            border: `1px solid ${trade ? `${trade.color}30` : 'var(--border)'}`
                                        }}>
                                            {trade && <trade.icon size={12} />}
                                            {trade ? t(trade.tkey) || trade.name : specId}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                        <span className="badge badge-blue" style={{ marginTop: '4px' }}>
                            {profile?.role === 'professional' ? `🔧 ${t('prof_professional')}` : `👤 ${t('prof_particular')}`}
                        </span>
                        {profile?.role === 'professional' && (verificationStatus === 'approved' || verificationStatus === 'pending') && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '4px 12px', borderRadius: '16px', marginTop: '8px',
                                fontSize: '12px', fontWeight: '600',
                                background: verificationStatus === 'approved'
                                    ? 'rgba(34,197,94,0.15)'
                                    : 'rgba(245,158,11,0.15)',
                                color: verificationStatus === 'approved'
                                    ? '#22c55e'
                                    : '#f59e0b',
                                border: `1px solid ${verificationStatus === 'approved'
                                    ? 'rgba(34,197,94,0.3)'
                                    : 'rgba(245,158,11,0.3)'}`,
                            }}>
                                <Shield size={12} />
                                {verificationStatus === 'approved' ? `✓ ${t('verify_badge')}` : `⏳ ${t('verify_pending')}`}
                            </span>
                        )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ padding: '0 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: profile?.role === 'professional' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '12px' }}>
                        {profile?.role === 'professional' && (
                            <div className="card" style={{ textAlign: 'center', padding: '16px 4px' }}>
                                <p style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent)' }}>{profile.experience_years || 0}</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('pro_years_exp', 'Años exp.')}</p>
                            </div>
                        )}
                        <div className="card" style={{ textAlign: 'center', padding: '16px 6px' }}>
                            <p style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent)' }}>{projectCount}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('prof_projects_label')}</p>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '16px 6px' }}>
                            <p style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent)' }}>{reviewCount}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('prof_reviews_label')}</p>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '16px 6px' }}>
                            <p style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent)' }}>{avgRating || '—'}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('prof_rating')}</p>
                        </div>
                    </div>
                </div>

                {/* Menu items */}
                <div style={{ padding: '24px 20px' }}>
                    {[
                        { icon: Edit2, label: t('prof_edit'), desc: '', path: profile?.role === 'professional' ? '/onboarding-pro' : '/edit-profile-particular' },
                        { icon: MapPin, label: t('prof_location'), desc: profile?.location || t('prof_location_desc'), path: '/location-settings' },
                        { icon: Star, label: t('prof_reviews_menu'), desc: t('prof_reviews_desc'), path: '/my-reviews' },
                        { icon: Briefcase, label: t('prof_projects_menu'), desc: t('prof_projects_desc'), path: '/my-projects' },
                        ...(profile?.role === 'professional' ? [{ icon: Image, label: 'Mi Portfolio', desc: 'Gestiona y destaca tus imágenes', path: `/professional/${userId}/portfolio` }] : []),

                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="card card-hover"
                            onClick={() => navigate(item.path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                marginBottom: '8px'
                            }}
                        >
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: 'var(--accent-soft)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <item.icon size={18} color="var(--accent)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', fontWeight: '600' }}>{item.label}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.desc}</p>
                            </div>
                            <ChevronRight size={16} color="var(--text-muted)" />
                        </motion.div>
                    ))}
                </div>

                {/* Logout */}
                <div style={{ padding: '0 20px 16px' }}>
                    <button
                        className="btn w-full"
                        onClick={handleLogout}
                        style={{
                            background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.2)',
                            padding: '14px'
                        }}
                    >
                        <LogOut size={18} /> {t('prof_logout')}
                    </button>
                </div>

                {/* Delete Account */}
                <div style={{ padding: '0 20px 100px' }}>
                    <button
                        className="btn w-full"
                        onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(null); }}
                        style={{
                            background: 'rgba(100,116,139,0.08)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(100,116,139,0.15)',
                            padding: '12px',
                            fontSize: '13px',
                        }}
                    >
                        <Trash2 size={15} /> Eliminar cuenta
                    </button>
                </div>

                {/* Delete Account Modal */}
                <AnimatePresence>
                    {showDeleteModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !deletingAccount && setShowDeleteModal(false)}
                            style={{
                                position: 'fixed', inset: 0, zIndex: 9999,
                                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '20px',
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                style={{
                                    background: 'var(--bg-card)', borderRadius: '16px',
                                    padding: '28px 24px', width: '100%', maxWidth: '380px',
                                    border: '1px solid var(--border)',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                                }}
                            >
                                {/* Close button */}
                                <button
                                    onClick={() => !deletingAccount && setShowDeleteModal(false)}
                                    style={{
                                        position: 'absolute', top: '12px', right: '12px',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--text-muted)', padding: '4px',
                                    }}
                                    disabled={deletingAccount}
                                >
                                    <X size={18} />
                                </button>

                                {/* Icon */}
                                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '52px', height: '52px', borderRadius: '50%',
                                        background: 'rgba(239,68,68,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto',
                                    }}>
                                        <AlertTriangle size={26} color="#ef4444" />
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '12px' }}>
                                    ⚠️ ¿Eliminar tu cuenta?
                                </h3>

                                {/* Warning text */}
                                <p style={{
                                    fontSize: '13px', color: 'var(--text-secondary)',
                                    textAlign: 'center', lineHeight: 1.6, marginBottom: '20px',
                                }}>
                                    Esta acción es <strong style={{ color: '#ef4444' }}>permanente e irreversible</strong>.
                                    Tus datos personales, publicaciones, reseñas y archivos serán eliminados.
                                    Los mensajes enviados se anonimizarán.
                                </p>

                                {/* Confirmation input */}
                                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                                    Escribe <span style={{ color: '#ef4444', fontFamily: 'monospace', fontWeight: '700' }}>ELIMINAR</span> para confirmar:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={e => setDeleteConfirmText(e.target.value)}
                                    placeholder="Escribe aquí..."
                                    disabled={deletingAccount}
                                    autoComplete="off"
                                    style={{
                                        width: '100%', padding: '12px 14px', borderRadius: '10px',
                                        border: `1px solid ${deleteConfirmText === 'ELIMINAR' ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                                        background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                        fontSize: '15px', fontFamily: 'monospace', fontWeight: '600',
                                        letterSpacing: '2px', textAlign: 'center',
                                        outline: 'none', marginBottom: '8px',
                                        transition: 'border-color 0.2s',
                                    }}
                                />

                                {/* Error message */}
                                {deleteError && (
                                    <p style={{
                                        fontSize: '12px', color: '#ef4444', textAlign: 'center',
                                        marginBottom: '8px', padding: '8px',
                                        background: 'rgba(239,68,68,0.08)', borderRadius: '8px',
                                    }}>
                                        {deleteError}
                                    </p>
                                )}

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={deletingAccount}
                                        className="btn"
                                        style={{
                                            flex: 1, padding: '12px',
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border)',
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deleteConfirmText !== 'ELIMINAR' || deletingAccount}
                                        className="btn"
                                        style={{
                                            flex: 1, padding: '12px',
                                            background: deleteConfirmText === 'ELIMINAR' ? '#ef4444' : 'rgba(239,68,68,0.15)',
                                            color: deleteConfirmText === 'ELIMINAR' ? 'white' : 'rgba(239,68,68,0.4)',
                                            border: 'none',
                                            opacity: deletingAccount ? 0.6 : 1,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {deletingAccount ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                                <span className="spinner" style={{
                                                    width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                                                    borderTopColor: 'white', borderRadius: '50%',
                                                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                                                }} /> Eliminando...
                                            </span>
                                        ) : (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                                <Trash2 size={14} /> Eliminar mi cuenta
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <BottomNav />
        </div >
    );
};

export default Profile;
