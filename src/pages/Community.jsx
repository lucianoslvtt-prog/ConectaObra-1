import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Send, MoreHorizontal, Bell, BellOff, Briefcase, Users, Reply, X, Plus, Camera, Video, ChevronLeft, ChevronRight, Filter, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BottomNav from '../components/BottomNav';
import { trades } from '../data/categories';
import { useLanguage } from '../lib/LanguageContext';

const samplePosts = [
    {
        id: 'sample-1',
        user: 'Luis Pérez',
        avatar: 'L',
        time: 'hace 2h',
        content: 'Terminamos el encofrado en este terreno precioso. Otra obra más de experiencia en el sector.',
        tagged_trades: [],
        image: true,
        imageColor: '#2563eb',
        likes: 24,
        comments: 8
    },
    {
        id: 'sample-2',
        user: 'Ana Martínez',
        avatar: 'A',
        time: 'hace 4h',
        content: 'Orgullosa de esta reforma de baño. Los azulejos artesanales son mi pasión. ¿Os gusta el resultado?',
        tagged_trades: [],
        image: true,
        imageColor: '#f59e0b',
        likes: 56,
        comments: 12
    },
    {
        id: 'sample-3',
        user: 'Daniel García',
        avatar: 'D',
        time: 'hace 6h',
        content: 'Buscando recomendaciones de proveedores de madera noble en Madrid zona sur. ¿Alguno conocéis?',
        tagged_trades: [],
        image: false,
        likes: 8,
        comments: 15
    },
    {
        id: 'sample-4',
        user: 'Sara López',
        avatar: 'S',
        time: 'hace 8h',
        content: 'Acabo de terminar esta estantería a medida para el despacho de un cliente. Nogal y acero — ¡una combinación perfecta!',
        tagged_trades: [],
        image: true,
        imageColor: '#22c55e',
        likes: 89,
        comments: 23
    },
];

const Community = () => {
    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [newPost, setNewPost] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [likedPosts, setLikedPosts] = useState(new Set());
    const [taggedTrades, setTaggedTrades] = useState([]);
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [mentionCursorPos, setMentionCursorPos] = useState(0);
    const [publishing, setPublishing] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [toastMsg, setToastMsg] = useState('');
    const [lightbox, setLightbox] = useState(null); // { urls: [], index: number }

    // Job Board specific states
    const [activeTab, setActiveTab] = useState('general'); // 'general' or 'jobs'
    const [jobOffers, setJobOffers] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [newJobType, setNewJobType] = useState('seek_worker'); // 'seek_worker' | 'seek_job'
    const [newJobContent, setNewJobContent] = useState('');
    const [newJobTrade, setNewJobTrade] = useState('');
    const [newJobLocation, setNewJobLocation] = useState('');
    const [isSubscribedToJobs, setIsSubscribedToJobs] = useState(false);
    const [publishingJob, setPublishingJob] = useState(false);
    const filterScrollRef = useRef(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        loadPosts();
        loadJobs();
        checkJobSubscription();
    }, []);

    const loadPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('community_posts')
                .select('*, post_trades(trade)')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error loading posts:', error);
                return;
            }

            if (data && data.length > 0) {
                // Get unique user IDs and fetch their usernames
                const userIds = [...new Set(data.map(p => p.user_id))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', userIds);

                const usernameMap = {};
                if (profiles) {
                    profiles.forEach(p => { usernameMap[p.id] = p.username; });
                }

                const formattedPosts = data.map(p => ({
                    id: p.id,
                    user_id: p.user_id,
                    user: usernameMap[p.user_id] || 'Usuario',
                    avatar: (usernameMap[p.user_id] || 'U')[0].toUpperCase(),
                    time: formatTime(p.created_at),
                    content: p.content,
                    tagged_trades: (p.post_trades || []).map(pt => pt.trade),
                    image: false,
                    image_urls: p.image_urls,
                    video_url: p.video_url,
                    likes: p.likes_count || 0,
                    comments: p.comments_count || 0
                }));

                setPosts(formattedPosts);
            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error('Error loading posts:', err);
        } finally {
            setPostsLoading(false);
        }
    };

    const loadJobs = async () => {
        setJobsLoading(true);
        try {
            const { data, error } = await supabase
                .from('job_offers')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (error) {
                console.error('Error loading job offers:', error);
                return;
            }
            if (data && data.length > 0) {
                const userIds = [...new Set(data.map(p => p.user_id))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', userIds);
                const usernameMap = {};
                if (profiles) {
                    profiles.forEach(p => { usernameMap[p.id] = p.username; });
                }
                const formatted = data.map(p => ({
                    id: p.id,
                    user_id: p.user_id,
                    user: usernameMap[p.user_id] || 'Usuario',
                    avatar: (usernameMap[p.user_id] || 'U')[0].toUpperCase(),
                    time: formatTime(p.created_at),
                    content: p.content,
                    offer_type: p.offer_type,
                    trade: p.trade,
                    location: p.location,
                }));
                setJobOffers(formatted);
            } else {
                setJobOffers([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setJobsLoading(false);
        }
    };

    const checkJobSubscription = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase
            .from('job_subscribers')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();
        setIsSubscribedToJobs(!!data);
    };

    const toggleJobSubscription = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            showToast('Debes iniciar sesión para activar notificaciones.');
            return;
        }
        
        try {
            if (isSubscribedToJobs) {
                await supabase.from('job_subscribers').delete().eq('user_id', session.user.id);
                setIsSubscribedToJobs(false);
                showToast('Notificaciones de empleo desactivadas');
            } else {
                await supabase.from('job_subscribers').insert({ user_id: session.user.id });
                setIsSubscribedToJobs(true);
                showToast('Notificaciones de empleo activadas');
            }
        } catch (error) {
            console.error('Error toggling subscription:', error);
            showToast('Error al cambiar suscripción.');
        }
    };

    const handlePostJob = async () => {
        if (!newJobContent.trim()) return;
        setPublishingJob(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) {
                showToast('Debes iniciar sesión para publicar.');
                setPublishingJob(false);
                return;
            }

            // Get username
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single();
            const username = profile?.username || 'Usuario';

            const { data: jobData, error: jobError } = await supabase
                .from('job_offers')
                .insert({
                    user_id: user.id,
                    content: newJobContent,
                    offer_type: newJobType,
                    trade: newJobTrade,
                    location: newJobLocation
                })
                .select()
                .single();

            if (jobError) {
                console.error(jobError);
                showToast('Error al publicar oferta. ¿Se creó la tabla?');
                return;
            }

            // Notify subscribers
            const { data: subs } = await supabase.from('job_subscribers').select('user_id');
            if (subs && subs.length > 0) {
                const notifications = subs
                    .filter(s => s.user_id !== user.id)
                    .map(s => ({
                        recipient_id: s.user_id,
                        sender_id: user.id,
                        type: 'job_offer',
                        title: newJobType === 'seek_worker' ? '📢 Nueva oferta: Buscan trabajador' : '📢 Nueva oferta: Alguien busca trabajo',
                        body: newJobContent.length > 100 ? newJobContent.substring(0, 100) + '...' : newJobContent,
                    }));
                if (notifications.length > 0) {
                    await supabase.from('notifications').insert(notifications);
                }
            }

            const localJob = {
                id: jobData?.id || Date.now().toString(),
                user_id: user.id,
                user: username,
                avatar: username[0].toUpperCase(),
                time: 'ahora',
                content: newJobContent,
                offer_type: newJobType,
                trade: newJobTrade,
                location: newJobLocation
            };
            setJobOffers([localJob, ...jobOffers]);
            setNewJobContent('');
            setNewJobTrade('');
            setNewJobLocation('');
            showToast('Oferta publicada correctamente');
        } catch (err) {
            console.error(err);
            showToast('Error inesperado.');
        } finally {
            setPublishingJob(false);
        }
    };


    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('chat_now') || 'ahora';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    // Handle image selection
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const maxImages = 4;
        const remaining = maxImages - selectedImages.length;
        const newFiles = files.slice(0, remaining);

        if (newFiles.length === 0) return;

        setSelectedImages(prev => [...prev, ...newFiles]);

        // Generate previews
        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, { file, url: reader.result }]);
            };
            reader.readAsDataURL(file);
        });

        // Reset the input so the same file can be selected again
        e.target.value = '';
    };

    // Remove a selected image
    const removeImage = (index) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Handle video selection
    const handleVideoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Max 50MB
        if (file.size > 50 * 1024 * 1024) {
            alert("El video debe ocupar menos de 50MB");
            e.target.value = '';
            return;
        }

        setSelectedVideo(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setVideoPreview({ file, url: reader.result });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const removeVideo = () => {
        setSelectedVideo(null);
        setVideoPreview(null);
    };

    // Upload images to Supabase Storage
    const uploadImages = async (userId) => {
        const urls = [];
        for (const file of selectedImages) {
            const ext = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const { data, error } = await supabase.storage
                .from('community-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (error) {
                console.error('Upload error:', error);
                continue;
            }

            const { data: urlData } = supabase.storage
                .from('community-images')
                .getPublicUrl(fileName);

            if (urlData?.publicUrl) {
                urls.push(urlData.publicUrl);
            }
        }
        return urls;
    };

    // Upload video
    const uploadVideo = async (userId) => {
        if (!selectedVideo) return null;
        const ext = selectedVideo.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { data, error } = await supabase.storage
            .from('community-videos')
            .upload(fileName, selectedVideo, { cacheControl: '3600', upsert: false });

        if (error) {
            console.error('Video upload error:', error);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from('community-videos')
            .getPublicUrl(fileName);

        return urlData?.publicUrl || null;
    };

    // Watch for @ character in textarea
    const handleTextChange = (e) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        setNewPost(value);

        // Find the last @ before cursor
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            // Only show dropdown if there's no space after @ (user is still typing the mention)
            if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                setShowMentionDropdown(true);
                setMentionFilter(textAfterAt.toLowerCase());
                setMentionCursorPos(lastAtIndex);
                return;
            }
        }
        setShowMentionDropdown(false);
    };

    // Filter trades based on what user typed after @
    const filteredTrades = trades.filter(t =>
        t.name.toLowerCase().includes(mentionFilter) ||
        t.id.toLowerCase().includes(mentionFilter)
    );

    // Select a trade from dropdown
    const selectTrade = (trade) => {
        // Replace the @text with @TradeName
        const before = newPost.substring(0, mentionCursorPos);
        const afterAtText = newPost.substring(mentionCursorPos);
        const restAfterMention = afterAtText.substring(afterAtText.indexOf(' ') >= 0 ? afterAtText.indexOf(' ') : afterAtText.length);
        const nextSpaceOrEnd = afterAtText.indexOf(' ');
        const rest = nextSpaceOrEnd >= 0 ? afterAtText.substring(nextSpaceOrEnd) : '';

        const updatedPost = `${before}@${trade.name}${rest} `;
        setNewPost(updatedPost);

        // Add to tagged trades (avoid duplicates)
        if (!taggedTrades.find(t => t.id === trade.id)) {
            setTaggedTrades(prev => [...prev, trade]);
        }

        setShowMentionDropdown(false);
        textareaRef.current?.focus();
    };

    // Remove a tagged trade
    const removeTag = (tradeId) => {
        setTaggedTrades(prev => prev.filter(t => t.id !== tradeId));
    };

    // Publish post & send notifications
    const handlePost = async () => {
        if (!newPost.trim() && selectedImages.length === 0 && !selectedVideo) return;
        setPublishing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            // Get username
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single();

            const username = profile?.username || 'Usuario';

            // Upload images if any
            let imageUrls = [];
            if (selectedImages.length > 0) {
                imageUrls = await uploadImages(user.id);
            }

            // Upload video if any
            let videoUrl = null;
            if (selectedVideo) {
                videoUrl = await uploadVideo(user.id);
            }

            // Save post to database
            const { data: postData, error: postError } = await supabase
                .from('community_posts')
                .insert({
                    user_id: user.id,
                    content: newPost,
                    image_urls: imageUrls.length > 0 ? imageUrls : null,
                    video_url: videoUrl,
                })
                .select()
                .single();

            if (postError) {
                console.error('Post error:', postError);
            }

            // Insert tagged trades into bridge table
            if (!postError && postData && taggedTrades.length > 0) {
                await supabase.from('post_trades').insert(
                    taggedTrades.map(t => ({ post_id: postData.id, trade: t.id }))
                );
            }

            // Send notifications to all professionals of tagged trades
            if (taggedTrades.length > 0 && postData) {
                for (const trade of taggedTrades) {
                    // Find all professionals with this specialty
                    const { data: pros } = await supabase
                        .from('professionals')
                        .select('user_id')
                        .ilike('specialty', `%${trade.id}%`);

                    if (pros && pros.length > 0) {
                        const notifications = pros
                            .filter(pro => pro.user_id !== user.id) // Don't notify yourself
                            .map(pro => ({
                                recipient_id: pro.user_id,
                                sender_id: user.id,
                                type: 'trade_mention',
                                title: `📢 Nuevo trabajo para ${trade.name}`,
                                body: newPost.length > 100 ? newPost.substring(0, 100) + '...' : newPost,
                                trade_id: trade.id,
                                post_id: postData.id,
                            }));

                        if (notifications.length > 0) {
                            await supabase.from('notifications').insert(notifications);
                        }
                    }
                }
            }

            // Add to local feed with image previews
            const localPost = {
                id: postData?.id || Date.now().toString(),
                user_id: user.id,
                user: username,
                avatar: username[0].toUpperCase(),
                time: 'ahora',
                content: newPost,
                tagged_trades: taggedTrades.map(t => t.id),
                image: false,
                image_urls: imageUrls.length > 0 ? imageUrls : (imagePreviews.length > 0 ? imagePreviews.map(p => p.url) : null),
                video_url: videoUrl ? videoUrl : (videoPreview ? videoPreview.url : null),
                likes: 0,
                comments: 0,
            };
            setPosts([localPost, ...posts]);
            setNewPost('');
            setTaggedTrades([]);
            setSelectedImages([]);
            setImagePreviews([]);
            setSelectedVideo(null);
            setVideoPreview(null);
        } catch (err) {
            console.error(err);
        } finally {
            setPublishing(false);
        }
    };

    const toggleLike = (postId) => {
        const alreadyLiked = likedPosts.has(postId);
        const next = new Set(likedPosts);
        if (alreadyLiked) {
            next.delete(postId);
            setPosts(p => p.map(post => post.id === postId ? { ...post, likes: post.likes - 1 } : post));
        } else {
            next.add(postId);
            setPosts(p => p.map(post => post.id === postId ? { ...post, likes: post.likes + 1 } : post));
        }
        setLikedPosts(next);
    };

    // Render post content with highlighted @mentions
    const renderContent = (content, tagged) => {
        if (!tagged || tagged.length === 0) return content;

        let result = content;
        trades.forEach(trade => {
            if (tagged.includes(trade.id)) {
                const regex = new RegExp(`@${trade.name}`, 'gi');
                result = result.replace(regex, `⌁@${trade.name}⌁`);
            }
        });

        const parts = result.split('⌁');
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const tradeName = part.substring(1);
                const trade = trades.find(t => t.name.toLowerCase() === tradeName.toLowerCase());
                return (
                    <span key={i} style={{
                        background: trade ? `${trade.color}25` : 'var(--accent-soft)',
                        color: trade?.color || 'var(--accent)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '13px',
                    }}>
                        @{tradeName}
                    </span>
                );
            }
            return part;
        });
    };

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    return (
        <div className="page">
            <div className="page-content">
                {/* Toast notification */}
                <AnimatePresence>
                    {toastMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                position: 'fixed', top: '20px', left: '20px', right: '20px',
                                zIndex: 1000, padding: '14px 18px',
                                background: 'rgba(37, 99, 235, 0.95)',
                                color: 'white', borderRadius: '12px',
                                fontSize: '14px', fontWeight: '600',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                backdropFilter: 'blur(8px)',
                                textAlign: 'center'
                            }}
                        >
                            {toastMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div style={{ padding: '20px 20px 0' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h1 style={{ fontSize: '22px', fontWeight: '800' }}>{t('comm_title')}</h1>
                        {activeTab === 'jobs' && (
                            <button
                                onClick={toggleJobSubscription}
                                style={{
                                    background: isSubscribedToJobs ? 'var(--accent)' : 'var(--bg-secondary)',
                                    color: isSubscribedToJobs ? 'white' : 'var(--text-muted)',
                                    border: 'none',
                                    padding: '8px 12px',
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isSubscribedToJobs ? '0 4px 12px rgba(37,99,235,0.3)' : 'none'
                                }}
                            >
                                {isSubscribedToJobs ? <Bell size={16} /> : <BellOff size={16} />}
                                {isSubscribedToJobs ? 'Suscrito' : 'Avisos'}
                            </button>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div style={{ 
                        display: 'flex', 
                        background: 'var(--bg-secondary)', 
                        borderRadius: '12px',
                        padding: '4px',
                        marginBottom: '16px' 
                    }}>
                        <button
                            onClick={() => setActiveTab('general')}
                            style={{
                                flex: 1,
                                padding: '8px 0',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === 'general' ? 'var(--bg-card)' : 'transparent',
                                color: activeTab === 'general' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '14px',
                                fontWeight: activeTab === 'general' ? '700' : '600',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'general' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Muro General
                        </button>
                        <button
                            onClick={() => setActiveTab('jobs')}
                            style={{
                                flex: 1,
                                padding: '8px 0',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === 'jobs' ? 'var(--bg-card)' : 'transparent',
                                color: activeTab === 'jobs' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '14px',
                                fontWeight: activeTab === 'jobs' ? '700' : '600',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'jobs' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Ofertas y Empleo
                        </button>
                    </div>

                    {activeTab === 'general' ? (
                        <>
                            {/* ── Trade Filter Bar ── */}
                    <div
                        ref={filterScrollRef}
                        style={{
                            display: 'flex',
                            gap: '8px',
                            overflowX: 'auto',
                            paddingBottom: '12px',
                            marginBottom: '4px',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        {/* "Todos" chip */}
                        <button
                            onClick={() => setActiveFilter('all')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 16px',
                                borderRadius: '20px',
                                border: activeFilter === 'all'
                                    ? '1.5px solid var(--accent)'
                                    : '1.5px solid var(--border-light)',
                                background: activeFilter === 'all'
                                    ? 'var(--accent)'
                                    : 'var(--bg-card)',
                                color: activeFilter === 'all'
                                    ? '#fff'
                                    : 'var(--text-secondary)',
                                fontSize: '13px',
                                fontWeight: '600',
                                fontFamily: 'Inter, sans-serif',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                                boxShadow: activeFilter === 'all'
                                    ? '0 2px 8px rgba(37, 99, 235, 0.3)'
                                    : 'none',
                            }}
                        >
                            <Filter size={13} />
                            {t('comm_filter_all')}
                        </button>

                        {/* Trade chips */}
                        {trades.map(trade => {
                            const isActive = activeFilter === trade.id;
                            return (
                                <button
                                    key={trade.id}
                                    onClick={() => setActiveFilter(isActive ? 'all' : trade.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '7px 14px',
                                        borderRadius: '20px',
                                        border: isActive
                                            ? `1.5px solid ${trade.color}`
                                            : '1.5px solid var(--border-light)',
                                        background: isActive
                                            ? `${trade.color}18`
                                            : 'var(--bg-card)',
                                        color: isActive
                                            ? trade.color
                                            : 'var(--text-secondary)',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        fontFamily: 'Inter, sans-serif',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        transition: 'all 0.2s ease',
                                        boxShadow: isActive
                                            ? `0 2px 8px ${trade.color}25`
                                            : 'none',
                                    }}
                                >
                                    <trade.icon size={13} />
                                    {t(trade.tkey) || trade.name}
                                </button>
                            );
                        })}
                    </div>

                    {/* New post */}
                    <div className="card" style={{ padding: '14px', position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', fontWeight: '700', flexShrink: 0
                            }}>T</div>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <textarea
                                    ref={textareaRef}
                                    value={newPost}
                                    onChange={handleTextChange}
                                    placeholder={t('comm_placeholder')}
                                    style={{ minHeight: '60px', padding: '10px', fontSize: '14px' }}
                                />

                                {/* @mention dropdown */}
                                <AnimatePresence>
                                    {showMentionDropdown && filteredTrades.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                top: '100%',
                                                marginTop: '4px',
                                                maxHeight: '240px',
                                                overflowY: 'auto',
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-light)',
                                                borderRadius: 'var(--radius)',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                zIndex: 50,
                                            }}
                                        >
                                            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-secondary)' }}>
                                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {t('comm_mention_trade')}
                                                </p>
                                            </div>
                                            {filteredTrades.map((trade) => (
                                                <button
                                                    key={trade.id}
                                                    onClick={() => selectTrade(trade)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        borderBottom: '1px solid var(--border)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        fontFamily: 'Inter',
                                                        textAlign: 'left',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-card)'}
                                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                >
                                                    <div style={{
                                                        width: '28px', height: '28px', borderRadius: '8px',
                                                        background: `${trade.color}20`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <trade.icon size={14} color={trade.color} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: '600', fontSize: '13px' }}>{trade.name}</p>
                                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{trade.group}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Tagged trades chips */}
                                {taggedTrades.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                        {taggedTrades.map(trade => (
                                            <span
                                                key={trade.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 10px',
                                                    borderRadius: '16px',
                                                    background: `${trade.color}20`,
                                                    color: trade.color,
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                <Bell size={10} />
                                                {trade.name}
                                                <button
                                                    onClick={() => removeTag(trade.id)}
                                                    style={{
                                                        background: 'none', border: 'none', color: trade.color,
                                                        cursor: 'pointer', padding: '0 0 0 2px', fontSize: '14px', lineHeight: 1
                                                    }}
                                                >×</button>
                                            </span>
                                        ))}
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                            🔔 Se notificará a estos profesionales
                                        </span>
                                    </div>
                                )}

                                {/* Image previews */}
                                {imagePreviews.length > 0 && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: imagePreviews.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                                        gap: '8px',
                                        marginTop: '10px',
                                    }}>
                                        {imagePreviews.map((preview, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}
                                            >
                                                <img
                                                    src={preview.url}
                                                    alt={`Preview ${index + 1}`}
                                                    style={{
                                                        width: '100%',
                                                        height: imagePreviews.length === 1 ? '200px' : '120px',
                                                        objectFit: 'cover',
                                                        borderRadius: '12px',
                                                        border: '1px solid var(--border-light)',
                                                    }}
                                                />
                                                <button
                                                    onClick={() => removeImage(index)}
                                                    style={{
                                                        position: 'absolute', top: '6px', right: '6px',
                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                        background: 'rgba(0,0,0,0.7)', border: 'none',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', color: 'white',
                                                        backdropFilter: 'blur(4px)',
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </motion.div>
                                        ))}
                                        {imagePreviews.length < 4 && (
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => fileInputRef.current?.click()}
                                                style={{
                                                    height: imagePreviews.length === 1 ? '200px' : '120px',
                                                    borderRadius: '12px',
                                                    border: '2px dashed var(--border-light)',
                                                    background: 'var(--bg-secondary)',
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    gap: '6px', cursor: 'pointer', color: 'var(--text-muted)',
                                                }}
                                            >
                                                <Plus size={20} />
                                                <span style={{ fontSize: '11px' }}>Añadir</span>
                                            </motion.button>
                                        )}
                                    </div>
                                )}

                                {/* Video preview */}
                                {videoPreview && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginTop: '10px' }}
                                    >
                                        <video
                                            src={videoPreview.url}
                                            controls
                                            style={{
                                                width: '100%',
                                                maxHeight: '300px',
                                                backgroundColor: '#000',
                                                objectFit: 'contain',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-light)',
                                            }}
                                        />
                                        <button
                                            onClick={removeVideo}
                                            style={{
                                                position: 'absolute', top: '6px', right: '6px',
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                background: 'rgba(0,0,0,0.7)', border: 'none',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', color: 'white',
                                                backdropFilter: 'blur(4px)',
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </motion.div>
                                )}

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelect}
                                    style={{ display: 'none' }}
                                />

                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/webm"
                                    onChange={handleVideoSelect}
                                    style={{ display: 'none' }}
                                />

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={selectedVideo !== null}
                                            style={{
                                                background: selectedImages.length > 0 ? 'var(--accent-soft)' : 'none',
                                                border: 'none',
                                                color: selectedImages.length > 0 ? 'var(--accent)' : 'var(--text-muted)',
                                                cursor: selectedVideo ? 'not-allowed' : 'pointer',
                                                borderRadius: '8px',
                                                padding: '6px 10px',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                fontSize: '12px', fontWeight: '600', fontFamily: 'Inter',
                                                opacity: selectedVideo ? 0.3 : 1,
                                                transition: 'var(--transition)',
                                            }}
                                        >
                                            <Camera size={18} />
                                            {selectedImages.length > 0 && (
                                                <span>{selectedImages.length}/4</span>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => videoInputRef.current?.click()}
                                            disabled={selectedImages.length > 0 || selectedVideo !== null}
                                            style={{
                                                background: selectedVideo ? 'var(--accent-soft)' : 'none',
                                                border: 'none',
                                                color: selectedVideo ? 'var(--accent)' : 'var(--text-muted)',
                                                cursor: (selectedImages.length > 0 || selectedVideo !== null) ? 'not-allowed' : 'pointer',
                                                borderRadius: '8px',
                                                padding: '6px 10px',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                fontSize: '12px', fontWeight: '600', fontFamily: 'Inter',
                                                opacity: (selectedImages.length > 0 || selectedVideo !== null) ? 0.3 : 1,
                                                transition: 'var(--transition)',
                                            }}
                                        >
                                            <Video size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setNewPost(prev => prev + '@');
                                                setShowMentionDropdown(true);
                                                setMentionFilter('');
                                                setMentionCursorPos(newPost.length);
                                            }}
                                            style={{
                                                background: 'var(--accent-soft)', border: 'none',
                                                color: 'var(--accent)', cursor: 'pointer',
                                                borderRadius: '6px', padding: '4px 10px',
                                                fontSize: '13px', fontWeight: '700', fontFamily: 'Inter',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}
                                        >
                                            {t('comm_trade_btn')}
                                        </button>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handlePost}
                                        disabled={publishing || (!newPost.trim() && selectedImages.length === 0)}
                                        style={{ padding: '8px 20px', fontSize: '13px', opacity: publishing ? 0.6 : 1 }}
                                    >
                                        <Send size={14} /> {publishing ? t('comm_publishing') : t('comm_publish')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                        </>
                    ) : (
                        <div className="card" style={{ padding: '16px', position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <button
                                    onClick={() => setNewJobType('seek_worker')}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                                        background: newJobType === 'seek_worker' ? 'var(--accent)' : 'var(--bg-secondary)',
                                        color: newJobType === 'seek_worker' ? 'white' : 'var(--text-secondary)',
                                        fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}
                                >
                                    <Briefcase size={16} /> Busco Trabajador
                                </button>
                                <button
                                    onClick={() => setNewJobType('seek_job')}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                                        background: newJobType === 'seek_job' ? '#10b981' : 'var(--bg-secondary)',
                                        color: newJobType === 'seek_job' ? 'white' : 'var(--text-secondary)',
                                        fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}
                                >
                                    <Users size={16} /> Busco Trabajo
                                </button>
                            </div>
                            
                            <select
                                value={newJobTrade}
                                onChange={(e) => setNewJobTrade(e.target.value)}
                                style={{ width: '100%', padding: '12px', fontSize: '14px', marginBottom: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: newJobTrade ? 'var(--text-primary)' : 'var(--text-muted)' }}
                            >
                                <option value="" disabled>Selecciona el oficio (Obligatorio)...</option>
                                {trades.map(trade => (
                                    <option key={trade.id} value={trade.id}>{t(trade.tkey) || trade.name}</option>
                                ))}
                            </select>

                            <select
                                value={newJobLocation}
                                onChange={(e) => setNewJobLocation(e.target.value)}
                                style={{ width: '100%', padding: '12px', fontSize: '14px', marginBottom: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: newJobLocation ? 'var(--text-primary)' : 'var(--text-muted)' }}
                            >
                                <option value="" disabled>Ubicación (Obligatorio)...</option>
                                {[
                                    "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ciudad Real", "Córdoba", "Cuenca", "Girona", "Granada", "Guadalajara", "Gipuzkoa", "Huelva", "Huesca", "Illes Balears", "Jaén", "A Coruña", "La Rioja", "Las Palmas", "León", "Lleida", "Lugo", "Madrid", "Málaga", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca", "Segovia", "Sevilla", "Soria", "Tarragona", "Santa Cruz de Tenerife", "Teruel", "Toledo", "Valencia", "Valladolid", "Bizkaia", "Zamora", "Zaragoza", "Ceuta", "Melilla"
                                ].map(prov => (
                                    <option key={prov} value={prov}>{prov}</option>
                                ))}
                            </select>



                            <textarea
                                value={newJobContent}
                                onChange={(e) => setNewJobContent(e.target.value)}
                                placeholder={newJobType === 'seek_worker' ? "¿Qué perfil exacto necesitas para tu obra/empresa?" : "¿Cuál es tu especialidad y qué trabajo buscas?"}
                                style={{ minHeight: '80px', padding: '12px', fontSize: '14px', marginBottom: '12px', width: '100%', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={handlePostJob}
                                    disabled={publishingJob || !newJobContent.trim() || !newJobTrade || !newJobLocation.trim()}
                                    style={{ padding: '10px 24px', fontSize: '14px', opacity: (publishingJob || !newJobContent.trim() || !newJobTrade || !newJobLocation.trim()) ? 0.6 : 1 }}
                                >
                                    <Send size={16} /> {publishingJob ? 'Publicando...' : 'Publicar Anuncio'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Posts */}
                <div style={{ padding: '16px 20px' }}>
                    {activeTab === 'general' ? (
                        <>
                            {/* Empty state when filter has no matches */}
                            {activeFilter !== 'all' && posts.filter(p => p.tagged_trades && p.tagged_trades.includes(activeFilter)).length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-muted)',
                        }}>
                            {(() => {
                                const trade = trades.find(t => t.id === activeFilter);
                                return trade ? (
                                    <>
                                        <div style={{
                                            width: '56px', height: '56px', borderRadius: '50%',
                                            background: `${trade.color}15`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto 12px',
                                        }}>
                                            <trade.icon size={24} color={trade.color} />
                                        </div>
                                        <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            {t(trade.tkey) || trade.name}
                                        </p>
                                        <p style={{ fontSize: '13px' }}>
                                            No hay publicaciones con este oficio todavía.
                                        </p>
                                    </>
                                ) : null;
                            })()}
                        </div>
                    )}
                    {(activeFilter === 'all' ? posts : posts.filter(p => p.tagged_trades && p.tagged_trades.includes(activeFilter))).map((post, i) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="card"
                            style={{ marginBottom: '12px', padding: '16px' }}
                        >
                            {/* Post header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <div
                                    onClick={() => post.user_id && navigate(`/professional/${post.user_id}`)}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: 'var(--bg-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '16px', fontWeight: '700', color: 'var(--accent)',
                                        border: '1px solid var(--border)',
                                        cursor: post.user_id ? 'pointer' : 'default'
                                    }}>
                                    {post.avatar}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p
                                        onClick={() => post.user_id && navigate(`/professional/${post.user_id}`)}
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: post.user_id ? 'pointer' : 'default'
                                        }}
                                    >
                                        {post.user}
                                    </p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{post.time}</p>
                                </div>
                                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>

                            {/* Content with highlighted mentions */}
                            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: post.image ? '12px' : '14px' }}>
                                {renderContent(post.content, post.tagged_trades)}
                            </p>

                            {/* Trade tags on the post */}
                            {post.tagged_trades && post.tagged_trades.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                    {post.tagged_trades.map(tradeId => {
                                        const trade = trades.find(t => t.id === tradeId);
                                        if (!trade) return null;
                                        return (
                                            <span key={tradeId} style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '3px 10px', borderRadius: '12px',
                                                background: `${trade.color}15`,
                                                border: `1px solid ${trade.color}30`,
                                                color: trade.color,
                                                fontSize: '11px', fontWeight: '600'
                                            }}>
                                                <trade.icon size={10} />
                                                {t(trade.tkey) || trade.name}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Video */}
                            {post.video_url && (
                                <div style={{
                                    marginBottom: '14px',
                                    borderRadius: 'var(--radius)',
                                    overflow: 'hidden',
                                }}>
                                    <video
                                        src={post.video_url}
                                        controls
                                        style={{
                                            width: '100%',
                                            maxHeight: '350px',
                                            backgroundColor: '#000',
                                            objectFit: 'contain',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-light)'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Image */}
                            {post.image_urls && post.image_urls.length > 0 ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: post.image_urls.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                                    gap: '6px',
                                    marginBottom: '14px',
                                    borderRadius: 'var(--radius)',
                                    overflow: 'hidden',
                                }}>
                                    {post.image_urls.map((url, imgIdx) => (
                                        <img
                                            key={imgIdx}
                                            src={url}
                                            alt={`Post image ${imgIdx + 1}`}
                                            onClick={() => setLightbox({ urls: post.image_urls, index: imgIdx })}
                                            style={{
                                                width: '100%',
                                                height: post.image_urls.length === 1 ? '220px' : '140px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                cursor: 'zoom-in',
                                                transition: 'opacity 0.2s',
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : post.image && (
                                <div style={{
                                    height: '180px',
                                    borderRadius: 'var(--radius)',
                                    background: `linear-gradient(135deg, ${post.imageColor}30, ${post.imageColor}10)`,
                                    border: `1px solid ${post.imageColor}20`,
                                    marginBottom: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Image size={32} color={`${post.imageColor}60`} />
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                {/* Like button */}
                                <button
                                    onClick={() => toggleLike(post.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        background: 'none', border: 'none',
                                        cursor: 'pointer',
                                        color: likedPosts.has(post.id) ? '#ef4444' : 'var(--text-muted)',
                                        fontSize: '13px', fontFamily: 'Inter', fontWeight: '600',
                                        padding: '4px 0',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill={likedPosts.has(post.id) ? '#ef4444' : 'none'} stroke={likedPosts.has(post.id) ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                    {post.likes}
                                </button>
                                {/* Comment count */}
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        color: 'var(--text-muted)',
                                        fontSize: '13px', fontWeight: '600',
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    {post.comments}
                                </div>
                                {/* Reply privately button */}
                                <button
                                    onClick={async () => {
                                        try {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            const user = session?.user;
                                            if (!user) {
                                                showToast('Debes iniciar sesión para responder.');
                                                return;
                                            }
                                            const postUserId = post.user_id;

                                            if (!postUserId) {
                                                // Sample post — show feedback
                                                showToast('Este es un post de ejemplo. Solo puedes responder a publicaciones reales de otros usuarios.');
                                                return;
                                            }

                                            if (postUserId === user.id) {
                                                showToast('No puedes responderte a ti mismo.');
                                                return;
                                            }

                                            // Check for existing conversation via conversation_participants
                                            const { data: myConvs, error: findErr } = await supabase
                                                .from('conversation_participants')
                                                .select('conversation_id')
                                                .eq('user_id', user.id);

                                            if (findErr) {
                                                console.error('Error finding conversation:', findErr);
                                                showToast('Error al buscar conversación. Inténtalo de nuevo.');
                                                return;
                                            }

                                            const myConvIds = (myConvs || []).map(c => c.conversation_id);
                                            let existingConvId = null;
                                            if (myConvIds.length > 0) {
                                                const { data: shared } = await supabase
                                                    .from('conversation_participants')
                                                    .select('conversation_id')
                                                    .eq('user_id', postUserId)
                                                    .in('conversation_id', myConvIds)
                                                    .limit(1)
                                                    .maybeSingle();
                                                if (shared) existingConvId = shared.conversation_id;
                                            }

                                            if (existingConvId) {
                                                navigate(`/chat/${existingConvId}`);
                                            } else {
                                                const { data: conv, error: createErr } = await supabase
                                                    .from('conversations')
                                                    .insert({
                                                        original_post_content: post.content.slice(0, 200),
                                                        poster_name: post.user,
                                                        last_message: t('chat_reply_label'),
                                                        last_message_at: new Date().toISOString()
                                                    })
                                                    .select()
                                                    .single();

                                                if (createErr) {
                                                    console.error('Error creating conversation:', createErr);
                                                    showToast('Error al crear conversación. Inténtalo de nuevo.');
                                                    return;
                                                }

                                                if (conv) {
                                                    // Add both participants
                                                    await supabase.from('conversation_participants').insert([
                                                        { conversation_id: conv.id, user_id: user.id },
                                                        { conversation_id: conv.id, user_id: postUserId },
                                                    ]);
                                                    await supabase.from('messages').insert({
                                                        conversation_id: conv.id,
                                                        sender_id: user.id,
                                                        content: `${t('chat_auto_msg')} "${post.content.slice(0, 100)}..."`
                                                    });
                                                    navigate(`/chat/${conv.id}`);
                                                }
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            showToast('Error inesperado. Inténtalo de nuevo.');
                                        }
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        background: 'var(--accent-soft)', border: 'none',
                                        cursor: 'pointer', color: 'var(--accent)',
                                        fontSize: '12px', fontFamily: 'Inter', fontWeight: '600',
                                        marginLeft: 'auto', padding: '6px 12px', borderRadius: '16px'
                                    }}
                                >
                                    <Reply size={14} /> {t('comm_reply_private')}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                        </>
                    ) : (
                        /* Render Job Offers */
                        <>
                            {jobOffers.length === 0 && !jobsLoading && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                    <Briefcase size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                    <p>No hay ofertas de empleo todavía.</p>
                                </div>
                            )}
                            {jobOffers.map((job, i) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="card"
                                    style={{ marginBottom: '12px', padding: '16px', borderLeft: job.offer_type === 'seek_worker' ? '4px solid var(--accent)' : '4px solid #10b981' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                        <div
                                            onClick={() => job.user_id && navigate(`/professional/${job.user_id}`)}
                                            style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                background: 'var(--bg-secondary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '16px', fontWeight: '700', color: 'var(--accent)',
                                                border: '1px solid var(--border)',
                                                cursor: job.user_id ? 'pointer' : 'default'
                                            }}>
                                            {job.avatar}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p
                                                onClick={() => job.user_id && navigate(`/professional/${job.user_id}`)}
                                                style={{ fontSize: '14px', fontWeight: '600', cursor: job.user_id ? 'pointer' : 'default' }}
                                            >
                                                {job.user}
                                            </p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{job.time}</p>
                                        </div>
                                        <span style={{ 
                                            background: job.offer_type === 'seek_worker' ? 'var(--accent-soft)' : '#10b98120',
                                            color: job.offer_type === 'seek_worker' ? 'var(--accent)' : '#10b981',
                                            padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                                            display: 'flex', alignItems: 'center', gap: '4px'
                                        }}>
                                            {job.offer_type === 'seek_worker' ? <Briefcase size={12} /> : <Users size={12} />}
                                            {job.offer_type === 'seek_worker' ? 'Busca Trabajador' : 'Busca Trabajo'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                                        {job.trade && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                                            }}>
                                                <Briefcase size={12} /> {(() => {
                                                    const trade = trades.find(t_item => t_item.id === job.trade);
                                                    return trade ? (t(trade.tkey) || trade.name) : job.trade;
                                                })()}
                                            </span>
                                        )}
                                        {job.location && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                                            }}>
                                                <MapPin size={12} /> {job.location}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '14px', whiteSpace: 'pre-wrap' }}>
                                        {job.content}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const { data: { session } } = await supabase.auth.getSession();
                                                    const user = session?.user;
                                                    if (!user) {
                                                        showToast('Debes iniciar sesión para responder.');
                                                        return;
                                                    }
                                                    if (job.user_id === user.id) {
                                                        showToast('No puedes responder a tu propio anuncio.');
                                                        return;
                                                    }

                                                    const { data: myConvs } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id);
                                                    const myConvIds = (myConvs || []).map(c => c.conversation_id);
                                                    let existingConvId = null;
                                                    if (myConvIds.length > 0) {
                                                        const { data: shared } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', job.user_id).in('conversation_id', myConvIds).limit(1).maybeSingle();
                                                        if (shared) existingConvId = shared.conversation_id;
                                                    }

                                                    if (existingConvId) {
                                                        navigate(`/chat/${existingConvId}`);
                                                    } else {
                                                        const { data: conv, error: createErr } = await supabase.from('conversations').insert({
                                                            original_post_content: job.content.slice(0, 200),
                                                            poster_name: job.user,
                                                            last_message: 'Respuesta a oferta de empleo',
                                                            last_message_at: new Date().toISOString()
                                                        }).select().single();

                                                        if (createErr) throw createErr;
                                                        
                                                        if (conv) {
                                                            await supabase.from('conversation_participants').insert([
                                                                { conversation_id: conv.id, user_id: user.id },
                                                                { conversation_id: conv.id, user_id: job.user_id },
                                                            ]);
                                                            await supabase.from('messages').insert({
                                                                conversation_id: conv.id,
                                                                sender_id: user.id,
                                                                content: `Hola! Te escribo por tu anuncio: "${job.content.slice(0, 60)}..."`
                                                            });
                                                            navigate(`/chat/${conv.id}`);
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                    showToast('Error al iniciar conversación.');
                                                }
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                background: 'var(--accent-soft)', border: 'none',
                                                cursor: 'pointer', color: 'var(--accent)',
                                                fontSize: '12px', fontFamily: 'Inter', fontWeight: '600',
                                                padding: '6px 12px', borderRadius: '16px'
                                            }}
                                        >
                                            <Reply size={14} /> Responder
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            <BottomNav />

            {/* Image Lightbox */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightbox(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 2000,
                            background: 'rgba(0,0,0,0.96)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        {/* Close */}
                        <button
                            onClick={() => setLightbox(null)}
                            style={{
                                position: 'absolute', top: '16px', right: '16px',
                                background: 'rgba(255,255,255,0.1)', border: 'none',
                                borderRadius: '50%', width: '40px', height: '40px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)',
                                zIndex: 10,
                            }}
                        >
                            <X size={20} />
                        </button>

                        {/* Counter */}
                        {lightbox.urls.length > 1 && (
                            <div style={{
                                position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
                                color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600',
                                background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '20px',
                                backdropFilter: 'blur(4px)',
                            }}>
                                {lightbox.index + 1} / {lightbox.urls.length}
                            </div>
                        )}

                        {/* Prev arrow */}
                        {lightbox.index > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setLightbox(prev => ({ ...prev, index: prev.index - 1 })); }}
                                style={{
                                    position: 'absolute', left: '12px',
                                    background: 'rgba(255,255,255,0.12)', border: 'none',
                                    borderRadius: '50%', width: '44px', height: '44px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)',
                                }}
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}

                        {/* Image */}
                        <motion.img
                            key={lightbox.index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            src={lightbox.urls[lightbox.index]}
                            alt=""
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                maxWidth: 'calc(100vw - 40px)',
                                maxHeight: 'calc(100vh - 100px)',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                            }}
                        />

                        {/* Next arrow */}
                        {lightbox.index < lightbox.urls.length - 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setLightbox(prev => ({ ...prev, index: prev.index + 1 })); }}
                                style={{
                                    position: 'absolute', right: '12px',
                                    background: 'rgba(255,255,255,0.12)', border: 'none',
                                    borderRadius: '50%', width: '44px', height: '44px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)',
                                }}
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Community;
