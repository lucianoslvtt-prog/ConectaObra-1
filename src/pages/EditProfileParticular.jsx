import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

const EditProfileParticular = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loadProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single();
            if (profile) {
                setUsername(profile.username || '');
                setAvatarUrl(profile.avatar_url || null);
            }
        };
        loadProfile();
    }, []);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleSave = async () => {
        if (!username.trim()) {
            setError('El nombre no puede estar vacío.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            // Check username availability (excluding self)
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .ilike('username', username.trim())
                .neq('id', user.id)
                .maybeSingle();

            if (existing) {
                setError('Este nombre de usuario ya está en uso.');
                setLoading(false);
                return;
            }

            let newAvatarUrl = avatarUrl;

            // Upload new avatar if selected
            if (avatarFile) {
                const ext = avatarFile.name.split('.').pop();
                const filePath = `avatars/${user.id}/avatar.${ext}`;
                const { error: uploadErr } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile, { upsert: true });
                if (!uploadErr) {
                    const { data: urlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(filePath);
                    newAvatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
                }
            }

            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ username: username.trim(), avatar_url: newAvatarUrl })
                .eq('id', user.id);

            if (updateErr) throw new Error(updateErr.message);

            setSaved(true);
            setTimeout(() => navigate('/profile'), 1200);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const displayAvatar = avatarPreview || avatarUrl;

    return (
        <div className="page">
            <div className="page-content" style={{ padding: '0 0 40px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
                    <button className="header-back" onClick={() => navigate(-1)}>
                        <ChevronLeft size={22} />
                    </button>
                    <h1 style={{ fontSize: '20px', fontWeight: '800' }}>Editar Perfil</h1>
                </div>

                <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    {/* Avatar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: '96px', height: '96px', borderRadius: '50%',
                                background: displayAvatar ? 'transparent' : 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '36px', fontWeight: '800', color: 'white',
                                cursor: 'pointer', position: 'relative',
                                overflow: 'hidden',
                                border: '3px solid var(--accent)',
                                boxShadow: '0 0 0 4px var(--accent-soft)',
                            }}
                        >
                            {displayAvatar ? (
                                <img src={displayAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span>{username?.[0]?.toUpperCase() || '?'}</span>
                            )}
                            {/* Overlay */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Camera size={22} color="white" />
                            </div>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Toca para cambiar la foto</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Name input */}
                    <div>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                            Nombre de usuario
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Tu nombre de usuario"
                            style={{
                                width: '100%', padding: '14px 16px',
                                borderRadius: '12px',
                                border: error ? '1px solid #ef4444' : '1px solid var(--border)',
                                background: 'var(--bg-container)',
                                color: 'var(--text-primary)',
                                fontSize: '15px', outline: 'none',
                                boxSizing: 'border-box',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        />
                        {error && (
                            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>{error}</p>
                        )}
                    </div>

                    {/* Save button */}
                    <button
                        className="btn btn-primary w-full"
                        onClick={handleSave}
                        disabled={loading || saved}
                        style={{ padding: '16px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        {saved ? (
                            <><Check size={18} /> Guardado</>
                        ) : loading ? (
                            'Guardando...'
                        ) : (
                            'Guardar cambios'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileParticular;
