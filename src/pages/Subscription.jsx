import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Crown, Check, Sparkles, Shield, Star, Zap, TrendingUp, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';
import { isNative } from '../lib/platform';

const Subscription = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [showCancelled, setShowCancelled] = useState(false);

    useEffect(() => {
        if (searchParams.get('cancelled') === 'true') {
            setShowCancelled(true);
            setTimeout(() => setShowCancelled(false), 4000);
        }
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, [searchParams]);

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            // On native, we need the full URL since relative paths don't work
            const apiBase = isNative()
                ? (import.meta.env.VITE_API_URL || 'https://conectaobra.es')
                : '';
            const response = await fetch(`${apiBase}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user?.email,
                    userId: user?.id,
                }),
            });

            const data = await response.json();

            if (data.url) {
                if (isNative()) {
                    // On native, open Stripe Checkout in system browser
                    const { Browser } = await import('@capacitor/browser');
                    await Browser.open({ url: data.url });
                } else {
                    window.location.href = data.url;
                }
            } else {
                throw new Error(data.error || 'Error al crear la sesión de pago');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al conectar con el sistema de pago. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: <Star size={20} />, title: 'Perfil Destacado', desc: 'Aparece primero en las búsquedas del directorio' },
        { icon: <Shield size={20} />, title: 'Insignia Pro Verificada', desc: 'Genera confianza con el sello de profesional verificado' },
        { icon: <TrendingUp size={20} />, title: 'Estadísticas Avanzadas', desc: 'Conoce quién visita tu perfil y cómo te encuentran' },
        { icon: <MessageSquare size={20} />, title: 'Chat Prioritario', desc: 'Responde a clientes con mensajes ilimitados' },
        { icon: <Zap size={20} />, title: 'Publicaciones Destacadas', desc: 'Tus posts en la comunidad tienen mayor visibilidad' },
        { icon: <Sparkles size={20} />, title: 'Portfolio Premium', desc: 'Sube hasta 50 fotos de tus trabajos con galería HD' },
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            paddingBottom: '40px',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border)',
            }}>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="header-back"
                    onClick={() => navigate(-1)}
                >
                    <ChevronLeft size={22} />
                </motion.button>
                <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Suscripción Pro</h1>
            </div>

            {/* Cancelled message */}
            {showCancelled && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                        margin: '16px 20px',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(239,168,68,0.15)',
                        color: '#f0a844',
                        fontSize: '14px',
                        border: '1px solid rgba(239,168,68,0.3)',
                    }}
                >
                    Pago cancelado. Puedes intentarlo de nuevo cuando quieras.
                </motion.div>
            )}

            {/* Hero Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ padding: '20px' }}
            >
                <div style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                    borderRadius: '20px',
                    padding: '32px 24px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative circles */}
                    <div style={{
                        position: 'absolute', top: '-30px', right: '-30px',
                        width: '120px', height: '120px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: '-20px', left: '-20px',
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                    }} />

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        style={{
                            width: '64px', height: '64px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px',
                        }}
                    >
                        <Crown size={32} color="white" />
                    </motion.div>

                    <h2 style={{
                        fontSize: '26px', fontWeight: '800', color: 'white',
                        marginBottom: '8px', position: 'relative',
                    }}>
                        ConectaObra Pro
                    </h2>
                    <p style={{
                        color: 'rgba(255,255,255,0.8)', fontSize: '14px',
                        marginBottom: '24px', lineHeight: 1.5, position: 'relative',
                    }}>
                        Impulsa tu negocio con las herramientas profesionales
                    </p>

                    <div style={{ position: 'relative' }}>
                        <div style={{
                            display: 'flex', alignItems: 'baseline',
                            justifyContent: 'center', gap: '4px', marginBottom: '4px',
                        }}>
                            <span style={{ fontSize: '42px', fontWeight: '800', color: 'white' }}>9,99€</span>
                            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>/mes</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                            Cancela cuando quieras · Sin permanencia
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Features */}
            <div style={{ padding: '0 20px' }}>
                <h3 style={{
                    fontSize: '16px', fontWeight: '700',
                    marginBottom: '16px', color: 'var(--text-primary)',
                }}>
                    Todo lo que incluye
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * index + 0.3 }}
                            style={{
                                display: 'flex', gap: '14px', alignItems: 'flex-start',
                                padding: '16px',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
                            }}
                        >
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                color: '#8b5cf6',
                            }}>
                                {feature.icon}
                            </div>
                            <div>
                                <p style={{
                                    fontSize: '15px', fontWeight: '600',
                                    color: 'var(--text-primary)', marginBottom: '4px',
                                }}>
                                    {feature.title}
                                </p>
                                <p style={{
                                    fontSize: '13px', color: 'var(--text-secondary)',
                                    lineHeight: 1.4,
                                }}>
                                    {feature.desc}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* CTA Button */}
            <div style={{
                padding: '24px 20px',
                position: 'sticky',
                bottom: 0,
                background: 'linear-gradient(to top, var(--bg-primary) 80%, transparent)',
            }}>
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubscribe}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '18px',
                        borderRadius: '14px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '700',
                        fontFamily: 'Inter, sans-serif',
                        cursor: loading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        opacity: loading ? 0.7 : 1,
                        boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {loading ? (
                        <span>Conectando con Stripe...</span>
                    ) : (
                        <>
                            <Crown size={20} />
                            Suscribirse por 9,99€/mes
                        </>
                    )}
                </motion.button>
                <p style={{
                    textAlign: 'center', fontSize: '12px',
                    color: 'var(--text-muted)', marginTop: '12px',
                }}>
                    🔒 Pago seguro con Stripe · Cancela en cualquier momento
                </p>
            </div>
        </div>
    );
};

export default Subscription;
