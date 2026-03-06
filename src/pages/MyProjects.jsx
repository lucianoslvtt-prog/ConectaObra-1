import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus, Heart, MessageCircle, Image, Send, MoreHorizontal, Trash2, Camera, Video, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trades } from '../data/categories';
import { useLanguage } from '../lib/LanguageContext';

const MyProjects = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newPost, setNewPost] = useState('');
    const [publishing, setPublishing] = useState(false);
    const [username, setUsername] = useState('');
    const [selectedMedia, setSelectedMedia] = useState([]);
    const [mediaPreviews, setMediaPreviews] = useState([]);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const { t } = useLanguage();

    const handleMediaSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const remaining = 4 - selectedMedia.length;
        const newFiles = files.slice(0, remaining);
        if (newFiles.length === 0) return;

        setSelectedMedia(prev => [...prev, ...newFiles]);
        newFiles.forEach(file => {
            const isVideo = file.type.startsWith('video/');
            if (isVideo) {
                const url = URL.createObjectURL(file);
                setMediaPreviews(prev => [...prev, { file, url, type: 'video' }]);
            } else {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setMediaPreviews(prev => [...prev, { file, url: reader.result, type: 'image' }]);
                };
                reader.readAsDataURL(file);
            }
        });
        e.target.value = '';
    };

    const removeMedia = (index) => {
        if (mediaPreviews[index]?.type === 'video') {
            URL.revokeObjectURL(mediaPreviews[index].url);
        }
        setSelectedMedia(prev => prev.filter((_, i) => i !== index));
        setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const uploadMedia = async (userId) => {
        const urls = [];
        for (const file of selectedMedia) {
            const ext = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const { error } = await supabase.storage
                .from('community-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });
            if (error) { console.error('Upload error:', error); continue; }
            const { data: urlData } = supabase.storage
                .from('community-images')
                .getPublicUrl(fileName);
            if (urlData?.publicUrl) urls.push(urlData.publicUrl);
        }
        return urls;
    };

    useEffect(() => {
        loadMyPosts();
    }, []);

    const loadMyPosts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get username
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single();
            setUsername(profile?.username || user.email?.split('@')[0] || 'Usuario');

            // Get user's posts
            const { data: myPosts, error } = await supabase
                .from('community_posts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && myPosts) {
                setPosts(myPosts.map(p => ({
                    ...p,
                    user: profile?.username || 'Tú',
                    avatar: (profile?.username || 'T')[0].toUpperCase(),
                    time: formatTime(p.created_at),
                    likes: p.likes_count || 0,
                    comments: p.comments_count || 0,
                })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('chat_now');
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    const handlePublish = async () => {
        if (!newPost.trim() && selectedMedia.length === 0) return;
        setPublishing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let imageUrls = [];
            if (selectedMedia.length > 0) {
                imageUrls = await uploadMedia(user.id);
            }

            const { data: postData, error } = await supabase
                .from('community_posts')
                .insert({
                    user_id: user.id,
                    content: newPost,
                    tagged_trades: [],
                    image_urls: imageUrls.length > 0 ? imageUrls : null,
                })
                .select()
                .single();

            if (!error && postData) {
                setPosts(prev => [{
                    ...postData,
                    user: username,
                    avatar: username[0]?.toUpperCase() || 'T',
                    time: t('chat_now'),
                    likes: 0,
                    comments: 0,
                    image_urls: imageUrls.length > 0 ? imageUrls : (mediaPreviews.length > 0 ? mediaPreviews.map(p => p.url) : null),
                }, ...prev]);
            }

            setNewPost('');
            setSelectedMedia([]);
            setMediaPreviews([]);
            setShowForm(false);
        } catch (e) {
            console.error(e);
        } finally {
            setPublishing(false);
        }
    };

    const deletePost = async (postId) => {
        try {
            await supabase.from('community_posts').delete().eq('id', postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="page">
            <div className="page-content" style={{ paddingBottom: '100px' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="header-back" onClick={() => navigate(-1)}>
                            <ChevronLeft size={22} />
                        </button>
                        <h1 style={{ fontSize: '20px', fontWeight: '800' }}>{t('prof_projects_menu')}</h1>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{
                            background: 'var(--accent)', border: 'none', borderRadius: '50%',
                            width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer'
                        }}
                    >
                        <Plus size={20} color="white" />
                    </button>
                </div>

                {/* New post form */}
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ padding: '0 20px 16px' }}
                    >
                        <div className="card" style={{ padding: '16px' }}>
                            <textarea
                                ref={textareaRef}
                                value={newPost}
                                onChange={(e) => setNewPost(e.target.value)}
                                placeholder={t('comm_placeholder')}
                                style={{ minHeight: '80px', padding: '12px', fontSize: '14px', marginBottom: '12px' }}
                                autoFocus
                            />

                            {/* Media previews */}
                            {mediaPreviews.length > 0 && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: mediaPreviews.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                                    gap: '8px', marginBottom: '12px',
                                }}>
                                    {mediaPreviews.map((preview, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}
                                        >
                                            {preview.type === 'video' ? (
                                                <video
                                                    src={preview.url}
                                                    style={{
                                                        width: '100%',
                                                        height: mediaPreviews.length === 1 ? '200px' : '120px',
                                                        objectFit: 'cover', borderRadius: '12px',
                                                        border: '1px solid var(--border-light)',
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src={preview.url}
                                                    alt={`Preview ${index + 1}`}
                                                    style={{
                                                        width: '100%',
                                                        height: mediaPreviews.length === 1 ? '200px' : '120px',
                                                        objectFit: 'cover', borderRadius: '12px',
                                                        border: '1px solid var(--border-light)',
                                                    }}
                                                />
                                            )}
                                            {preview.type === 'video' && (
                                                <div style={{
                                                    position: 'absolute', top: '6px', left: '6px',
                                                    background: 'rgba(0,0,0,0.7)', borderRadius: '6px',
                                                    padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px',
                                                }}>
                                                    <Video size={12} color="white" />
                                                    <span style={{ fontSize: '10px', color: 'white', fontWeight: '600' }}>VIDEO</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => removeMedia(index)}
                                                style={{
                                                    position: 'absolute', top: '6px', right: '6px',
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    background: 'rgba(0,0,0,0.7)', border: 'none',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', color: 'white',
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </motion.div>
                                    ))}
                                    {mediaPreviews.length < 4 && (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                height: mediaPreviews.length === 1 ? '200px' : '120px',
                                                borderRadius: '12px', border: '2px dashed var(--border-light)',
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

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                onChange={handleMediaSelect}
                                style={{ display: 'none' }}
                            />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            background: selectedMedia.length > 0 ? 'var(--accent-soft)' : 'rgba(37,99,235,0.08)',
                                            border: 'none', borderRadius: '8px', padding: '8px 12px',
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            cursor: 'pointer',
                                            color: selectedMedia.length > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                                            fontSize: '12px', fontWeight: '600', fontFamily: 'Inter',
                                        }}
                                    >
                                        <Camera size={16} />
                                        Foto
                                        {selectedMedia.length > 0 && <span>({selectedMedia.length}/4)</span>}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const input = fileInputRef.current;
                                            if (input) {
                                                input.accept = 'video/*';
                                                input.click();
                                                setTimeout(() => { input.accept = 'image/*,video/*'; }, 500);
                                            }
                                        }}
                                        style={{
                                            background: 'rgba(139,92,246,0.08)',
                                            border: 'none', borderRadius: '8px', padding: '8px 12px',
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            cursor: 'pointer', color: '#8b5cf6',
                                            fontSize: '12px', fontWeight: '600', fontFamily: 'Inter',
                                        }}
                                    >
                                        <Video size={16} />
                                        Vídeo
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => { setShowForm(false); setNewPost(''); setSelectedMedia([]); setMediaPreviews([]); }}
                                        className="btn btn-outline"
                                        style={{ padding: '8px 16px', fontSize: '13px' }}
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        onClick={handlePublish}
                                        disabled={publishing || (!newPost.trim() && selectedMedia.length === 0)}
                                        className="btn btn-primary"
                                        style={{ padding: '8px 20px', fontSize: '13px' }}
                                    >
                                        <Send size={14} /> {publishing ? '...' : t('comm_publish')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Posts list */}
                <div style={{ padding: '0 20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: 'var(--accent-soft)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 16px'
                            }}>
                                <Image size={24} color="var(--accent)" />
                            </div>
                            <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{t('myprojects_empty')}</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>{t('myprojects_empty_desc')}</p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="btn btn-primary"
                                style={{ padding: '12px 24px', fontSize: '14px' }}
                            >
                                <Plus size={16} /> {t('myprojects_add')}
                            </button>
                        </div>
                    ) : (
                        posts.map((post, i) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="card"
                                style={{ marginBottom: '12px', padding: '16px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '16px', fontWeight: '700', color: 'white'
                                    }}>
                                        {post.avatar}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '14px', fontWeight: '600' }}>{post.user}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{post.time}</p>
                                    </div>
                                    <button
                                        onClick={() => { if (confirm('¿Eliminar publicación?')) deletePost(post.id); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                    {post.content}
                                </p>

                                {/* Post media */}
                                {post.video_url && (
                                    <div style={{
                                        marginBottom: '12px',
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

                                {post.image_urls && post.image_urls.length > 0 && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: post.image_urls.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                                        gap: '6px', marginTop: '12px',
                                        borderRadius: 'var(--radius)', overflow: 'hidden',
                                    }}>
                                        {post.image_urls.map((url, imgIdx) => {
                                            const isVid = url.match(/\.(mp4|mov|webm|avi)$/i);
                                            return isVid ? (
                                                <video
                                                    key={imgIdx}
                                                    src={url}
                                                    controls
                                                    style={{
                                                        width: '100%',
                                                        height: post.image_urls.length === 1 ? '220px' : '140px',
                                                        objectFit: 'cover', borderRadius: '8px',
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    key={imgIdx}
                                                    src={url}
                                                    alt={`Post media ${imgIdx + 1}`}
                                                    style={{
                                                        width: '100%',
                                                        height: post.image_urls.length === 1 ? '220px' : '140px',
                                                        objectFit: 'cover', borderRadius: '8px',
                                                    }}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                        <Heart size={14} /> {post.likes}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                        <MessageCircle size={14} /> {post.comments}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyProjects;
