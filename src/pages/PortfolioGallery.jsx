import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Star, Plus, Trash2, Images, MessageSquare, Send, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

function PortfolioGallery() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [actualProfileId, setActualProfileId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef(null);

    // Comments State
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');

    const isOwner = currentUserId && actualProfileId && currentUserId === actualProfileId;

    useEffect(() => {
        if (selectedPost) {
            const postId = selectedPost[0].group_id || selectedPost[0].id;
            loadComments(postId);
            setShowComments(false);
        }
    }, [selectedPost]);

    const loadComments = async (postId) => {
        setLoadingComments(true);
        try {
            const { data, error } = await supabase
                .from('portfolio_comments')
                .select(`
                    id, content, created_at, user_id, is_pinned,
                    profiles:user_id ( full_name, username, avatar_url )
                `)
                .eq('post_id', postId)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: true });
            
            if (!error && data) {
                setComments(data);
            }
        } catch (e) {
            console.error('Error loading comments:', e);
        } finally {
            setLoadingComments(false);
        }
    };

    const addComment = async () => {
        if (!newComment.trim() || !currentUserId || !selectedPost) return;
        const postId = selectedPost[0].group_id || selectedPost[0].id;
        try {
            const { error } = await supabase
                .from('portfolio_comments')
                .insert({
                    post_id: postId,
                    user_id: currentUserId,
                    content: newComment.trim()
                });
            if (!error) {
                setNewComment('');
                loadComments(postId);
            }
        } catch (e) {
            console.error('Error adding comment:', e);
        }
    };

    const deleteComment = async (commentId) => {
        try {
            const { error } = await supabase
                .from('portfolio_comments')
                .delete()
                .eq('id', commentId);
            if (!error) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            }
        } catch (e) {
            console.error('Error deleting comment:', e);
        }
    };

    const togglePin = async (commentId, currentPinStatus) => {
        try {
            const { error } = await supabase
                .from('portfolio_comments')
                .update({ is_pinned: !currentPinStatus })
                .eq('id', commentId);
            if (!error) {
                const postId = selectedPost[0].group_id || selectedPost[0].id;
                loadComments(postId);
            }
        } catch (e) {
            console.error('Error toggling pin:', e);
        }
    };

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        };
        checkUser();
        loadImages();
    }, [id]);

    const loadImages = async () => {
        setLoading(true);
        try {
            let actualId = id;
            if (id && !id.includes('-')) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', id)
                    .single();
                if (profile) actualId = profile.id;
            }
            setActualProfileId(actualId);

            const { data, error } = await supabase
                .from('portfolio_images')
                .select('*')
                .eq('professional_id', actualId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setImages(data);
            }
        } catch (error) {
            console.error('Error loading portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    // Group images by group_id into "posts"
    const posts = React.useMemo(() => {
        const groups = {};
        images.forEach(img => {
            const gid = img.group_id || img.id; // fallback for old ungrouped images
            if (!groups[gid]) groups[gid] = [];
            groups[gid].push(img);
        });
        // Sort each group internally by created_at, and sort posts by earliest image
        return Object.values(groups)
            .map(group => group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
            .sort((a, b) => new Date(b[0].created_at) - new Date(a[0].created_at));
    }, [images]);

    const toggleHighlight = async (e, image) => {
        e.stopPropagation();
        const currentlyHighlighted = images.filter(img => img.is_highlighted).length;
        if (!image.is_highlighted && currentlyHighlighted >= 4) {
            setErrorMsg("No puedes destacar más de 4 imágenes.");
            setTimeout(() => setErrorMsg(''), 3000);
            return;
        }
        try {
            const newStatus = !image.is_highlighted;
            // Optimistically update both the images list AND the currently open post
            setImages(prev => prev.map(img => img.id === image.id ? { ...img, is_highlighted: newStatus } : img));
            setSelectedPost(prev => prev ? prev.map(img => img.id === image.id ? { ...img, is_highlighted: newStatus } : img) : prev);
            const { error } = await supabase
                .from('portfolio_images')
                .update({ is_highlighted: newStatus })
                .eq('id', image.id);
            if (error) {
                loadImages(); // revert on error
                console.error("Error toggling highlight", error);
            }
        } catch (error) {
            console.error("Error toggling highlight", error);
        }
    };

    const deletePost = async (post) => {
        if (!window.confirm('¿Eliminar esta publicación?')) return;
        try {
            const ids = post.map(img => img.id);
            const { error } = await supabase
                .from('portfolio_images')
                .delete()
                .in('id', ids);
            if (!error) {
                setImages(prev => prev.filter(img => !ids.includes(img.id)));
                setSelectedPost(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length || !actualProfileId) return;
        setUploading(true);
        setUploadProgress({ current: 0, total: files.length });

        // All files in this upload share the same group_id
        const groupId = crypto.randomUUID();

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadProgress({ current: i + 1, total: files.length });
                const ext = file.name.split('.').pop();
                const fileName = `${actualProfileId}/portfolio_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

                const { error: uploadErr } = await supabase.storage
                    .from('portfolio')
                    .upload(fileName, file, { cacheControl: '3600', upsert: false });

                if (uploadErr) {
                    console.error('Upload error:', uploadErr);
                    setErrorMsg(`Error (${i + 1}/${files.length}): ${uploadErr.message}`);
                    setTimeout(() => setErrorMsg(''), 4000);
                    continue;
                }

                const { data: urlData } = supabase.storage
                    .from('portfolio')
                    .getPublicUrl(fileName);

                const publicUrl = urlData?.publicUrl;
                if (!publicUrl) continue;

                const { data: newImg, error: dbErr } = await supabase
                    .from('portfolio_images')
                    .insert({
                        professional_id: actualProfileId,
                        image_url: publicUrl,
                        is_highlighted: false,
                        group_id: groupId
                    })
                    .select()
                    .single();

                if (!dbErr && newImg) {
                    setImages(prev => [newImg, ...prev]);
                } else if (dbErr) {
                    console.error('DB insert error:', dbErr);
                    setErrorMsg(`Error al guardar: ${dbErr.message}`);
                    setTimeout(() => setErrorMsg(''), 4000);
                }
            }
        } catch (error) {
            console.error('Error uploading:', error);
        } finally {
            setUploading(false);
            setUploadProgress(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            await loadImages();
        }
    };

    // Lightbox navigation
    const goNext = useCallback((e) => {
        e?.stopPropagation();
        if (selectedPost && lightboxIndex < selectedPost.length - 1) {
            setLightboxIndex(prev => prev + 1);
        }
    }, [selectedPost, lightboxIndex]);

    const goPrev = useCallback((e) => {
        e?.stopPropagation();
        if (lightboxIndex > 0) {
            setLightboxIndex(prev => prev - 1);
        }
    }, [lightboxIndex]);

    // Swipe handling for lightbox
    const touchStart = useRef(null);
    const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        if (touchStart.current === null) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) goNext();
            else goPrev();
        }
        touchStart.current = null;
    };

    const isVideo = (url) => url && url.match(/\.(mp4|mov|webm|avi)$/i);

    return (
        <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: '16px',
                borderBottom: '1px solid var(--border)'
            }}>
                <button onClick={() => navigate(-1)} style={{
                    background: 'transparent', border: 'none', color: 'var(--text-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer'
                }}>
                    <ChevronLeft size={24} />
                </button>
                <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0, flex: 1 }}>Portfolio</h1>

                {isOwner && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'var(--accent)', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: uploading ? 'wait' : 'pointer',
                            opacity: uploading ? 0.6 : 1, transition: 'opacity 0.2s'
                        }}
                    >
                        {uploading && uploadProgress ? (
                            <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>
                                {uploadProgress.current}/{uploadProgress.total}
                            </span>
                        ) : uploading ? (
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Plus size={20} color="#fff" />
                        )}
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                />
            </div>

            {/* Error Toast */}
            <AnimatePresence>
                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            margin: '16px 20px 0', padding: '12px 16px',
                            background: '#ef4444', color: 'white', borderRadius: '8px',
                            fontSize: '14px', fontWeight: '500', zIndex: 20, position: 'relative'
                        }}
                    >
                        {errorMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Instagram-style Grid */}
            <div style={{ padding: '4px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : posts.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '2px',
                    }}>
                        {posts.map((post, index) => {
                            const cover = post[0];
                            const hasMultiple = post.length > 1;
                            return (
                                <motion.div
                                    key={cover.group_id || cover.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => { setSelectedPost(post); setLightboxIndex(0); }}
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        aspectRatio: '1 / 1',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        background: '#1a1a2e',
                                    }}
                                >
                                    {isVideo(cover.image_url) ? (
                                        <video
                                            src={cover.image_url}
                                            muted
                                            style={{
                                                position: 'absolute',
                                                top: 0, left: 0,
                                                width: '100%', height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={cover.image_url}
                                            alt=""
                                            loading="lazy"
                                            style={{
                                                position: 'absolute',
                                                top: 0, left: 0,
                                                width: '100%', height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    )}

                                    {/* Multi-image indicator (top-right, like Instagram) */}
                                    {hasMultiple && (
                                        <div style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            background: 'rgba(0,0,0,0.6)', borderRadius: '4px',
                                            padding: '3px 6px', display: 'flex', alignItems: 'center', gap: '4px',
                                            backdropFilter: 'blur(4px)',
                                        }}>
                                            <Images size={12} color="#fff" />
                                            <span style={{ fontSize: '11px', color: '#fff', fontWeight: '600' }}>{post.length}</span>
                                        </div>
                                    )}

                                    {/* Highlight badge */}
                                    {cover.is_highlighted && (
                                        <div style={{
                                            position: 'absolute', top: '8px', left: '8px',
                                            background: 'rgba(245,158,11,0.9)', borderRadius: '50%',
                                            width: '24px', height: '24px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        }}>
                                            <Star size={12} fill="#fff" color="#fff" />
                                        </div>
                                    )}

                                    {/* Video play icon */}
                                    {isVideo(cover.image_url) && (
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0,
                                            width: '100%', height: '100%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '50%',
                                                background: 'rgba(0,0,0,0.5)', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <div style={{
                                                    width: 0, height: 0,
                                                    borderTop: '7px solid transparent',
                                                    borderBottom: '7px solid transparent',
                                                    borderLeft: '11px solid white',
                                                    marginLeft: '3px'
                                                }} />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'var(--accent-soft)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <Images size={28} color="var(--accent)" />
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Sin publicaciones</p>
                        <p style={{ fontSize: '13px' }}>
                            {isOwner ? 'Pulsa + para subir tu primera publicación' : 'No hay imágenes en el portfolio.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Instagram-style Lightbox / Post Viewer */}
            <AnimatePresence>
                {selectedPost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.95)',
                            zIndex: 1000,
                            display: 'flex', flexDirection: 'column',
                        }}
                    >
                        {/* Top bar */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                        }}>
                            <button
                                onClick={() => setSelectedPost(null)}
                                style={{
                                    background: 'transparent', border: 'none',
                                    color: '#fff', cursor: 'pointer', padding: 0,
                                    display: 'flex', alignItems: 'center',
                                }}
                            >
                                <X size={24} />
                            </button>

                            {/* Dots indicator */}
                            {selectedPost.length > 1 && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    {selectedPost.map((_, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                width: i === lightboxIndex ? '8px' : '6px',
                                                height: i === lightboxIndex ? '8px' : '6px',
                                                borderRadius: '50%',
                                                background: i === lightboxIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                                                transition: 'all 0.2s',
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {isOwner && (
                                    <button
                                        onClick={() => deletePost(selectedPost)}
                                        style={{
                                            background: 'rgba(239,68,68,0.2)', border: 'none',
                                            borderRadius: '50%', width: '36px', height: '36px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Trash2 size={16} color="#ef4444" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Carousel area */}
                        <div
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                position: 'relative', overflow: 'hidden',
                            }}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Previous arrow */}
                            {lightboxIndex > 0 && (
                                <button
                                    onClick={goPrev}
                                    style={{
                                        position: 'absolute', left: '12px', zIndex: 10,
                                        width: '36px', height: '36px', borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.5)', border: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', backdropFilter: 'blur(4px)',
                                    }}
                                >
                                    <ChevronLeft size={20} color="#fff" />
                                </button>
                            )}

                            {/* Current image/video */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={lightboxIndex}
                                    initial={{ opacity: 0, x: 40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -40 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        width: '100%', height: '100%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '20px',
                                    }}
                                >
                                    {isVideo(selectedPost[lightboxIndex]?.image_url) ? (
                                        <video
                                            src={selectedPost[lightboxIndex].image_url}
                                            controls autoPlay
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                maxWidth: '100%', maxHeight: '100%',
                                                objectFit: 'contain', borderRadius: '8px',
                                                backgroundColor: '#000'
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={selectedPost[lightboxIndex]?.image_url}
                                            alt=""
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                maxWidth: '100%', maxHeight: '100%',
                                                objectFit: 'contain', borderRadius: '8px',
                                            }}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {/* Pinned comment overlay – always visible in the lightbox */}
                            {(() => {
                                const pinned = comments.find(c => c.is_pinned);
                                if (!pinned) return null;
                                return (
                                    <div style={{
                                        position: 'absolute', bottom: '12px', left: '12px', right: '12px',
                                        zIndex: 10,
                                        background: 'rgba(0,0,0,0.65)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: '14px',
                                        padding: '10px 14px',
                                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                                        border: '1px solid rgba(245,158,11,0.4)',
                                    }}>
                                        <div style={{
                                            width: '30px', height: '30px', borderRadius: '50%',
                                            background: 'var(--accent)', color: '#fff', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: '12px', overflow: 'hidden',
                                        }}>
                                            {pinned.profiles?.avatar_url
                                                ? <img src={pinned.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : (pinned.profiles?.full_name || pinned.profiles?.username || 'U')[0].toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                                                <Pin size={11} fill="#f59e0b" color="#f59e0b" />
                                                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '700' }}>
                                                    {pinned.profiles?.full_name || pinned.profiles?.username || 'Usuario'}
                                                </span>
                                            </div>
                                            <p style={{
                                                fontSize: '13px', color: 'rgba(255,255,255,0.9)',
                                                lineHeight: 1.4, margin: 0,
                                                overflow: 'hidden', textOverflow: 'ellipsis',
                                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                                            }}>
                                                {pinned.content}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Next arrow */}
                            {lightboxIndex < selectedPost.length - 1 && (
                                <button
                                    onClick={goNext}
                                    style={{
                                        position: 'absolute', right: '12px', zIndex: 10,
                                        width: '36px', height: '36px', borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.5)', border: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', backdropFilter: 'blur(4px)',
                                    }}
                                >
                                    <ChevronRight size={20} color="#fff" />
                                </button>
                            )}
                        </div>

                        {/* Slide-up Comments Panel */}
                        <AnimatePresence>
                            {showComments && (
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    style={{
                                        position: 'absolute', bottom: '68px', left: 0, right: 0,
                                        height: '60%', background: 'var(--bg-card)',
                                        borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                                        zIndex: 20, display: 'flex', flexDirection: 'column',
                                        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
                                    }}
                                >
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Comentarios ({comments.length})</h3>
                                        <button onClick={() => setShowComments(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {loadingComments ? (
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
                                        ) : comments.length > 0 ? (
                                            comments.map(c => (
                                                <div key={c.id} style={{ display: 'flex', gap: '12px', background: c.is_pinned ? 'rgba(245,158,11,0.05)' : 'transparent', padding: c.is_pinned ? '8px' : '0', borderRadius: '8px' }}>
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '50%',
                                                        background: 'var(--accent)', color: '#fff',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 'bold', fontSize: '14px', flexShrink: 0
                                                    }}>
                                                        {c.profiles?.avatar_url ? (
                                                            <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                        ) : (c.profiles?.full_name || c.profiles?.username || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                                {c.profiles?.full_name || c.profiles?.username || 'Usuario'}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                {new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                            {c.is_pinned && (
                                                                <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: '12px', fontWeight: 'bold' }}>
                                                                    <Pin size={10} fill="#f59e0b" /> Fijado
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                                                            {c.content}
                                                        </p>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {isOwner && (
                                                            <button
                                                                onClick={() => togglePin(c.id, c.is_pinned)}
                                                                style={{ background: 'none', border: 'none', color: c.is_pinned ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                                                title={c.is_pinned ? "Desfijar comentario" : "Fijar comentario"}
                                                            >
                                                                <Pin size={14} fill={c.is_pinned ? '#f59e0b' : 'transparent'} />
                                                            </button>
                                                        )}
                                                        {(currentUserId === c.user_id || isOwner) && (
                                                            <button
                                                                onClick={() => deleteComment(c.id)}
                                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                                                title="Eliminar comentario"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
                                                Sé el primero en comentar.
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Añade un comentario..."
                                            onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }}
                                            style={{
                                                flex: 1, padding: '12px 16px', borderRadius: '24px',
                                                border: '1px solid var(--border)', background: 'var(--bg-container)',
                                                color: 'var(--text-primary)', fontSize: '14px', outline: 'none'
                                            }}
                                        />
                                        <button
                                            onClick={addComment}
                                            disabled={!newComment.trim() || !currentUserId}
                                            style={{
                                                width: '44px', height: '44px', borderRadius: '50%',
                                                background: newComment.trim() && currentUserId ? 'var(--accent)' : 'var(--bg-container)',
                                                color: newComment.trim() && currentUserId ? '#fff' : 'var(--text-muted)',
                                                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: newComment.trim() && currentUserId ? 'pointer' : 'default',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Send size={18} style={{ marginLeft: '2px' }} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Bottom actions */}
                        <div style={{
                            padding: '16px 20px',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: '#0a0a0a', position: 'relative', zIndex: 10 // ensure actions are over panel toggle
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {/* Image counter */}
                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                                    {lightboxIndex + 1} / {selectedPost.length}
                                </span>

                                {/* Comentarios button */}
                                <button
                                    onClick={() => setShowComments(!showComments)}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '24px',
                                        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px',
                                        color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                    }}
                                >
                                    <MessageSquare size={16} />
                                    <span>Comentarios</span>
                                </button>
                            </div>

                            {/* Highlight button for owner */}
                            {isOwner && (
                                <button
                                    onClick={(e) => toggleHighlight(e, selectedPost[lightboxIndex])}
                                    style={{
                                        background: selectedPost[lightboxIndex]?.is_highlighted
                                            ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(8px)',
                                        border: 'none', borderRadius: '24px',
                                        padding: '10px 20px',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        color: '#fff', fontWeight: '600', fontSize: '14px',
                                        cursor: 'pointer',
                                        boxShadow: selectedPost[lightboxIndex]?.is_highlighted
                                            ? '0 4px 12px rgba(245,158,11,0.4)' : 'none',
                                    }}
                                >
                                    <Star
                                        size={18}
                                        fill={selectedPost[lightboxIndex]?.is_highlighted ? '#fff' : 'transparent'}
                                        color="#fff"
                                    />
                                    {selectedPost[lightboxIndex]?.is_highlighted ? 'Destacada' : 'Destacar'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default PortfolioGallery;
