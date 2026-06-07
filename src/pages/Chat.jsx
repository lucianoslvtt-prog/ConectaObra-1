import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Search, X, UserX } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

const Chat = () => {
    const navigate = useNavigate();
    const { t, lang } = useLanguage();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/auth'); return; }
            setCurrentUser(user);

            // Get conversations the user participates in
            const { data: participations } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', user.id);

            if (!participations || participations.length === 0) {
                setConversations([]);
                setLoading(false);
                return;
            }

            const convIds = participations.map(p => p.conversation_id);

            // Get conversation details
            const { data: convs } = await supabase
                .from('conversations')
                .select('*')
                .in('id', convIds)
                .order('last_message_at', { ascending: false });

            if (!convs) {
                setConversations([]);
                setLoading(false);
                return;
            }

            // For each conversation, get the other participant's profile
            const enrichedConvs = await Promise.all(convs.map(async (conv) => {
                // Get all participants of this conversation
                const { data: parts } = await supabase
                    .from('conversation_participants')
                    .select('user_id')
                    .eq('conversation_id', conv.id);

                const otherUserId = parts?.find(p => p.user_id !== user.id)?.user_id;

                let otherProfile = null;
                let isDeleted = false;

                if (otherUserId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, username, full_name, avatar_url, role')
                        .eq('id', otherUserId)
                        .single();

                    if (profile) {
                        otherProfile = profile;
                    } else {
                        isDeleted = true;
                    }
                } else {
                    // No other participant found — check if messages have null sender_id
                    // (deleted user's messages get sender_id set to NULL)
                    const { count: nullMsgCount } = await supabase
                        .from('messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('conversation_id', conv.id)
                        .is('sender_id', null);

                    if (nullMsgCount && nullMsgCount > 0) {
                        isDeleted = true;
                    }
                }

                // Count unread messages
                const { count } = await supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id)
                    .neq('sender_id', user.id)
                    .eq('read', false);

                return {
                    ...conv,
                    otherProfile,
                    isDeleted,
                    unreadCount: count || 0,
                };
            }));

            setConversations(enrichedConvs);

            // Build unread counts map
            const counts = {};
            enrichedConvs.forEach(c => {
                if (c.unreadCount > 0) counts[c.id] = c.unreadCount;
            });
            setUnreadCounts(counts);

            // Subscribe to real-time updates
            const channel = supabase
                .channel('chat-list')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                }, () => {
                    // Reload on any conversation change
                    loadConversations();
                })
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                }, () => {
                    loadConversations();
                })
                .subscribe();

            return () => supabase.removeChannel(channel);
        } catch (e) {
            console.error('Error loading conversations:', e);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const mins = Math.floor(diff / 60000);

        if (mins < 1) return t('chat_now') || 'ahora';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;

        const days = Math.floor(hours / 24);
        if (days === 1) return t('yesterday') || 'ayer';
        if (days < 7) return `${days}d`;

        const locales = { es: 'es-ES', en: 'en-US', fr: 'fr-FR' };
        return date.toLocaleDateString(locales[lang] || 'es-ES', { day: 'numeric', month: 'short' });
    };

    const filteredConvs = searchQuery.trim()
        ? conversations.filter(c => {
            const name = c.otherProfile?.full_name || c.otherProfile?.username || c.poster_name || '';
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        : conversations;

    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

    return (
        <div className="page">
            <div className="page-content">
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>
                            {t('chat_title') || 'Mensajes'}
                        </h1>
                        {totalUnread > 0 && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: '22px', height: '22px', borderRadius: '11px',
                                background: '#ef4444', color: 'white',
                                fontSize: '11px', fontWeight: '700', padding: '0 6px',
                            }}>
                                {totalUnread}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        style={{
                            background: showSearch ? 'var(--accent)' : 'none',
                            border: 'none',
                            color: showSearch ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer', borderRadius: '8px', padding: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Search size={18} />
                    </button>
                </div>

                {/* Search bar */}
                <AnimatePresence>
                    {showSearch && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ padding: '0 20px 12px' }}
                        >
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{
                                    position: 'absolute', left: '14px', top: '50%',
                                    transform: 'translateY(-50%)', color: 'var(--accent)'
                                }} />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('chat_search') || 'Buscar conversaciones...'}
                                    autoFocus
                                    style={{ paddingLeft: '40px', paddingRight: searchQuery ? '36px' : '12px' }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        style={{
                                            position: 'absolute', right: '10px', top: '50%',
                                            transform: 'translateY(-50%)', background: 'none',
                                            border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                            display: 'flex', alignItems: 'center',
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Conversations list */}
                <div style={{ padding: '0 20px', paddingBottom: '100px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <p style={{ color: 'var(--text-muted)' }}>{t('loading') || 'Cargando...'}</p>
                        </div>
                    ) : filteredConvs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: 'var(--accent-soft)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px',
                            }}>
                                <MessageCircle size={28} color="var(--accent)" />
                            </div>
                            <p style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>
                                {searchQuery
                                    ? `No se encontraron conversaciones`
                                    : (t('chat_empty') || 'Sin conversaciones')
                                }
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {searchQuery
                                    ? 'Intenta con otro nombre'
                                    : (t('chat_empty_desc') || 'Responde a publicaciones en la Comunidad para iniciar un chat privado')
                                }
                            </p>
                        </div>
                    ) : (
                        filteredConvs.map((conv, i) => {
                            const name = conv.otherProfile?.full_name || conv.otherProfile?.username || conv.poster_name || 'Usuario';
                            const avatar = conv.otherProfile?.avatar_url;
                            const initial = name[0]?.toUpperCase() || '?';
                            const isPro = conv.otherProfile?.role === 'professional';
                            const hasUnread = (unreadCounts[conv.id] || 0) > 0;

                            return (
                                <motion.div
                                    key={conv.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => navigate(`/chat/${conv.id}`)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '14px',
                                        padding: '14px 0',
                                        borderBottom: '1px solid var(--border)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {/* Avatar */}
                                    <div style={{
                                        width: '50px', height: '50px', borderRadius: '50%',
                                        background: conv.isDeleted
                                            ? 'linear-gradient(135deg, #99999940, #99999915)'
                                            : avatar ? 'none'
                                            : isPro
                                                ? 'linear-gradient(135deg, #22c55e40, #22c55e15)'
                                                : 'linear-gradient(135deg, #2563eb40, #2563eb15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '18px', fontWeight: '700',
                                        color: conv.isDeleted ? '#999' : isPro ? '#22c55e' : 'var(--accent)',
                                        flexShrink: 0, overflow: 'hidden',
                                        position: 'relative',
                                    }}>
                                        {conv.isDeleted ? (
                                            <UserX size={20} />
                                        ) : avatar ? (
                                            <img
                                                src={avatar}
                                                alt={name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = initial; }}
                                            />
                                        ) : initial}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <p style={{
                                                fontSize: '15px',
                                                fontWeight: hasUnread ? '800' : '600',
                                                color: conv.isDeleted ? 'var(--text-muted)' : 'var(--text-primary)',
                                                fontStyle: conv.isDeleted ? 'italic' : 'normal',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {conv.isDeleted ? 'Usuario eliminado' : name}
                                            </p>
                                            <span style={{
                                                fontSize: '11px',
                                                color: hasUnread ? 'var(--accent)' : 'var(--text-muted)',
                                                fontWeight: hasUnread ? '700' : '400',
                                                flexShrink: 0, marginLeft: '8px',
                                            }}>
                                                {formatTime(conv.last_message_at)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <p style={{
                                                fontSize: '13px',
                                                color: hasUnread ? 'var(--text-primary)' : 'var(--text-muted)',
                                                fontWeight: hasUnread ? '600' : '400',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                flex: 1,
                                            }}>
                                                {conv.last_message || (t('chat_no_messages') || 'Sin mensajes aún')}
                                            </p>
                                            {hasUnread && (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    minWidth: '20px', height: '20px', borderRadius: '10px',
                                                    background: 'var(--accent)', color: 'white',
                                                    fontSize: '11px', fontWeight: '700', padding: '0 5px',
                                                    flexShrink: 0, marginLeft: '8px',
                                                }}>
                                                    {unreadCounts[conv.id]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default Chat;
