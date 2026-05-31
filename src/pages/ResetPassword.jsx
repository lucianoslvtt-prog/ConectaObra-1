import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const navigate = useNavigate();
    const { t } = useLanguage();

    const recoveryReceived = React.useRef(false);

    useEffect(() => {
        // Listen for PASSWORD_RECOVERY event - only show form when recovery link was clicked
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                recoveryReceived.current = true;
                setSessionReady(true);
                setSessionError(false);
            }
        });

        // If no PASSWORD_RECOVERY event fires within 2.5s, show the expired-link screen
        const timeout = setTimeout(() => {
            if (!recoveryReceived.current) {
                setSessionError(true);
            }
        }, 2500);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const handleReset = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: t('auth_reset_mismatch') });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Mínimo 6 caracteres' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setMessage({ type: 'success', text: t('auth_reset_success') });
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (error) {
            let errorMsg = error.message;
            if (/same password/i.test(errorMsg)) {
                errorMsg = 'La nueva contraseña no puede ser igual a la anterior.';
            } else if (/token.*expired/i.test(errorMsg) || /invalid.*token/i.test(errorMsg)) {
                errorMsg = 'El enlace ha expirado. Por favor, solicita uno nuevo.';
            }
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setLoading(false);
        }
    };


    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '20px' }}>
            <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="header-back"
                onClick={() => navigate('/auth')}
                style={{ marginBottom: '24px', padding: '8px 0' }}
            >
                <ChevronLeft size={22} />
            </motion.button>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

                {/* Cargando sesión */}
                {!sessionReady && !sessionError && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Verificando enlace...</p>
                )}

                {/* Enlace expirado o inválido */}
                {sessionError && (
                    <>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '16px',
                            background: 'rgba(239,68,68,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '20px'
                        }}>
                            <AlertCircle size={28} color="#f87171" />
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
                            Enlace inválido o expirado
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px', lineHeight: 1.5 }}>
                            Este enlace de recuperación ya no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.
                        </p>
                        <button
                            className="btn btn-primary w-full"
                            onClick={() => navigate('/auth')}
                            style={{ padding: '16px', fontSize: '15px' }}
                        >
                            Volver al inicio de sesión
                            <ArrowRight size={18} />
                        </button>
                    </>
                )}

                {/* Formulario (solo si hay sesión válida) */}
                {sessionReady && (
                    <>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '16px',
                            background: 'var(--accent-soft)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '20px'
                        }}>
                            <Lock size={28} color="var(--accent)" />
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
                            {t('auth_reset_title')}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px', lineHeight: 1.5 }}>
                            {t('auth_reset_desc')}
                        </p>

                        {message.text && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    padding: '14px 16px', borderRadius: 'var(--radius-sm)',
                                    marginBottom: '20px', fontSize: '14px',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    background: message.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                    color: message.type === 'error' ? '#f87171' : '#4ade80',
                                    border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
                                }}
                            >
                                {message.type === 'success' && <CheckCircle size={18} />}
                                {message.type === 'error' && <AlertCircle size={18} />}
                                {message.text}
                            </motion.div>
                        )}

                        <form onSubmit={handleReset}>
                            <div style={{ marginBottom: '16px' }}>
                                <label>{t('auth_reset_new_password')}</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        style={{ paddingLeft: '44px' }}
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '28px' }}>
                                <label>{t('auth_reset_confirm')}</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        style={{ paddingLeft: '44px' }}
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary w-full"
                                style={{ padding: '16px', fontSize: '15px' }}
                            >
                                {loading ? '...' : t('auth_reset_btn')}
                                <ArrowRight size={18} />
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default ResetPassword;
