import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Image, Send, MoreHorizontal, Bell, Reply, X, Plus, Camera, Video } from 'lucide-react';
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
        content: 'Finished the framing on this beautiful lot. Another one worth of experience to the field.',
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
        user: 'Sarah Burke',
        avatar: 'S',
        time: 'hace 8h',
        content: 'Just completed this custom shelving unit for a client\'s home office. Walnut and steel — a perfect combination!',
        tagged_trades: [],
        image: true,
        imageColor: '#22c55e',
        likes: 89,
        comments: 23
    },
];

const Community = () => {
    const [posts, setPosts] = useState(samplePosts);
    const [newPost, setNewPost] = useState('');
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
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('community_posts')
                .select(`
                    *,
                    profiles:user_id ( username )
                `)
                .order('created_at', { ascending: false })
                .limit(50); // Fetch latest 50 posts

            if (!error && data) {
                const formattedPosts = data.map(p => ({
                    id: p.id,
                    user_id: p.user_id,
                    user: p.profiles?.username || 'Usuario',
                    avatar: (p.profiles?.username || 'U')[0].toUpperCase(),
                    time: formatTime(p.created_at),
                    content: p.content,
                    tagged_trades: p.tagged_trades || [],
                    image: false,
                    image_urls: p.image_urls,
                    video_url: p.video_url,
                    likes: p.likes_count || 0,
                    comments: p.comments_count || 0
                }));

                // Prepend database posts to sample posts
                setPosts([...formattedPosts, ...samplePosts]);
            }
        } catch (err) {
            console.error(err);
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
            const { data: { user } } = await supabase.auth.getUser();
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
                    tagged_trades: taggedTrades.map(t => t.id),
                    image_urls: imageUrls.length > 0 ? imageUrls : null,
                    video_url: videoUrl,
                })
                .select()
                .single();

            if (postError) {
                console.error('Post error:', postError);
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

    return (
        <div className="page">
            <div className="page-content">
                {/* Header */}
                <div style={{ padding: '20px 20px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h1 style={{ fontSize: '22px', fontWeight: '800' }}>{t('comm_title')}</h1>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('comm_new')}</span>
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
                                                textareaRef.current?.focus();
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
                </div>

                {/* Posts */}
                <div style={{ padding: '16px 20px' }}>
                    {posts.map((post, i) => (
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
                                                {trade.name}
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
                                            style={{
                                                width: '100%',
                                                height: post.image_urls.length === 1 ? '220px' : '140px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                <button
                                    onClick={() => toggleLike(post.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: likedPosts.has(post.id) ? '#ef4444' : 'var(--text-muted)',
                                        fontSize: '13px', fontFamily: 'Inter',
                                        transition: 'var(--transition)'
                                    }}
                                >
                                    <Heart size={16} fill={likedPosts.has(post.id) ? '#ef4444' : 'transparent'} />
                                    {post.likes}
                                </button>
                                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'Inter' }}>
                                    <MessageCircle size={16} /> {post.comments}
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (!user) return;
                                            // Create or find conversation
                                            const postUserId = post.user_id || 'sample-user';
                                            if (postUserId === user.id || postUserId === 'sample-user') {
                                                // For demo: create a conversation with a fake user
                                                const { data: conv, error } = await supabase
                                                    .from('conversations')
                                                    .insert({
                                                        participant_1: user.id,
                                                        participant_2: user.id,
                                                        original_post_content: post.content.slice(0, 200),
                                                        poster_name: post.user,
                                                        last_message: t('chat_reply_label'),
                                                        last_message_at: new Date().toISOString()
                                                    })
                                                    .select()
                                                    .single();
                                                if (conv) {
                                                    // Send initial message
                                                    await supabase.from('messages').insert({
                                                        conversation_id: conv.id,
                                                        sender_id: user.id,
                                                        content: `${t('chat_auto_msg')} "${post.content.slice(0, 100)}..."`
                                                    });
                                                    navigate(`/chat/${conv.id}`);
                                                }
                                            } else {
                                                // Real user: check for existing conversation
                                                const { data: existing } = await supabase
                                                    .from('conversations')
                                                    .select('id')
                                                    .or(`and(participant_1.eq.${user.id},participant_2.eq.${postUserId}),and(participant_1.eq.${postUserId},participant_2.eq.${user.id})`)
                                                    .maybeSingle();
                                                if (existing) {
                                                    navigate(`/chat/${existing.id}`);
                                                } else {
                                                    const { data: conv } = await supabase
                                                        .from('conversations')
                                                        .insert({
                                                            participant_1: user.id,
                                                            participant_2: postUserId,
                                                            original_post_content: post.content.slice(0, 200),
                                                            poster_name: post.user,
                                                            last_message: t('chat_reply_label'),
                                                            last_message_at: new Date().toISOString()
                                                        })
                                                        .select()
                                                        .single();
                                                    if (conv) {
                                                        await supabase.from('messages').insert({
                                                            conversation_id: conv.id,
                                                            sender_id: user.id,
                                                            content: `${t('chat_auto_msg')} "${post.content.slice(0, 100)}..."`
                                                        });
                                                        navigate(`/chat/${conv.id}`);
                                                    }
                                                }
                                            }
                                        } catch (e) { console.error(e); }
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
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default Community;
