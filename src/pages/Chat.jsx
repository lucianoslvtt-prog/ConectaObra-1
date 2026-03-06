import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BottomNav from '../components/BottomNav';
import { useLanguage } from '../lib/LanguageContext';

const Chat = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUser(user);

            const { data } = await supabase
                .from('conversations')
                .select('*')
                .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
                .order('last_message_at', { ascending: false });

            if (data && data.length > 0) {
                // Get profiles for the other participants
                const otherIds = data.map(c => c.participant_1 === user.id ? c.participant_2 : c.participant_1);
                const uniqueIds = [...new Set(otherIds)];

                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, role')
                    .in('id', uniqueIds);

                const profileMap = {};
                profiles?.forEach(p => profileMap[p.id] = p);

                const enriched = data.map(c => {
                    const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
                    const isSelfChat = c.participant_1 === c.participant_2;
                    const displayUser = isSelfChat && c.poster_name
                        ? { username: c.poster_name, role: 'user' }
                        : (profileMap[otherId] || { username: 'Usuario', role: 'user' });
                    return { ...c, otherUser: displayUser };
                });

                setConversations(enriched);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filtered = conversations.filter(c =>
        c.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('chat_now');
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    return (
        <div className="page">
            <div className="page-content">
                <div style={{ padding: '20px 20px 0' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px' }}>{t('chat_title')}</h1>
                    <div className="search-bar">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder={t('chat_search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ padding: '20px' }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Cargando...</p>
                    ) : filtered.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {filtered.map((conv, i) => (
                                <motion.div
                                    key={conv.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="card card-hover"
                                    onClick={() => navigate(`/chat/${conv.id}`)}
                                    style={{ display: 'flex', gap: '14px', alignItems: 'center' }}
                                >
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        background: conv.otherUser?.role === 'professional'
                                            ? 'linear-gradient(135deg, #22c55e40, #22c55e15)'
                                            : 'linear-gradient(135deg, #2563eb40, #2563eb15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '20px', fontWeight: '700',
                                        color: conv.otherUser?.role === 'professional' ? '#22c55e' : 'var(--accent)',
                                        flexShrink: 0
                                    }}>
                                        {(conv.poster_name || conv.otherUser?.username)?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                                <p style={{ fontSize: '14px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.poster_name || conv.otherUser?.username || 'Usuario'}</p>
                                                {conv.job_status === 'in_progress' && (
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: '700',
                                                        background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40',
                                                        whiteSpace: 'nowrap', flexShrink: 0,
                                                    }}>🔨 En proceso</span>
                                                )}
                                                {conv.job_status === 'pending_finish' && (
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: '700',
                                                        background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440',
                                                        whiteSpace: 'nowrap', flexShrink: 0,
                                                    }}>⏳ Finalizando</span>
                                                )}
                                                {conv.job_status === 'completed' && (
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: '700',
                                                        background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40',
                                                        whiteSpace: 'nowrap', flexShrink: 0,
                                                    }}>✅ Completado</span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>
                                                {timeAgo(conv.last_message_at)}
                                            </span>
                                        </div>
                                        <p style={{
                                            fontSize: '13px', color: 'var(--text-secondary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                            {conv.last_message || t('chat_no_messages')}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{
                                width: '70px', height: '70px', borderRadius: '50%',
                                background: 'var(--accent-soft)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <MessageCircle size={32} color="var(--accent)" />
                            </div>
                            <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>{t('chat_empty')}</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                {t('chat_empty_desc')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default Chat;
