import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Star, MessageSquare, Send, CornerDownRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

// Sample reviews for demo (shown when no real reviews exist)
const sampleReviews = [
    { id: 's1', name: 'María García', rating: 5, text: 'Excelente trabajo, muy profesional y puntual. Totalmente recomendado.', time: 'hace 3d', reply: null },
    { id: 's2', name: 'Pedro López', rating: 5, text: 'Realizó un trabajo impecable. Precio justo y acabados perfectos.', time: 'hace 1 sem', reply: null },
    { id: 's3', name: 'Laura Torres', rating: 4, text: 'Buen trabajo en general. Llegó un poco tarde pero el resultado fue muy bueno.', time: 'hace 2 sem', reply: null },
    { id: 's4', name: 'Carlos Ruiz', rating: 5, text: 'Muy contento con el resultado. Sin duda volveré a contratar sus servicios.', time: 'hace 1 mes', reply: null },
];

const MyReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [avgRating, setAvgRating] = useState(0);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Load saved replies from localStorage
            const savedReplies = JSON.parse(localStorage.getItem('reviewReplies') || '{}');

            // Try to load real reviews from Supabase
            const { data: realReviews, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('professional_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && realReviews && realReviews.length > 0) {
                const mapped = realReviews.map(r => ({
                    id: r.id,
                    reviewer_id: r.reviewer_id,
                    name: r.reviewer_name || 'Cliente',
                    rating: r.rating || 5,
                    text: r.comment || r.content || r.text || '',
                    time: formatTime(r.created_at),
                    reply: r.reply || savedReplies[r.id] || null,
                }));
                setReviews(mapped);
                const avg = mapped.reduce((sum, r) => sum + r.rating, 0) / mapped.length;
                setAvgRating(avg.toFixed(1));
            } else {
                // Use sample reviews with saved replies
                const withReplies = sampleReviews.map(r => ({
                    ...r,
                    reply: savedReplies[r.id] || null,
                }));
                setReviews(withReplies);
                const avg = withReplies.reduce((sum, r) => sum + r.rating, 0) / withReplies.length;
                setAvgRating(avg.toFixed(1));
            }
        } catch (e) {
            const savedReplies = JSON.parse(localStorage.getItem('reviewReplies') || '{}');
            const withReplies = sampleReviews.map(r => ({ ...r, reply: savedReplies[r.id] || null }));
            setReviews(withReplies);
            setAvgRating('4.8');
        } finally {
            setLoading(false);
        }
    };

    const handleReply = (reviewId) => {
        if (!replyText.trim()) return;
        const replyObj = { text: replyText.trim(), time: t('chat_now') || 'ahora' };

        // Save reply to localStorage
        const savedReplies = JSON.parse(localStorage.getItem('reviewReplies') || '{}');
        savedReplies[reviewId] = replyObj;
        localStorage.setItem('reviewReplies', JSON.stringify(savedReplies));

        // Update state
        setReviews(prev => prev.map(r =>
            r.id === reviewId ? { ...r, reply: replyObj } : r
        ));
        setReplyText('');
        setReplyingTo(null);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} sem`;
        return `${Math.floor(days / 30)} mes`;
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={14}
                fill={i < Math.round(rating) ? '#f59e0b' : 'transparent'}
                color={i < Math.round(rating) ? '#f59e0b' : 'var(--text-muted)'}
            />
        ));
    };

    const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
        stars,
        count: reviews.filter(r => Math.round(r.rating) === stars).length,
        pct: reviews.length > 0 ? (reviews.filter(r => Math.round(r.rating) === stars).length / reviews.length) * 100 : 0,
    }));

    return (
        <div className="page">
            <div className="page-content" style={{ paddingBottom: '40px' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="header-back" onClick={() => navigate(-1)}>
                        <ChevronLeft size={22} />
                    </button>
                    <h1 style={{ fontSize: '20px', fontWeight: '800' }}>{t('prof_reviews_menu')}</h1>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
                    </div>
                ) : (
                    <>
                        {/* Rating summary */}
                        <div style={{ padding: '0 20px 24px' }}>
                            <div className="card" style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '42px', fontWeight: '800', color: 'var(--accent)', lineHeight: 1 }}>{avgRating}</p>
                                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', margin: '8px 0 4px' }}>
                                        {renderStars(parseFloat(avgRating))}
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{reviews.length} {t('store_reviews')}</p>
                                </div>
                                <div style={{ flex: 1 }}>
                                    {ratingDistribution.map(({ stars, count, pct }) => (
                                        <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '16px', textAlign: 'right' }}>{stars}</span>
                                            <Star size={10} fill="#f59e0b" color="#f59e0b" />
                                            <div style={{ flex: 1, height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '20px' }}>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Review list */}
                        <div style={{ padding: '0 20px' }}>
                            {reviews.map((review, i) => (
                                <motion.div
                                    key={review.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="card"
                                    style={{ marginBottom: '10px', padding: '16px' }}
                                >
                                    {/* Review header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                        <div
                                            onClick={() => review.reviewer_id && navigate(`/professional/${review.reviewer_id}`)}
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '50%',
                                                background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: 'var(--accent)',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {review.name[0]}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p
                                                onClick={() => review.reviewer_id && navigate(`/professional/${review.reviewer_id}`)}
                                                style={{
                                                    fontSize: '14px', fontWeight: '600',
                                                    cursor: 'pointer',
                                                    color: 'var(--accent)',
                                                }}
                                            >
                                                {review.name}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ display: 'flex', gap: '2px' }}>{renderStars(review.rating)}</div>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{review.time}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Review text */}
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        {review.text}
                                    </p>

                                    {/* Existing reply */}
                                    {review.reply && (
                                        <div style={{
                                            marginTop: '12px', marginLeft: '16px', paddingLeft: '12px',
                                            borderLeft: '2px solid var(--accent)',
                                            background: 'var(--accent-soft)', borderRadius: '0 8px 8px 0',
                                            padding: '10px 12px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <CornerDownRight size={12} color="var(--accent)" />
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)' }}>{t('review_your_reply')}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{review.reply.time}</span>
                                            </div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                {review.reply.text}
                                            </p>
                                        </div>
                                    )}

                                    {/* Reply button or form */}
                                    {!review.reply && (
                                        <div style={{ marginTop: '12px' }}>
                                            <AnimatePresence>
                                                {replyingTo === review.id ? (
                                                    <motion.div
                                                        key="form"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <div style={{
                                                            display: 'flex', gap: '8px', alignItems: 'flex-end',
                                                            background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
                                                            padding: '10px'
                                                        }}>
                                                            <textarea
                                                                value={replyText}
                                                                onChange={(e) => setReplyText(e.target.value)}
                                                                placeholder={t('review_reply_placeholder')}
                                                                autoFocus
                                                                style={{
                                                                    flex: 1, minHeight: '50px', padding: '8px',
                                                                    fontSize: '13px', background: 'var(--bg-card)',
                                                                    border: '1px solid var(--border)', borderRadius: '8px',
                                                                    resize: 'none', color: 'var(--text-primary)',
                                                                    fontFamily: 'Inter, sans-serif'
                                                                }}
                                                            />
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <button
                                                                    onClick={() => handleReply(review.id)}
                                                                    disabled={!replyText.trim()}
                                                                    style={{
                                                                        width: '36px', height: '36px', borderRadius: '50%',
                                                                        background: replyText.trim() ? 'var(--accent)' : 'var(--bg-card)',
                                                                        border: 'none', display: 'flex', alignItems: 'center',
                                                                        justifyContent: 'center', cursor: replyText.trim() ? 'pointer' : 'default'
                                                                    }}
                                                                >
                                                                    <Send size={14} color={replyText.trim() ? 'white' : 'var(--text-muted)'} />
                                                                </button>
                                                                <button
                                                                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                                    style={{
                                                                        background: 'none', border: 'none',
                                                                        fontSize: '11px', color: 'var(--text-muted)',
                                                                        cursor: 'pointer', fontFamily: 'Inter'
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                                                        style={{
                                                            background: 'none', border: 'none',
                                                            color: 'var(--accent)', fontSize: '12px', fontWeight: '600',
                                                            cursor: 'pointer', fontFamily: 'Inter',
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            padding: '4px 0'
                                                        }}
                                                    >
                                                        <MessageSquare size={14} /> {t('review_reply_btn')}
                                                    </button>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MyReviews;
