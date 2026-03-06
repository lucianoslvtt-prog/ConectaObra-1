import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, Lock, ArrowRight, ChevronLeft, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

const Auth = () => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const navigate = useNavigate();
    const { t } = useLanguage();

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (mode === 'register') {
                // Check if username is already taken
                const { data: existingUser } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('username', username.trim())
                    .maybeSingle();

                if (existingUser) {
                    setMessage({ type: 'error', text: 'Este nombre de usuario ya está en uso. Por favor, elige otro.' });
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username: username.trim(), role }
                    }
                });
                if (error) throw error;

                // If we got a session directly, navigate
                if (data.session) {
                    navigate(role === 'professional' ? '/onboarding-pro' : '/dashboard');
                    return;
                }

                // Otherwise try auto-login immediately
                const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
                if (loginError) {
                    setMessage({ type: 'success', text: '¡Cuenta creada! Revisa tu email para confirmar tu cuenta.' });
                } else if (loginData.session) {
                    navigate(role === 'professional' ? '/onboarding-pro' : '/dashboard');
                }
            } else if (mode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.session) navigate('/dashboard');
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setMessage({ type: 'error', text: t('auth_email') + ' required' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const redirectUrl = window.location.origin + '/reset-password';
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });
            if (error) throw error;
            setMessage({ type: 'success', text: t('auth_forgot_success') });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    // Forgot password screen
    if (mode === 'forgot') {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'var(--bg-primary)',
                padding: '20px',
            }}>
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="header-back"
                    onClick={() => setMode('login')}
                    style={{ marginBottom: '24px', padding: '8px 0' }}
                >
                    <ChevronLeft size={22} />
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '16px',
                        background: 'var(--accent-soft)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '20px'
                    }}>
                        <KeyRound size={28} color="var(--accent)" />
                    </div>

                    <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
                        {t('auth_forgot_title')}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px', lineHeight: 1.5 }}>
                        {t('auth_forgot_desc')}
                    </p>

                    {message.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                padding: '14px 16px',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '20px',
                                fontSize: '14px',
                                background: message.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                color: message.type === 'error' ? '#f87171' : '#4ade80',
                                border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
                            }}
                        >
                            {message.text}
                        </motion.div>
                    )}

                    <form onSubmit={handleForgotPassword}>
                        <div style={{ marginBottom: '24px' }}>
                            <label>{t('auth_email')}</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@ejemplo.com"
                                    style={{ paddingLeft: '44px' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full"
                            style={{ padding: '16px', fontSize: '15px', marginBottom: '16px' }}
                        >
                            {loading ? '...' : t('auth_forgot_btn')}
                            <ArrowRight size={18} />
                        </button>

                        <button
                            type="button"
                            onClick={() => { setMode('login'); setMessage({ type: '', text: '' }); }}
                            style={{
                                width: '100%', padding: '12px',
                                background: 'none', border: 'none',
                                color: 'var(--accent)', fontSize: '14px',
                                fontWeight: '600', cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif'
                            }}
                        >
                            {t('auth_forgot_back')}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            padding: '20px',
        }}>
            {/* Back button */}
            <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="header-back"
                onClick={() => navigate('/')}
                style={{ marginBottom: '24px', padding: '8px 0' }}
            >
                <ChevronLeft size={22} />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>
                    {mode === 'register' ? 'Bienvenido' : 'Bienvenido'}
                </h1>




                {/* Message */}
                {message.text && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '20px',
                        fontSize: '14px',
                        background: message.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                        color: message.type === 'error' ? '#f87171' : '#4ade80',
                        border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth}>
                    {/* Email */}
                    <div style={{ marginBottom: '16px' }}>
                        <label>{t('auth_email')}</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@ejemplo.com"
                                style={{ paddingLeft: '44px' }}
                            />
                        </div>
                    </div>

                    {/* Username - only for register */}
                    {mode === 'register' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label>{t('auth_username')}</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="tu_nombre"
                                    style={{ paddingLeft: '44px' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Password */}
                    <div style={{ marginBottom: mode === 'register' ? '16px' : '8px' }}>
                        <label>{t('auth_password')}</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ paddingLeft: '44px' }}
                            />
                        </div>
                    </div>

                    {/* Forgot password link - only for login */}
                    {mode === 'login' && (
                        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                            <button
                                type="button"
                                onClick={() => { setMode('forgot'); setMessage({ type: '', text: '' }); }}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--accent)', fontSize: '13px',
                                    fontWeight: '600', cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif', padding: '4px 0'
                                }}
                            >
                                {t('auth_forgot')}
                            </button>
                        </div>
                    )}

                    {/* Role selection - only for register */}
                    {mode === 'register' && (
                        <div style={{ marginBottom: '28px' }}>
                            <label>{t('auth_select_role')}</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setRole('user')}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: 'var(--radius)',
                                        border: `2px solid ${role === 'user' ? 'var(--accent)' : 'var(--border)'}`,
                                        background: role === 'user' ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                                        color: role === 'user' ? 'var(--accent)' : 'var(--text-secondary)',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        fontFamily: 'Inter, sans-serif',
                                        cursor: 'pointer',
                                        transition: 'var(--transition)'
                                    }}
                                >
                                    👤 {t('auth_role_user')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('professional')}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: 'var(--radius)',
                                        border: `2px solid ${role === 'professional' ? 'var(--accent)' : 'var(--border)'}`,
                                        background: role === 'professional' ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                                        color: role === 'professional' ? 'var(--accent)' : 'var(--text-secondary)',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        fontFamily: 'Inter, sans-serif',
                                        cursor: 'pointer',
                                        transition: 'var(--transition)'
                                    }}
                                >
                                    🔧 {t('auth_role_pro')}
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full"
                        style={{ padding: '16px', fontSize: '15px' }}
                    >
                        {loading ? '...' : (mode === 'register' ? t('auth_register_btn') : t('auth_login_btn'))}
                        <ArrowRight size={18} />
                    </button>
                </form>
            </motion.div>
        </div >
    );
};

export default Auth;
