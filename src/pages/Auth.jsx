import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, Lock, ArrowRight, ChevronLeft, KeyRound, Phone, ChevronDown, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

const phonePrefixes = [
    { code: '+34', country: 'España', flag: '🇪🇸' },
    { code: '+33', country: 'Francia', flag: '🇫🇷' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
    { code: '+49', country: 'Alemania', flag: '🇩🇪' },
    { code: '+39', country: 'Italia', flag: '🇮🇹' },
    { code: '+1', country: 'EE.UU. / Canadá', flag: '🇺🇸' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+212', country: 'Marruecos', flag: '🇲🇦' },
    { code: '+213', country: 'Argelia', flag: '🇩🇿' },
    { code: '+40', country: 'Rumanía', flag: '🇷🇴' },
    { code: '+380', country: 'Ucrania', flag: '🇺🇦' },
    { code: '+48', country: 'Polonia', flag: '🇵🇱' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+81', country: 'Japón', flag: '🇯🇵' },
    { code: '+82', country: 'Corea del Sur', flag: '🇰🇷' },
];

const Auth = () => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Phone auth state
    const [phonePrefix, setPhonePrefix] = useState('+34');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showPrefixDropdown, setShowPrefixDropdown] = useState(false);
    const [prefixSearch, setPrefixSearch] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [phoneLoading, setPhoneLoading] = useState(false);
    const otpRefs = useRef([]);

    const navigate = useNavigate();
    const { t } = useLanguage();

    // ─── Social login ───
    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard',
                },
            });
            if (error) throw error;
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
                options: {
                    redirectTo: window.location.origin + '/dashboard',
                },
            });
            if (error) throw error;
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        }
    };

    // ─── Phone login ───
    const handleSendOtp = async () => {
        const fullPhone = phonePrefix + phoneNumber.replace(/\s/g, '');
        if (!phoneNumber.trim()) return;
        setPhoneLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: fullPhone,
            });
            if (error) throw error;
            setOtpSent(true);
            setMessage({ type: 'success', text: t('auth_phone_sent') });
        } catch (error) {
            setMessage({ type: 'error', text: error.message || t('auth_phone_error') });
        } finally {
            setPhoneLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const code = otpCode.join('');
        if (code.length !== 6) return;
        const fullPhone = phonePrefix + phoneNumber.replace(/\s/g, '');
        setPhoneLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone: fullPhone,
                token: code,
                type: 'sms',
            });
            if (error) throw error;
            if (data.session) navigate('/dashboard');
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setPhoneLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) value = value[0];
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otpCode];
        newOtp[index] = value;
        setOtpCode(newOtp);
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // ─── Email auth ───
    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (mode === 'register') {
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

                if (data.session) {
                    navigate(role === 'professional' ? '/onboarding-pro' : '/dashboard');
                    return;
                }

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

    const filteredPrefixes = phonePrefixes.filter(p =>
        p.country.toLowerCase().includes(prefixSearch.toLowerCase()) ||
        p.code.includes(prefixSearch)
    );

    const selectedPrefix = phonePrefixes.find(p => p.code === phonePrefix) || phonePrefixes[0];

    // ─── Forgot password screen ───
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

    // ─── Main auth screen ───
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
                <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
                    {mode === 'register' ? t('auth_register_title') : t('auth_login_title')}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
                    {mode === 'register' ? t('auth_switch_login') : t('auth_switch_register')}
                </p>

                {/* Message */}
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            padding: '12px 16px',
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

                {/* ── Social login buttons ── */}
                {mode !== 'register' && (
                    <div style={{ marginBottom: '24px' }}>
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px 20px',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '15px',
                                fontWeight: '600',
                                fontFamily: 'Inter, sans-serif',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                marginBottom: '10px',
                                transition: 'var(--transition)',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {t('auth_social_google')}
                        </button>



                        {/* Divider */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '16px',
                            margin: '24px 0',
                        }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {t('auth_or_email')}
                            </span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                        </div>
                    </div>
                )}

                {/* ── Email/Password form ── */}
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

                {/* Switch login/register */}
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage({ type: '', text: '' }); }}
                        style={{
                            background: 'none', border: 'none',
                            color: 'var(--accent)', fontSize: '14px',
                            fontWeight: '600', cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        {mode === 'login' ? t('auth_switch_register') : t('auth_switch_login')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
