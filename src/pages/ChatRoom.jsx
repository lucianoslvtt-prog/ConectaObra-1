import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Image, X, Loader, Play, Square, Star, CheckCircle, UserX, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';
import { trades } from '../data/categories';

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
    const [job, setJob] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [participantIds, setParticipantIds] = useState([]);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingValue, setRatingValue] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);
    const [reviewImages, setReviewImages] = useState([]);
    const [reviewImagePreviews, setReviewImagePreviews] = useState([]);
    // Price proposal state
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [priceAmount, setPriceAmount] = useState('');
    const [priceCurrency, setPriceCurrency] = useState('EUR');
    const [submittingPrice, setSubmittingPrice] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const checkTimeoutsRunning = useRef(false);
    const navigate = useNavigate();
    const { id } = useParams();
    const { t, lang } = useLanguage();

    // Atajo para detectar si el otro usuario eliminó su cuenta
    const isOtherDeleted = otherUser?.role === 'deleted';

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

        // Load job for this conversation (use order + limit to handle duplicates)
        const { data: jobArr } = await supabase
            .from('jobs')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: false })
            .limit(1);
        const jobData = jobArr?.[0] || null;

        setJob(jobData);
        setJobStatus(jobData?.status || null);

        // Load participants
        const { data: partData } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', id);

        const pIds = (partData || []).map(p => p.user_id);
        setParticipantIds(pIds);

        const otherId = pIds.find(pid => pid !== user.id) || user.id;
        const isSelfChat = !pIds.find(pid => pid !== user.id);

        // Cargar mensajes ANTES de decidir quién es el otro usuario,
        // así podemos detectar si fue eliminado mirando sender_id NULL
        const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });
        setMessages(msgs || []);

        // Detectar si el otro usuario eliminó su cuenta:
        // tras nuestro cambio del FK a SET NULL, sus mensajes quedan con sender_id = NULL
        const otherUserWasDeleted = (msgs || []).some(m => m.sender_id === null);

        if (otherUserWasDeleted) {
            setOtherUser({
                id: null,
                username: 'Usuario eliminado',
                role: 'deleted',
                deleted: true,
            });
        } else if (isSelfChat && conv.poster_name) {
            setOtherUser({ id: otherId, username: conv.poster_name, role: 'user' });
        } else {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, username, full_name, role')
                .eq('id', otherId)
                .single();
            setOtherUser(profile || { username: 'Usuario', role: 'user' });
        }

        await supabase
            .from('messages')
            .update({ read: true })
            .eq('conversation_id', id)
            .neq('sender_id', user.id)
            .eq('read', false);

        // Si el otro usuario fue eliminado, no procesamos ni rating ni timeouts
        // (no tiene sentido valorar a alguien que ya no existe ni intentar avanzar el job)
        if (!otherUserWasDeleted) {
            // Show rating modal if job is completed and user hasn't rated
            if (jobData?.status === 'completed') {
                const ratedBy = jobData.rated_by || [];
                if (!ratedBy.includes(user.id)) {
                    setShowRatingModal(true);
                }
            }

            // Check auto-timeouts
            await checkTimeouts(jobData, user, pIds);
        }

        const channel = supabase
            .channel(`chat-${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${id}`
            }, (payload) => {
                setMessages(prev => {
                    if (prev.some(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new];
                });
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${id}`
            }, (payload) => {
                setConversation(payload.new);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'jobs',
                filter: `conversation_id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    setJob(null);
                    setJobStatus(null);
                    return;
                }
                const newJob = payload.new;
                setJob(prev => {
                    if (prev?.status === 'pending_finish' && newJob.status === 'completed') {
                        const ratedBy = newJob.rated_by || [];
                        if (!ratedBy.includes(user.id) && !otherUserWasDeleted) {
                            setShowRatingModal(true);
                        }
                    }
                    return newJob;
                });
                setJobStatus(newJob.status);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    // ── Auto-timeout logic ──────────────────────────────
    const checkTimeouts = async (jobData, user, pIds) => {
        if (!jobData) return;
        if (checkTimeoutsRunning.current) return;
        checkTimeoutsRunning.current = true;

        try {
            const now = new Date();

            // Auto-finalize: 4 days after pending_finish
            if (jobData.status === 'pending_finish' && jobData.finish_deadline) {
                const deadline = new Date(jobData.finish_deadline);
                if (now > deadline) {
                    const { data: updatedJob } = await supabase.from('jobs').update({
                        status: 'completed',
                        finished_at: now.toISOString(),
                        rating_deadline: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
                    }).eq('conversation_id', id).select().single();

                    setJob(updatedJob);
                    setJobStatus('completed');

                    await insertSystemMessage('⏰ El trabajo se ha finalizado automáticamente por tiempo.', 'system_finish', user.id);
                }
            }

            // Auto-rating: 72h after completion
            if (jobData.status === 'completed' && jobData.rating_deadline) {
                const deadline = new Date(jobData.rating_deadline);
                const ratedBy = jobData.rated_by || [];
                const pendingParticipants = pIds.filter(p => !ratedBy.includes(p));

                // Only run if deadline has passed AND there are still participants without a rating
                if (now > deadline && pendingParticipants.length > 0) {
                    const updatedRatedBy = [...ratedBy];

                    for (const pid of pendingParticipants) {
                        const otherPid = pIds.find(p => p !== pid);
                        // Get name for auto-review
                        const { data: prof } = await supabase.from('profiles').select('full_name, username').eq('id', pid).single();
                        const name = prof?.full_name || prof?.username || 'Usuario';

                        await supabase.rpc('set_auto_rating', {
                            target_professional_id: otherPid,
                            target_reviewer_id: pid,
                            target_reviewer_name: name,
                        });
                        updatedRatedBy.push(pid);
                    }

                    // Update rated_by and set rated_at if all participants have now rated
                    const updatePayload = { rated_by: updatedRatedBy };
                    if (updatedRatedBy.length >= pIds.length) {
                        updatePayload.rated_at = now.toISOString();
                    }
                    const { data: updatedJob } = await supabase.from('jobs').update(updatePayload)
                        .eq('conversation_id', id).select().single();

                    setJob(updatedJob);

                    await insertSystemMessage('⭐ Valoraciones automáticas de 5 estrellas asignadas por tiempo.', 'system_rating', user.id);
                }
            }
        } finally {
            checkTimeoutsRunning.current = false;
        }
    };

    // ── Insert system message helper ────────────────────
    const insertSystemMessage = async (content, type, senderId = null) => {
        // Fallback to currentUser.id if senderId isn't provided (for manual actions)
        const idToUse = senderId || currentUser?.id;
        if (!idToUse) return;

        const { data: newMsg, error } = await supabase.from('messages').insert({
            conversation_id: id,
            sender_id: idToUse,
            content,
            message_type: type,
        }).select().single();

        if (newMsg) {
            setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        }
        await supabase.from('conversations').update({
            last_message: content.slice(0, 100),
            last_message_at: new Date().toISOString(),
        }).eq('id', id);
    };

    // ── Job workflow actions ────────────────────────────
    const handleStartJob = async () => {
        if (!currentUser || !otherUser) return;

        // Prevent duplicates: check if a job already exists for this conversation
        if (job) return;

        const myName = await getMyName();

        const { data: newJob } = await supabase.from('jobs').insert({
            conversation_id: id,
            status: 'pending_start',
            started_by: currentUser.id,
            rated_by: [],
        }).select().single();

        setJob(newJob);
        setJobStatus('pending_start');

        await insertSystemMessage(
            `🤝 ${myName} quiere comenzar el trabajo. ¿Aceptas?`,
            'system_start'
        );
    };

    const handleAcceptStart = async () => {
        const now = new Date();
        const { data: updatedJob } = await supabase.from('jobs').update({
            status: 'in_progress',
            started_at: now.toISOString(),
        }).eq('conversation_id', id).select().single();

        setJob(updatedJob);
        setJobStatus('in_progress');

        const myName = await getMyName();
        await insertSystemMessage(`✅ ${myName} ha aceptado. ¡Trabajo en curso!`, 'system_start');
    };

    const handleRejectStart = async () => {
        await supabase.from('jobs').delete().eq('conversation_id', id);

        setJob(null);
        setJobStatus(null);

        const myName = await getMyName();
        await insertSystemMessage(`❌ ${myName} ha rechazado la solicitud.`, 'system_start');
    };

    const handleFinishJob = async () => {
        const now = new Date();
        const myName = await getMyName();
        const deadline = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

        const { data: updatedJob } = await supabase.from('jobs').update({
            status: 'pending_finish',
            finished_by: currentUser.id,
            finish_deadline: deadline,
        }).eq('conversation_id', id).select().single();

        setJob(updatedJob);
        setJobStatus('pending_finish');

        await insertSystemMessage(
            `🏁 ${myName} quiere finalizar el trabajo. ¿Confirmas?`,
            'system_finish'
        );
    };

    const handleAcceptFinish = async () => {
        const now = new Date();
        const { data: updatedJob } = await supabase.from('jobs').update({
            status: 'completed',
            finished_at: now.toISOString(),
            rating_deadline: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
        }).eq('conversation_id', id).select().single();

        setJob(updatedJob);
        setJobStatus('completed');

        const myName = await getMyName();
        await insertSystemMessage(`✅ ${myName} ha confirmado la finalización. ¡Trabajo completado!`, 'system_finish');

        // Show rating modal
        setShowRatingModal(true);
    };

    const handleRejectFinish = async () => {
        const { data: updatedJob } = await supabase.from('jobs').update({
            status: 'in_progress',
            finished_by: null,
            finish_deadline: null,
        }).eq('conversation_id', id).select().single();

        setJob(updatedJob);
        setJobStatus('in_progress');

        const myName = await getMyName();
        await insertSystemMessage(`❌ ${myName} ha rechazado la finalización. El trabajo continúa.`, 'system_finish');
    };

    const handleReviewImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + reviewImages.length > 4) {
            alert('Máximo 4 imágenes por reseña.');
            return;
        }
        setReviewImages(prev => [...prev, ...files]);
        setReviewImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    };

    const removeReviewImage = (index) => {
        URL.revokeObjectURL(reviewImagePreviews[index]);
        setReviewImages(prev => prev.filter((_, i) => i !== index));
        setReviewImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const submitRating = async () => {
        if (ratingValue === 0 || !currentUser) return;
        setSubmittingRating(true);
        try {
            const myName = await getMyName();
            const otherId = otherUser?.id;
            if (!otherId) return;

            // Upload images
            const imageUrls = [];
            for (const file of reviewImages) {
                const ext = file.name.split('.').pop();
                const fileName = `reviews/${currentUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from('community-images')
                    .upload(fileName, file, { cacheControl: '3600', upsert: false });
                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from('community-images')
                        .getPublicUrl(fileName);
                    if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl);
                }
            }

            await supabase.from('reviews').insert({
                professional_id: otherId,
                reviewer_id: currentUser.id,
                reviewer_name: myName,
                rating: ratingValue,
                comment: ratingComment.trim() || null,
                image_urls: imageUrls,
            });

            // Update rated_by array on the job
            const currentRated = job?.rated_by || [];
            const newRatedBy = [...currentRated, currentUser.id];
            const updatePayload = { rated_by: newRatedBy };
            if (newRatedBy.length >= participantIds.length) {
                updatePayload.rated_at = new Date().toISOString();
            }
            const { data: updatedJob } = await supabase.from('jobs').update(updatePayload)
                .eq('conversation_id', id).select().single();

            setJob(updatedJob);

            setShowRatingModal(false);
            setRatingValue(0);
            setRatingComment('');
            setReviewImages([]);
            setReviewImagePreviews([]);

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

    // ── Price negotiation ───────────────────────────────
    const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£' };
    const getCurrencySymbol = (c) => CURRENCY_SYMBOLS[c] || c;

    // Centralized parser: extracts { amount, currency } from a system_price message.
    // Expected format: "... propone 200.00 EUR. ¿Aceptas?" or "... acordado: 200.00 EUR"
    const PRICE_REGEX = /(\d+(?:\.\d{1,2})?)\s*(EUR|USD|GBP)/;
    const parsePriceFromMessage = (content) => {
        const match = content?.match(PRICE_REGEX);
        if (!match) return null;
        return { amount: parseFloat(match[1]), currency: match[2] };
    };

    const formatPriceDisplay = (amount, currency) => {
        const sym = getCurrencySymbol(currency);
        // EUR/GBP: symbol after number (200€), USD: symbol before ($200)
        if (currency === 'USD') return `${sym}${amount}`;
        return `${amount}${sym}`;
    };

    const handleProposePrice = async () => {
        const amount = parseFloat(priceAmount);
        if (isNaN(amount) || amount < 0) return;
        setSubmittingPrice(true);
        try {
            const myName = await getMyName();
            const formatted = formatPriceDisplay(amount.toFixed(2), priceCurrency);
            await insertSystemMessage(
                `💰 ${myName} propone ${amount.toFixed(2)} ${priceCurrency}. ¿Aceptas?`,
                'system_price'
            );
            setShowPriceModal(false);
            setPriceAmount('');
        } catch (e) {
            console.error('Price proposal error:', e);
        } finally {
            setSubmittingPrice(false);
        }
    };

    const handleAcceptPrice = async (msg) => {
        const parsed = parsePriceFromMessage(msg.content);
        if (!parsed) return;
        try {
            const { data: updatedJob } = await supabase.from('jobs').update({
                price_amount: parsed.amount,
                currency: parsed.currency,
            }).eq('conversation_id', id).select().single();

            if (updatedJob) {
                setJob(updatedJob);
            }

            const display = formatPriceDisplay(parsed.amount.toFixed(2), parsed.currency);
            const myName = await getMyName();
            await insertSystemMessage(
                `✅ ${myName} ha aceptado. Precio acordado: ${parsed.amount.toFixed(2)} ${parsed.currency}.`,
                'system_price'
            );
        } catch (e) {
            console.error('Price accept error:', e);
        }
    };

    const handleRejectPrice = async () => {
        try {
            const myName = await getMyName();
            await insertSystemMessage(
                `❌ ${myName} ha rechazado el precio propuesto.`,
                'system_price'
            );
        } catch (e) {
            console.error('Price reject error:', e);
        }
    };

    const canRespondToPrice = (msg) => {
        // Si el otro usuario fue eliminado, no se puede responder a nada
        if (isOtherDeleted) return false;
        return msg.message_type === 'system_price'
            && msg.content.includes('¿Aceptas?')
            && msg.sender_id !== currentUser?.id
            && !messages.some(m =>
                m.message_type === 'system_price'
                && m.id !== msg.id
                && new Date(m.created_at) > new Date(msg.created_at)
                && (m.content.includes('ha aceptado') || m.content.includes('ha rechazado'))
            );
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
        // Bloqueo extra: si el otro usuario fue eliminado, no permitir envío
        if (isOtherDeleted) return;
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

            // Insert and select the new message to update the UI instantly
            const { data: newMsg, error } = await supabase.from('messages').insert({
                conversation_id: id,
                sender_id: currentUser.id,
                content,
                media_url: mediaUrl,
                media_type: mediaType
            }).select().single();

            if (error) throw error;

            // Optimistically update the UI to show the message instantly
            if (newMsg) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            }

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
        if (isOtherDeleted) return false;
        return msg.message_type === 'system_start'
            && msg.content.includes('¿Aceptas?')
            && jobStatus === 'pending_start'
            && job?.started_by !== currentUser?.id;
    };

    const canRespondToFinish = (msg) => {
        if (isOtherDeleted) return false;
        return msg.message_type === 'system_finish'
            && msg.content.includes('¿Confirmas?')
            && jobStatus === 'pending_finish'
            && job?.finished_by !== currentUser?.id;
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

    // ── Translate trade IDs in original_post_content ──
    const translateOriginalPost = (content) => {
        if (!content) return '';
        // Content format: "carpentry, painting, electrical — Mijas, Torremolinos"
        const parts = content.split(' — ');
        const tradesPart = parts[0] || '';
        const locationPart = parts.slice(1).join(' — ');

        const translatedTrades = tradesPart.split(',').map(s => {
            const trimmed = s.trim();
            const trade = trades.find(tr => tr.id === trimmed || tr.name.toLowerCase() === trimmed.toLowerCase());
            if (trade) return t(trade.tkey) || trade.name;
            return trimmed;
        }).join(', ');

        return locationPart ? `${translatedTrades} — ${locationPart}` : translatedTrades;
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
                    background: isOtherDeleted
                        ? 'linear-gradient(135deg, #99999940, #99999915)'
                        : otherUser?.role === 'professional'
                            ? 'linear-gradient(135deg, #22c55e40, #22c55e15)'
                            : 'linear-gradient(135deg, #2563eb40, #2563eb15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: '700',
                    color: isOtherDeleted ? '#999' : otherUser?.role === 'professional' ? '#22c55e' : 'var(--accent)',
                    flexShrink: 0,
                }}>
                    {isOtherDeleted ? <UserX size={18} /> : (otherUser?.username?.[0]?.toUpperCase() || '?')}
                </div>
                <div
                    style={{ flex: 1, minWidth: 0, cursor: isOtherDeleted ? 'default' : 'pointer' }}
                    onClick={() => !isOtherDeleted && otherUser?.id && navigate(`/professional/${otherUser.id}`)}
                >
                    <p style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        fontStyle: isOtherDeleted ? 'italic' : 'normal',
                        color: isOtherDeleted ? 'var(--text-muted)' : 'inherit',
                    }}>{otherUser?.username || 'Usuario'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {isOtherDeleted
                            ? 'Esta cuenta ya no existe'
                            : (otherUser?.role === 'professional' ? t('chat_professional') : t('chat_particular'))
                        }
                    </p>
                </div>
                {!isOtherDeleted && getJobBadge()}
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
                    {translateOriginalPost(conversation.original_post_content)}
                </div>
            )}

            {/* Price bar (no se muestra si el otro usuario fue eliminado) */}
            {!isOtherDeleted && job && (job.price_amount != null || ['pending_start', 'in_progress'].includes(jobStatus)) && (
                <div style={{
                    margin: '0 20px 4px', padding: '10px 14px',
                    background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid #22c55e',
                    display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                    {job.price_amount != null && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '4px 12px', borderRadius: '16px',
                            background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                            fontSize: '13px', fontWeight: '700',
                            border: '1px solid rgba(34,197,94,0.25)',
                        }}>
                            💰 {formatPriceDisplay(
                                parseFloat(job.price_amount).toFixed(2),
                                job.currency || 'EUR'
                            )}
                        </span>
                    )}
                    {['pending_start', 'in_progress'].includes(jobStatus) && (
                        <button
                            onClick={() => setShowPriceModal(true)}
                            style={{
                                marginLeft: 'auto',
                                padding: '5px 14px', borderRadius: '20px',
                                fontSize: '11px', fontWeight: '700',
                                background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                                border: '1px solid rgba(245,158,11,0.3)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px',
                            }}
                        >
                            💰 {job.price_amount != null ? 'Cambiar precio' : 'Proponer precio'}
                        </button>
                    )}
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
                                (() => {
                                    let displayContent = msg.content;

                                    if (msg.message_type === 'system_start' && msg.content.includes('¿Aceptas?')) {
                                        if (job?.started_by === currentUser?.id) {
                                            displayContent = msg.content.replace(' quiere comenzar el trabajo. ¿Aceptas?', ' ha solicitado comenzar el trabajo.');
                                        }
                                    } else if (msg.message_type === 'system_finish' && msg.content.includes('¿Confirmas?')) {
                                        if (job?.finished_by === currentUser?.id) {
                                            displayContent = msg.content.replace(' quiere finalizar el trabajo. ¿Confirmas?', ' ha solicitado finalizar el trabajo.');
                                        }
                                    } else if (msg.message_type === 'system_price' && msg.content.includes('¿Aceptas?')) {
                                        if (msg.sender_id === currentUser?.id) {
                                            displayContent = msg.content.replace(' ¿Aceptas?', '. Esperando respuesta...');
                                        }
                                    }

                                    return (
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
                                            <p>{displayContent}</p>
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
                                            {/* Action buttons for price proposal */}
                                            {canRespondToPrice(msg) && (
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                                                    <button onClick={() => handleAcceptPrice(msg)} style={{
                                                        padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                                        background: '#22c55e', color: 'white', border: 'none', cursor: 'pointer',
                                                    }}>✓ Aceptar</button>
                                                    <button onClick={() => handleRejectPrice(msg)} style={{
                                                        padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                                        background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer',
                                                    }}>✕ Rechazar</button>
                                                </div>
                                            )}
                                            <p style={{ fontSize: '10px', marginTop: '6px', color: 'var(--text-muted)' }}>
                                                {formatTime(msg.created_at)}
                                            </p>
                                        </motion.div>
                                    );
                                })()
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
            {!isOtherDeleted && mediaPreview && (
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

            {/* Input — bloqueado si el otro usuario fue eliminado */}
            {isOtherDeleted ? (
                <div style={{
                    padding: '16px 20px',
                    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                    background: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border)',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}>
                    <UserX size={16} />
                    Esta conversación está cerrada porque el usuario ya no existe.
                </div>
            ) : (
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
            )}

            {/* Rating Modal */}
            <AnimatePresence>
                {showRatingModal && !isOtherDeleted && (
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
                                    borderRadius: '8px', border: '1px solid var(--border)',
                                    background: 'var(--bg-primary)', color: 'var(--text-primary)'
                                }}
                            />

                            {/* Image Previews */}
                            {reviewImagePreviews.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' }}>
                                    {reviewImagePreviews.map((preview, idx) => (
                                        <div key={idx} style={{ position: 'relative', flexShrink: 0, width: '56px', height: '56px' }}>
                                            <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                            <button
                                                onClick={() => removeReviewImage(idx)}
                                                style={{
                                                    position: 'absolute', top: '-4px', right: '-4px', background: 'var(--text-primary)', color: 'var(--bg-primary)',
                                                    border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                }}
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Photo Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <label style={{
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 14px', borderRadius: '20px',
                                    background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                                    fontSize: '12px', fontWeight: '600', border: '1px solid var(--border)'
                                }}>
                                    <input type="file" accept="image/*" multiple onChange={handleReviewImageSelect} style={{ display: 'none' }} />
                                    <Camera size={14} /> Añadir fotos
                                </label>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{reviewImages.length}/4</span>
                            </div>

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

            {/* Price Proposal Modal */}
            <AnimatePresence>
                {showPriceModal && !isOtherDeleted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setShowPriceModal(false); setPriceAmount(''); setPriceCurrency('EUR'); }}
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
                                💰 Proponer precio
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '20px' }}>
                                Acuerda un precio con {otherUser?.username || 'tu compañero'}
                            </p>

                            {/* Amount input */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                    Importe
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={priceAmount}
                                    onChange={(e) => setPriceAmount(e.target.value)}
                                    placeholder="0.00"
                                    style={{
                                        width: '100%', padding: '12px 14px', fontSize: '20px',
                                        fontWeight: '700', borderRadius: '12px',
                                        textAlign: 'center',
                                    }}
                                />
                            </div>

                            {/* Currency selector */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                    Moneda
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['EUR', 'USD', 'GBP'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setPriceCurrency(c)}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '12px',
                                                fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                                                background: priceCurrency === c ? 'var(--accent)' : 'var(--bg-card)',
                                                color: priceCurrency === c ? 'white' : 'var(--text-primary)',
                                                border: priceCurrency === c ? 'none' : '1px solid var(--border)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {getCurrencySymbol(c)} {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            {priceAmount && parseFloat(priceAmount) > 0 && (
                                <div style={{
                                    textAlign: 'center', padding: '10px', marginBottom: '16px',
                                    background: 'rgba(34,197,94,0.08)', borderRadius: '12px',
                                    border: '1px solid rgba(34,197,94,0.2)',
                                }}>
                                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e' }}>
                                        {formatPriceDisplay(parseFloat(priceAmount).toFixed(2), priceCurrency)}
                                    </span>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleProposePrice}
                                disabled={!priceAmount || parseFloat(priceAmount) <= 0 || isNaN(parseFloat(priceAmount)) || submittingPrice}
                                className="btn btn-primary w-full"
                                style={{
                                    padding: '14px', fontSize: '15px', marginBottom: '8px',
                                    opacity: (!priceAmount || parseFloat(priceAmount) <= 0 || isNaN(parseFloat(priceAmount))) ? 0.5 : 1,
                                }}
                            >
                                {submittingPrice ? 'Enviando...' : '💰 Enviar propuesta'}
                            </button>

                            <button
                                onClick={() => { setShowPriceModal(false); setPriceAmount(''); setPriceCurrency('EUR'); }}
                                style={{
                                    width: '100%', padding: '10px', background: 'none',
                                    border: 'none', color: 'var(--text-muted)', fontSize: '13px',
                                    cursor: 'pointer', fontFamily: 'Inter',
                                }}
                            >
                                Cancelar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatRoom;
