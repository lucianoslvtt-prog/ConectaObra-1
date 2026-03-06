import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Image, X, Loader, Play, Square, Star, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

const ChatRoom = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [conversation, setConversation] = useState(null);
    const [otherUser, setOtherUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [sending, setSending] = useState(false);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaFile, setMediaFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    // Job workflow state
    const [jobStatus, setJobStatus] = useState(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingValue, setRatingValue] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const { id } = useParams();
    const { t, lang } = useLanguage();

    useEffect(() => {
        loadChat();
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadChat = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUser(user);

        const { data: conv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', id)
            .single();

        if (!conv) return;
        setConversation(conv);
        setJobStatus(conv.job_status);

        const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
        const isSelfChat = conv.participant_1 === conv.participant_2;
        if (isSelfChat && conv.poster_name) {
            setOtherUser({ id: otherId, username: conv.poster_name, role: 'user' });
        } else {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, username, full_name, role')
                .eq('id', otherId)
                .single();
            setOtherUser(profile || { username: 'Usuario', role: 'user' });
        }

        const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });
        setMessages(msgs || []);

        await supabase
            .from('messages')
            .update({ read: true })
            .eq('conversation_id', id)
            .neq('sender_id', user.id)
            .eq('read', false);

        // Check auto-timeouts
        await checkTimeouts(conv, user);

        const channel = supabase
            .channel(`chat-${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${id}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${id}`
            }, (payload) => {
                setConversation(prev => {
                    // Check if it JUST flipped to completed right now in this update
                    if (prev?.job_status === 'pending_finish' && payload.new.job_status === 'completed') {
                        const ratedBy = payload.new.job_rated_by || [];
                        if (!ratedBy.includes(user.id)) {
                            setShowRatingModal(true);
                        }
                    }
                    return payload.new;
                });
                setJobStatus(payload.new.job_status);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    // ── Auto-timeout logic ──────────────────────────────
    const checkTimeouts = async (conv, user) => {
        const now = new Date();

        // Auto-finalize: 4 days after pending_finish
        if (conv.job_status === 'pending_finish' && conv.job_finish_deadline) {
            const deadline = new Date(conv.job_finish_deadline);
            if (now > deadline) {
                await supabase.from('conversations').update({
                    job_status: 'completed',
                    job_finished_at: now.toISOString(),
                    job_rating_deadline: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
                }).eq('id', conv.id);
                setJobStatus('completed');

                await insertSystemMessage('⏰ El trabajo se ha finalizado automáticamente por tiempo.', 'system_finish', user.id);
            }
        }

        // Auto-rating: 72h after completion
        if (conv.job_status === 'completed' && conv.job_rating_deadline) {
            const deadline = new Date(conv.job_rating_deadline);
            if (now > deadline) {
                const ratedBy = conv.job_rated_by || [];
                const participants = [conv.participant_1, conv.participant_2];

                for (const pid of participants) {
                    if (!ratedBy.includes(pid)) {
                        const otherPid = participants.find(p => p !== pid);
                        // Get name for auto-review
                        const { data: prof } = await supabase.from('profiles').select('full_name, username').eq('id', pid).single();
                        const name = prof?.full_name || prof?.username || 'Usuario';

                        await supabase.rpc('set_auto_rating', {
                            target_professional_id: otherPid,
                            target_reviewer_id: pid,
                            target_reviewer_name: name,
                        });
                        ratedBy.push(pid);
                    }
                }

                await supabase.from('conversations').update({
                    job_rated_by: ratedBy,
                }).eq('id', conv.id);

                await insertSystemMessage('⭐ Valoraciones automáticas de 5 estrellas asignadas por tiempo.', 'system_rating', user.id);
            }
        }

        // If completed and user hasn't rated, show rating modal
        if (conv.job_status === 'completed') {
            const ratedBy = conv.job_rated_by || [];
            if (!ratedBy.includes(user.id)) {
                setShowRatingModal(true);
            }
        }
    };

    // ── Insert system message helper ────────────────────
    const insertSystemMessage = async (content, type, senderId = null) => {
        // Fallback to currentUser.id if senderId isn't provided (for manual actions)
        const idToUse = senderId || currentUser?.id;
        if (!idToUse) return;

        await supabase.from('messages').insert({
            conversation_id: id,
            sender_id: idToUse,
            content,
            message_type: type,
        });
        await supabase.from('conversations').update({
            last_message: content.slice(0, 100),
            last_message_at: new Date().toISOString(),
        }).eq('id', id);
    };

    // ── Job workflow actions ────────────────────────────
    const handleStartJob = async () => {
        if (!currentUser || !otherUser) return;
        const myName = await getMyName();

        await supabase.from('conversations').update({
            job_status: 'pending_start',
            job_started_by: currentUser.id,
        }).eq('id', id);
        setJobStatus('pending_start');

        await insertSystemMessage(
            `🤝 ${myName} quiere comenzar el trabajo. ¿Aceptas?`,
            'system_start'
        );
    };

    const handleAcceptStart = async () => {
        const now = new Date();
        await supabase.from('conversations').update({
            job_status: 'in_progress',
            job_started_at: now.toISOString(),
        }).eq('id', id);
        setJobStatus('in_progress');

        const myName = await getMyName();
        await insertSystemMessage(`✅ ${myName} ha aceptado. ¡Trabajo en curso!`, 'system_start');
    };

    const handleRejectStart = async () => {
        await supabase.from('conversations').update({
            job_status: null,
            job_started_by: null,
        }).eq('id', id);
        setJobStatus(null);

        const myName = await getMyName();
        await insertSystemMessage(`❌ ${myName} ha rechazado la solicitud.`, 'system_start');
    };

    const handleFinishJob = async () => {
        const now = new Date();
        const myName = await getMyName();

        await supabase.from('conversations').update({
            job_status: 'pending_finish',
            job_finished_by: currentUser.id,
            job_finish_deadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', id);
        setJobStatus('pending_finish');

        await insertSystemMessage(
            `🏁 ${myName} quiere finalizar el trabajo. ¿Confirmas?`,
            'system_finish'
        );
    };

    const handleAcceptFinish = async () => {
        const now = new Date();
        await supabase.from('conversations').update({
            job_status: 'completed',
            job_finished_at: now.toISOString(),
            job_rating_deadline: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
        }).eq('id', id);
        setJobStatus('completed');

        const myName = await getMyName();
        await insertSystemMessage(`✅ ${myName} ha confirmado la finalización. ¡Trabajo completado!`, 'system_finish');

        // Show rating modal
        setShowRatingModal(true);
    };

    const handleRejectFinish = async () => {
        await supabase.from('conversations').update({
            job_status: 'in_progress',
            job_finished_by: null,
            job_finish_deadline: null,
        }).eq('id', id);
        setJobStatus('in_progress');

        const myName = await getMyName();
        await insertSystemMessage(`❌ ${myName} ha rechazado la finalización. El trabajo continúa.`, 'system_finish');
    };

    const submitRating = async () => {
        if (ratingValue === 0 || !currentUser) return;
        setSubmittingRating(true);
        try {
            const myName = await getMyName();
            const otherId = otherUser?.id || (conversation.participant_1 === currentUser.id
                ? conversation.participant_2
                : conversation.participant_1);

            await supabase.from('reviews').insert({
                professional_id: otherId,
                reviewer_id: currentUser.id,
                reviewer_name: myName,
                rating: ratingValue,
                comment: ratingComment.trim() || null,
            });

            // Update rated_by array
            const currentRated = conversation.job_rated_by || [];
            await supabase.from('conversations').update({
                job_rated_by: [...currentRated, currentUser.id],
            }).eq('id', id);

            setShowRatingModal(false);
            setRatingValue(0);
            setRatingComment('');

            await insertSystemMessage(`⭐ ${myName} ha dejado una valoración.`, 'system_rating');
        } catch (e) {
            console.error('Rating error:', e);
        } finally {
            setSubmittingRating(false);
        }
    };

    const getMyName = async () => {
        const { data } = await supabase.from('profiles')
            .select('full_name, username')
            .eq('id', currentUser.id)
            .single();
        return data?.full_name || data?.username || 'Usuario';
    };

    // ── Media handling ──────────────────────────────────
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) return;
        setMediaFile(file);
        const url = URL.createObjectURL(file);
        setMediaPreview({ url, type: isImage ? 'image' : 'video', name: file.name, size: (file.size / 1024 / 1024).toFixed(1) });
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadMedia = async () => {
        if (!mediaFile || !currentUser) return null;
        const ext = mediaFile.name.split('.').pop();
        const path = `${currentUser.id}/${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage.from('chat-media').upload(path, mediaFile);
        if (error) { console.error(error); return null; }
        const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
        return { url: urlData.publicUrl, type: mediaFile.type.startsWith('image/') ? 'image' : 'video' };
    };

    const sendMessage = async () => {
        if ((!newMessage.trim() && !mediaFile) || sending) return;
        setSending(true);
        setUploading(!!mediaFile);
        try {
            let mediaUrl = null;
            let mediaType = null;
            if (mediaFile) {
                const result = await uploadMedia();
                if (result) { mediaUrl = result.url; mediaType = result.type; }
            }
            const content = newMessage.trim() || (mediaType === 'image' ? '📷 Imagen' : '🎬 Vídeo');
            const { error } = await supabase.from('messages').insert({
                conversation_id: id,
                sender_id: currentUser.id,
                content,
                media_url: mediaUrl,
                media_type: mediaType
            });
            if (error) throw error;
            await supabase.from('conversations').update({
                last_message: content.slice(0, 100),
                last_message_at: new Date().toISOString()
            }).eq('id', id);
            setNewMessage('');
            clearMedia();
        } catch (e) { console.error(e); }
        finally { setSending(false); setUploading(false); }
    };

    // ── Formatters ──────────────────────────────────────
    const formatTime = (date) => new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (date) => {
        const d = new Date(date);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return t('today');
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return t('yesterday');
        const locales = { es: 'es-ES', en: 'en-US', fr: 'fr-FR' };
        return d.toLocaleDateString(locales[lang] || 'es-ES', { day: 'numeric', month: 'short' });
    };

    // ── Determine which action buttons to show on system messages ──
    const canRespondToStart = (msg) => {
        return msg.message_type === 'system_start'
            && msg.content.includes('¿Aceptas?')
            && jobStatus === 'pending_start'
            && conversation?.job_started_by !== currentUser?.id;
    };

    const canRespondToFinish = (msg) => {
        return msg.message_type === 'system_finish'
            && msg.content.includes('¿Confirmas?')
            && jobStatus === 'pending_finish'
            && conversation?.job_finished_by !== currentUser?.id;
    };

    // ── Job status badge for header ─────────────────────
    const getJobBadge = () => {
        if (jobStatus === 'in_progress') {
            return (
                <button onClick={handleFinishJob} style={{
                    padding: '5px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto',
                }}>
                    <Square size={11} /> Finalizar
                </button>
            );
        }
        if (jobStatus === 'pending_start') {
            return (
                <span style={{
                    padding: '5px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40',
                    display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto',
                }}>
                    ⏳ Esperando...
                </span>
            );
        }
        if (jobStatus === 'pending_finish') {
            return (
                <span style={{
                    padding: '5px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40',
                    display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto',
                }}>
                    ⏳ Finalizando...
                </span>
            );
        }

        // Default: show "Comenzar" button
        return (
            <button onClick={handleStartJob} style={{
                padding: '5px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto',
            }}>
                <Play size={11} /> Comenzar
            </button>
        );
    };

    let lastDate = '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <div style={{
                padding: '14px 20px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '12px'
            }}>
                <button className="header-back" onClick={() => navigate('/chat')}>
                    <ChevronLeft size={22} />
                </button>
                <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: otherUser?.role === 'professional'
                        ? 'linear-gradient(135deg, #22c55e40, #22c55e15)'
                        : 'linear-gradient(135deg, #2563eb40, #2563eb15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: '700',
                    color: otherUser?.role === 'professional' ? '#22c55e' : 'var(--accent)',
                    flexShrink: 0,
                }}>
                    {otherUser?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => otherUser?.id && navigate(`/professional/${otherUser.id}`)}
                >
                    <p style={{ fontSize: '15px', fontWeight: '700' }}>{otherUser?.username || 'Usuario'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {otherUser?.role === 'professional' ? t('chat_professional') : t('chat_particular')}
                    </p>
                </div>
                {getJobBadge()}
            </div>

            {/* Original post reference */}
            {conversation?.original_post_content && (
                <div style={{
                    margin: '12px 20px', padding: '12px 14px',
                    background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--accent)', fontSize: '13px', color: 'var(--text-secondary)'
                }}>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>
                        {t('chat_original_header')}
                    </p>
                    {conversation.original_post_content}
                </div>
            )}

            {/* Messages */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '12px 20px',
                display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
                {messages.map((msg, i) => {
                    const isSystem = !!msg.message_type;
                    const isMe = msg.sender_id === currentUser?.id;
                    const msgDate = formatDate(msg.created_at);
                    let showDate = false;
                    if (msgDate !== lastDate) {
                        showDate = true;
                        lastDate = msgDate;
                    }

                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && (
                                <div style={{
                                    textAlign: 'center', padding: '8px 0', fontSize: '11px',
                                    color: 'var(--text-muted)', fontWeight: '600'
                                }}>
                                    {msgDate}
                                </div>
                            )}

                            {/* System message */}
                            {isSystem ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        textAlign: 'center', padding: '10px 16px',
                                        margin: '6px auto', maxWidth: '90%',
                                        background: 'var(--bg-card)', borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        fontSize: '13px', color: 'var(--text-secondary)',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    <p>{msg.content}</p>
                                    {/* Action buttons for pending_start */}
                                    {canRespondToStart(msg) && (
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                                            <button onClick={handleAcceptStart} style={{
                                                padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                                background: '#22c55e', color: 'white', border: 'none', cursor: 'pointer',
                                            }}>✓ Aceptar</button>
                                            <button onClick={handleRejectStart} style={{
                                                padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                                background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer',
                                            }}>✕ Rechazar</button>
                                        </div>
                                    )}
                                    {/* Action buttons for pending_finish */}
                                    {canRespondToFinish(msg) && (
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                                            <button onClick={handleAcceptFinish} style={{
                                                padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                                background: '#22c55e', color: 'white', border: 'none', cursor: 'pointer',
                                            }}>✓ Confirmar</button>
                                            <button onClick={handleRejectFinish} style={{
                                                padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                                background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer',
                                            }}>✕ Rechazar</button>
                                        </div>
                                    )}
                                    <p style={{ fontSize: '10px', marginTop: '6px', color: 'var(--text-muted)' }}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </motion.div>
                            ) : (
                                /* Normal message */
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    <div style={{
                                        maxWidth: '75%',
                                        padding: msg.media_url ? '4px' : '10px 14px',
                                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        background: isMe ? 'var(--accent)' : 'var(--bg-card)',
                                        color: isMe ? 'white' : 'var(--text-primary)',
                                        border: isMe ? 'none' : '1px solid var(--border)',
                                        overflow: 'hidden'
                                    }}>
                                        {msg.media_url && msg.media_type === 'image' && (
                                            <img src={msg.media_url} alt="Imagen" style={{
                                                width: '100%', maxWidth: '260px',
                                                borderRadius: msg.content && msg.content !== '📷 Imagen' ? '12px 12px 0 0' : '12px',
                                                display: 'block'
                                            }} />
                                        )}
                                        {msg.media_url && msg.media_type === 'video' && (
                                            <video src={msg.media_url} controls style={{
                                                width: '100%', maxWidth: '260px',
                                                borderRadius: msg.content && msg.content !== '🎬 Vídeo' ? '12px 12px 0 0' : '12px',
                                                display: 'block'
                                            }} />
                                        )}
                                        {msg.content && msg.content !== '📷 Imagen' && msg.content !== '🎬 Vídeo' && (
                                            <p style={{
                                                fontSize: '14px', lineHeight: 1.5,
                                                padding: msg.media_url ? '8px 10px 0' : 0
                                            }}>{msg.content}</p>
                                        )}
                                        <p style={{
                                            fontSize: '10px', marginTop: '4px', textAlign: 'right',
                                            color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                                            padding: msg.media_url ? '2px 10px 8px' : 0
                                        }}>
                                            {formatTime(msg.created_at)}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Media preview */}
            {mediaPreview && (
                <div style={{
                    padding: '10px 20px', background: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden',
                        border: '1px solid var(--border)', flexShrink: 0
                    }}>
                        {mediaPreview.type === 'image' ? (
                            <img src={mediaPreview.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <video src={mediaPreview.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mediaPreview.name}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {mediaPreview.type === 'image' ? '📷 Imagen' : '🎬 Vídeo'} · {mediaPreview.size} MB
                        </p>
                    </div>
                    <button onClick={clearMedia} style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        cursor: 'pointer', padding: '4px'
                    }}>
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Input */}
            <div style={{
                padding: '12px 20px',
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                background: 'var(--bg-secondary)',
                borderTop: mediaPreview ? 'none' : '1px solid var(--border)',
                display: 'flex', gap: '8px', alignItems: 'flex-end'
            }}>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.2s'
                }}>
                    <Image size={18} color="var(--accent)" />
                </button>
                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                    }}
                    placeholder={t('chat_write')}
                    rows={1}
                    style={{ flex: 1, minHeight: '42px', maxHeight: '120px', resize: 'none', padding: '10px 14px', borderRadius: '20px' }}
                />
                <button
                    onClick={sendMessage}
                    disabled={(!newMessage.trim() && !mediaFile) || sending}
                    style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        background: (newMessage.trim() || mediaFile) ? 'var(--accent)' : 'var(--bg-card)',
                        border: 'none', cursor: (newMessage.trim() || mediaFile) ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', flexShrink: 0
                    }}
                >
                    {uploading ? (
                        <Loader size={18} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                        <Send size={18} color={(newMessage.trim() || mediaFile) ? 'white' : 'var(--text-muted)'} />
                    )}
                </button>
            </div>

            {/* Rating Modal */}
            <AnimatePresence>
                {showRatingModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '20px',
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'var(--bg-secondary)', borderRadius: '20px',
                                padding: '28px', width: '100%', maxWidth: '380px',
                                border: '1px solid var(--border)',
                            }}
                        >
                            <h3 style={{ fontSize: '18px', fontWeight: '800', textAlign: 'center', marginBottom: '6px' }}>
                                ¡Trabajo completado!
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '20px' }}>
                                Valora a {otherUser?.username || 'tu compañero'}
                            </p>

                            {/* Stars */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <motion.button
                                        key={star}
                                        whileTap={{ scale: 1.3 }}
                                        onClick={() => setRatingValue(star)}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                                        }}
                                    >
                                        <Star
                                            size={36}
                                            fill={star <= ratingValue ? '#f59e0b' : 'transparent'}
                                            color={star <= ratingValue ? '#f59e0b' : 'var(--text-muted)'}
                                            strokeWidth={1.5}
                                        />
                                    </motion.button>
                                ))}
                            </div>
                            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                {ratingValue === 0 ? 'Selecciona una puntuación' : ratingValue <= 2 ? 'Mejorable' : ratingValue <= 3 ? 'Aceptable' : ratingValue === 4 ? 'Muy bien' : '¡Excelente!'}
                            </p>

                            <textarea
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                placeholder="Añade un comentario (opcional)..."
                                style={{
                                    minHeight: '70px', padding: '12px', fontSize: '14px',
                                    marginBottom: '14px', resize: 'none', width: '100%',
                                }}
                            />

                            <button
                                onClick={submitRating}
                                disabled={ratingValue === 0 || submittingRating}
                                className="btn btn-primary w-full"
                                style={{ padding: '14px', fontSize: '15px', opacity: ratingValue === 0 ? 0.5 : 1, marginBottom: '8px' }}
                            >
                                {submittingRating ? 'Enviando...' : '⭐ Enviar valoración'}
                            </button>

                            <button
                                onClick={() => setShowRatingModal(false)}
                                style={{
                                    width: '100%', padding: '10px', background: 'none',
                                    border: 'none', color: 'var(--text-muted)', fontSize: '13px',
                                    cursor: 'pointer', fontFamily: 'Inter',
                                }}
                            >
                                Valorar más tarde (72h límite)
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatRoom;
