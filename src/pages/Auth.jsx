import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, Lock, ArrowRight, ChevronLeft, KeyRound, Phone, ChevronDown, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';
import { isNative } from '../lib/platform';

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

    const handleNativeOAuth = async (provider) => {
        setLoading(true);
        try {
            const { Browser } = await import('@capacitor/browser');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: 'conectaobra://auth/callback',
                    skipBrowserRedirect: true,
                    queryParams: provider === 'google' ? { prompt: 'select_account' } : {},
                },
            });
            if (error) throw error;
            if (data?.url) {
                await Browser.open({ url: data.url, windowName: '_self' });
                // Listen for the app URL callback
                const listener = await Browser.addListener('browserFinished', () => {
                    listener.remove();
                    // Check if we got a session
                    supabase.auth.getSession().then(({ data: { session } }) => {
                        if (session) navigate('/dashboard');
                        setLoading(false);
                    });
                });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (isNative()) {
            return handleNativeOAuth('google');
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard',
                    queryParams: {
                        prompt: 'select_account'
                    }
                },
            });
            if (error) throw error;
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        if (isNative()) {
            return handleNativeOAuth('apple');
        }
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
                // Check for duplicate username
                const { data: existingUsername } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('username', username.trim())
                    .maybeSingle();

                if (existingUsername) {
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

                // Supabase returns a fake success with empty identities for duplicate emails
                // (to prevent email enumeration). Detect this and show proper error.
                if (data?.user?.identities?.length === 0) {
                    setMessage({ type: 'error', text: 'Este correo electrónico ya está registrado. ¿Quieres iniciar sesión?' });
                    setLoading(false);
                    return;
                }

                if (data.session) {
                    navigate(role === 'professional' ? '/onboarding-pro' : '/dashboard');
                    return;
                }

                setMessage({ type: 'success', text: '¡Cuenta creada! Revisa tu email para confirmar tu cuenta.' });
            } else if (mode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.session) navigate('/dashboard');
            }
        } catch (error) {
            // Translate common Supabase errors to Spanish
            let errorMsg = error.message;
            if (/user already registered/i.test(errorMsg) || /already been registered/i.test(errorMsg)) {
                errorMsg = 'Este correo electrónico ya está registrado. ¿Quieres iniciar sesión?';
            } else if (/email.*invalid/i.test(errorMsg)) {
                errorMsg = 'El correo electrónico no es válido.';
            }
            setMessage({ type: 'error', text: errorMsg });
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
                onClick={() => navigate(-1)}
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
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                color: 'var(--text-primary)',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'var(--transition)',
                                fontFamily: 'Inter, sans-serif'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'var(--bg-hover)';
                                e.currentTarget.style.borderColor = 'var(--border-hover)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'var(--bg-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.369 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.109 -17.884 43.989 -14.754 43.989 Z"/>
                                </g>
                            </svg>
                            {loading ? 'Cargando...' : 'Entrar con Google'}
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
