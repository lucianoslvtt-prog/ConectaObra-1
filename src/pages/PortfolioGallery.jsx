import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Star, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

function PortfolioGallery() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [actualProfileId, setActualProfileId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef(null);

    const isOwner = currentUserId && actualProfileId && currentUserId === actualProfileId;

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
            // First determine the actual UUID if id is a username
            let actualId = id;
            if (id && !id.includes('-')) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', id)
                    .single();
                if (profile) {
                    actualId = profile.id;
                }
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

    const toggleHighlight = async (e, image) => {
        e.stopPropagation();

        // Count currently highlighted
        const currentlyHighlighted = images.filter(img => img.is_highlighted).length;

        // If trying to highlight a new one and we already have 4, warn user
        if (!image.is_highlighted && currentlyHighlighted >= 4) {
            setErrorMsg("No puedes destacar más de 4 imágenes.");
            setTimeout(() => setErrorMsg(''), 3000);
            return;
        }

        try {
            const newStatus = !image.is_highlighted;
            // Optimistic UI update
            setImages(images.map(img => img.id === image.id ? { ...img, is_highlighted: newStatus } : img));

            // Update DB
            const { error } = await supabase
                .from('portfolio_images')
                .update({ is_highlighted: newStatus })
                .eq('id', image.id);

            if (error) {
                // Revert on error
                setImages(images);
                console.error("Error toggling highlight", error);
            }
        } catch (error) {
            console.error("Error toggling highlight", error);
        }
    };

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length || !actualProfileId) return;
        setUploading(true);

        try {
            for (const file of files) {
                const ext = file.name.split('.').pop();
                const fileName = `${actualProfileId}/portfolio_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const isVideo = file.type.startsWith('video/');

                // Upload to Supabase Storage
                const bucketName = isVideo ? 'community-videos' : 'avatars';
                const { error: uploadErr } = await supabase.storage
                    .from(bucketName)
                    .upload(fileName, file, { cacheControl: '3600', upsert: false });

                if (uploadErr) {
                    console.error('Upload error:', uploadErr);
                    setErrorMsg(`Error: ${uploadErr.message}`);
                    setTimeout(() => setErrorMsg(''), 4000);
                    continue;
                }

                const { data: urlData } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(fileName);

                const publicUrl = urlData?.publicUrl;
                if (!publicUrl) continue;

                // Insert DB record
                const { data: newImg, error: dbErr } = await supabase
                    .from('portfolio_images')
                    .insert({
                        professional_id: actualProfileId,
                        image_url: publicUrl,
                        is_highlighted: false
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
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
            // Reload all images to ensure everything is in sync
            await loadImages();
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: 'rgba(15,23,42,0.85)',
                backdropFilter: 'blur(12px)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderBottom: '1px solid var(--border)'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        cursor: 'pointer'
                    }}
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0, flex: 1 }}>Portfolio</h1>

                {/* Upload button for owner */}
                {isOwner && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            width: '36px', height: '36px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: uploading ? 'wait' : 'pointer',
                            opacity: uploading ? 0.6 : 1,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {uploading ? (
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Plus size={20} color="#fff" />
                        )}
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                />
            </div>

            {/* Error Message Toast */}
            <AnimatePresence>
                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            margin: '16px 20px 0',
                            padding: '12px 16px',
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            zIndex: 20,
                            position: 'relative'
                        }}
                    >
                        {errorMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gallery Grid */}
            <div style={{ padding: '20px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : images.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                        // Optional pseudo-masonry with flex row wrap constraints could go here, 
                        // but a simple dense grid mimics the second image grid easily.
                        gridAutoRows: 'minmax(120px, auto)'
                    }}>
                        {images.map((img, index) => (
                            <motion.div
                                key={img.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => setSelectedImage(img)}
                                style={{
                                    width: '100%',
                                    gridRowEnd: index % 3 === 0 ? 'span 2' : 'span 1',
                                    cursor: 'pointer',
                                }}
                            >
                                {img.image_url && img.image_url.match(/\.(mp4|mov|webm|avi)$/i) ? (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: index % 3 === 0 ? '240px' : '120px',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        position: 'relative',
                                        background: '#000'
                                    }}>
                                        <video
                                            src={img.image_url}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'rgba(0,0,0,0.2)'
                                        }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                background: 'rgba(0,0,0,0.5)', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                                            }}>
                                                <div style={{
                                                    width: 0, height: 0,
                                                    borderTop: '8px solid transparent',
                                                    borderBottom: '8px solid transparent',
                                                    borderLeft: '12px solid white',
                                                    marginLeft: '4px'
                                                }} />
                                            </div>
                                        </div>
                                        {/* Highlight Button (only for owner) */}
                                        {isOwner && (
                                            <button
                                                onClick={(e) => toggleHighlight(e, img)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px', right: '8px',
                                                    background: 'rgba(15, 23, 42, 0.6)',
                                                    backdropFilter: 'blur(4px)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '32px', height: '32px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    zIndex: 2
                                                }}
                                            >
                                                <Star size={16} fill={img.is_highlighted ? '#f59e0b' : 'transparent'} color={img.is_highlighted ? '#f59e0b' : '#fff'} />
                                            </button>
                                        )}
                                        {/* Highlight Badge (for visitors) */}
                                        {!isOwner && img.is_highlighted && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '8px', right: '8px',
                                                background: 'rgba(245, 158, 11, 0.9)',
                                                borderRadius: '50%',
                                                width: '24px', height: '24px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                zIndex: 2,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}>
                                                <Star size={12} fill="#fff" color="#fff" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: index % 3 === 0 ? '240px' : '120px',
                                        borderRadius: '12px',
                                        backgroundImage: `url(${img.image_url})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        position: 'relative' // relative context for star
                                    }}>
                                        {/* Highlight Button (only for owner) */}
                                        {isOwner && (
                                            <button
                                                onClick={(e) => toggleHighlight(e, img)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px', right: '8px',
                                                    background: 'rgba(15, 23, 42, 0.6)',
                                                    backdropFilter: 'blur(4px)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '32px', height: '32px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    zIndex: 2
                                                }}
                                            >
                                                <Star size={16} fill={img.is_highlighted ? '#f59e0b' : 'transparent'} color={img.is_highlighted ? '#f59e0b' : '#fff'} />
                                            </button>
                                        )}
                                        {/* Highlight Badge (for visitors) */}
                                        {!isOwner && img.is_highlighted && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '8px', right: '8px',
                                                background: 'rgba(245, 158, 11, 0.9)',
                                                borderRadius: '50%',
                                                width: '24px', height: '24px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                zIndex: 2,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}>
                                                <Star size={12} fill="#fff" color="#fff" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <p>No hay imágenes en el portfolio.</p>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.9)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(null);
                            }}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                cursor: 'pointer',
                                zIndex: 1001
                            }}
                        >
                            <X size={24} />
                        </button>

                        {selectedImage.image_url && selectedImage.image_url.match(/\.(mp4|mov|webm|avi)$/i) ? (
                            <motion.video
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.9 }}
                                src={selectedImage.image_url}
                                controls
                                autoPlay
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '90vh',
                                    objectFit: 'contain',
                                    borderRadius: '8px',
                                    backgroundColor: '#000'
                                }}
                            />
                        ) : (
                            <motion.img
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.9 }}
                                src={selectedImage.image_url}
                                alt="Portfolio item"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '90vh',
                                    objectFit: 'contain',
                                    borderRadius: '8px'
                                }}
                            />
                        )}

                        {/* Lightbox Highlight Button for owner */}
                        {isOwner && (
                            <button
                                onClick={(e) => toggleHighlight(e, selectedImage)}
                                style={{
                                    position: 'absolute',
                                    bottom: '30px',
                                    background: selectedImage.is_highlighted ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                                    backdropFilter: 'blur(8px)',
                                    border: 'none',
                                    borderRadius: '24px',
                                    padding: '10px 20px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    color: selectedImage.is_highlighted ? '#fff' : '#fff',
                                    fontWeight: '600', fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: selectedImage.is_highlighted ? '0 4px 12px rgba(245, 158, 11, 0.4)' : 'none',
                                    zIndex: 1001
                                }}
                            >
                                <Star size={18} fill={selectedImage.is_highlighted ? '#fff' : 'transparent'} color="#fff" />
                                {selectedImage.is_highlighted ? 'Destacada' : 'Destacar imagen'}
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence >
        </div >
    );
}

export default PortfolioGallery;
