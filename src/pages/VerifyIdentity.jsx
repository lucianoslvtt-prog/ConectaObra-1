import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Shield, Upload, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

const VerifyIdentity = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const dniInputRef = useRef(null);

    const [dniFile, setDniFile] = useState(null);
    const [dniPreview, setDniPreview] = useState(null);
    const [dniUploading, setDniUploading] = useState(false);
    const [dniUploaded, setDniUploaded] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(null); // 'pending', 'approved', 'rejected'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkVerificationStatus();
    }, []);

    const checkVerificationStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/auth'); return; }

            const { data } = await supabase
                .from('identity_verifications')
                .select('status')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data) setCurrentStatus(data.status);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!dniFile) return;
        setDniUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const ext = dniFile.name.split('.').pop();
            const fileName = `${user.id}/dni_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage
                .from('identity-documents')
                .upload(fileName, dniFile, { cacheControl: '3600', upsert: true });
            if (uploadErr) throw uploadErr;

            const { data: signedData } = await supabase.storage
                .from('identity-documents')
                .createSignedUrl(fileName, 60 * 60 * 24 * 365);

            const docUrl = signedData?.signedUrl || fileName;

            const { error: dbErr } = await supabase
                .from('identity_verifications')
                .upsert({
                    user_id: user.id,
                    document_url: docUrl,
                    status: 'pending',
                    submitted_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            if (dbErr) throw dbErr;

            setDniUploaded(true);
            setCurrentStatus('pending');
        } catch (err) {
            console.error('DNI upload error:', err);
            alert(err.message || 'Error al subir el documento');
        } finally {
            setDniUploading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button className="header-back" onClick={() => navigate(-1)}>
                    <ChevronLeft size={22} />
                </button>
                <h1 style={{ fontSize: '20px', fontWeight: '800' }}>{t('verify_menu')}</h1>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ maxWidth: '500px', margin: '0 auto' }}
            >
                {/* Info card */}
                <div className="card" style={{ padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'var(--accent-soft)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <Shield size={28} color="var(--accent)" />
                    </div>
                    <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>
                        {t('verify_menu')}
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {t('verify_menu_desc')}
                    </p>
                </div>

                {/* Already approved */}
                {currentStatus === 'approved' && (
                    <div className="card" style={{
                        padding: '24px', textAlign: 'center',
                        border: '2px solid rgba(34,197,94,0.4)',
                        background: 'rgba(34,197,94,0.08)',
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: 'rgba(34,197,94,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px',
                        }}>
                            <Check size={28} color="#22c55e" />
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: '#22c55e', marginBottom: '8px' }}>
                            ✅ Identidad verificada
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Tu documento ha sido aprobado. Ya tienes la insignia de verificación.
                        </p>
                    </div>
                )}

                {/* Pending review */}
                {(currentStatus === 'pending' || dniUploaded) && !dniFile && currentStatus !== 'approved' && (
                    <div className="card" style={{
                        padding: '24px', textAlign: 'center',
                        border: '2px solid rgba(245,158,11,0.4)',
                        background: 'rgba(245,158,11,0.08)',
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: 'rgba(245,158,11,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px',
                        }}>
                            <Shield size={28} color="#f59e0b" />
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
                            {t('verify_pending')}
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {t('verify_success')}
                        </p>
                    </div>
                )}

                {/* Upload area — show when no status or rejected */}
                {(currentStatus === null || currentStatus === 'rejected') && !dniUploaded && (
                    <>
                        {currentStatus === 'rejected' && (
                            <div className="card" style={{
                                padding: '16px', marginBottom: '16px', textAlign: 'center',
                                border: '1px solid rgba(239,68,68,0.4)',
                                background: 'rgba(239,68,68,0.08)',
                            }}>
                                <p style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                                    Tu documento fue rechazado. Por favor, sube un nuevo documento.
                                </p>
                            </div>
                        )}

                        <input
                            ref={dniInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setDniFile(file);
                                if (file.type.startsWith('image/')) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setDniPreview(reader.result);
                                    reader.readAsDataURL(file);
                                } else {
                                    setDniPreview(null);
                                }
                                e.target.value = '';
                            }}
                            style={{ display: 'none' }}
                        />

                        {!dniFile && (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => dniInputRef.current?.click()}
                                className="card"
                                style={{
                                    width: '100%',
                                    padding: '40px 20px',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', gap: '12px',
                                    cursor: 'pointer',
                                    border: '2px dashed var(--border)',
                                    background: 'var(--bg-secondary)',
                                    transition: 'var(--transition)',
                                }}
                            >
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '50%',
                                    background: 'var(--accent-soft)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Upload size={24} color="var(--accent)" />
                                </div>
                                <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                    {t('verify_upload')}
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    JPG, PNG, PDF
                                </p>
                            </motion.button>
                        )}

                        {dniFile && (
                            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                                {dniPreview && (
                                    <img
                                        src={dniPreview}
                                        alt="DNI Preview"
                                        style={{
                                            width: '100%', maxHeight: '200px',
                                            objectFit: 'contain',
                                            borderRadius: 'var(--radius-sm)',
                                            marginBottom: '12px',
                                            border: '1px solid var(--border)',
                                        }}
                                    />
                                )}
                                {!dniPreview && (
                                    <div style={{
                                        padding: '20px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        marginBottom: '12px',
                                    }}>
                                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>📄 {dniFile.name}</p>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => { setDniFile(null); setDniPreview(null); }}
                                        className="btn"
                                        style={{
                                            flex: 1, padding: '10px', fontSize: '13px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={dniUploading}
                                        className="btn btn-primary"
                                        style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                                    >
                                        {dniUploading ? t('verify_uploading') : t('verify_upload')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default VerifyIdentity;
