import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

import CompassIcon from '../components/CompassIcon';

const Welcome = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();


    const handleStart = () => {
        navigate('/auth');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a1628 0%, #0f1f38 50%, #0a1628 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
            >
                {/* Logo icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '24px',
                        background: 'linear-gradient(135deg, #1e3a8a, #172554)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 32px',
                        boxShadow: '0 8px 32px rgba(37,99,235,0.3)'
                    }}
                >
                    <CompassIcon size={48} color="white" />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        color: '#ffffff',
                        marginBottom: '12px',
                        letterSpacing: '-0.5px'
                    }}
                >
                    ConectaObra
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        maxWidth: '280px',
                        margin: '0 auto'
                    }}
                >
                    {t('welcome_subtitle')}
                </motion.p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '320px', marginTop: '60px' }}
            >
                <button
                    className="btn btn-primary w-full"
                    onClick={() => navigate('/auth')}
                    style={{ padding: '16px', fontSize: '16px', borderRadius: '14px' }}
                >
                    {t('welcome_cta')} <ArrowRight size={20} />
                </button>

                <p style={{
                    textAlign: 'center',
                    marginTop: '20px',
                    fontSize: '13px',
                    color: 'var(--text-muted)'
                }}>
                    {t('welcome_subtitle')}
                </p>
            </motion.div>
        </div>
    );
};

export default Welcome;
