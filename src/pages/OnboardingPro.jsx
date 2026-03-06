import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, Camera, Check, CreditCard, Store, Hammer, Droplets, TreePine, Square, Zap, Paintbrush, CircleDot, MapPin, Globe, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { spanishLocations } from '../data/locations';
import { tradeGroups } from '../data/categories';
import { useLanguage } from '../lib/LanguageContext';

const storeCategories = [
    { id: 'store-hardware', name: 'Ferretería', tkey: 'store_hardware', icon: Hammer, color: '#f59e0b' },
    { id: 'store-materials', name: 'Materiales de obra', tkey: 'store_materials', icon: Store, color: '#8b5cf6' },
    { id: 'store-plumbing', name: 'Fontanería', tkey: 'store_plumbing', icon: Droplets, color: '#22c55e' },
    { id: 'store-wood', name: 'Maderas', tkey: 'store_wood', icon: TreePine, color: '#a16207' },
    { id: 'store-aluminum', name: 'Aluminio', tkey: 'store_aluminum', icon: Square, color: '#64748b' },
    { id: 'store-electrical', name: 'Electricidad', tkey: 'store_electrical', icon: Zap, color: '#ef4444' },
    { id: 'store-paint', name: 'Pinturas', tkey: 'store_paint', icon: Paintbrush, color: '#3b82f6' },
    { id: 'store-iron', name: 'Hierros', tkey: 'store_iron', icon: CircleDot, color: '#78716c' },
];

const phonePrefixes = [
    { code: '+34', country: 'España', flag: '🇪🇸' },
    { code: '+33', country: 'Francia', flag: '🇫🇷' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
    { code: '+49', country: 'Alemania', flag: '🇩🇪' },
    { code: '+39', country: 'Italia', flag: '🇮🇹' },
    { code: '+1', country: 'EE.UU. / Canadá', flag: '🇺🇸' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
    { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
    { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
    { code: '+504', country: 'Honduras', flag: '🇭🇳' },
    { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
    { code: '+507', country: 'Panamá', flag: '🇵🇦' },
    { code: '+53', country: 'Cuba', flag: '🇨🇺' },
    { code: '+1-809', country: 'Rep. Dominicana', flag: '🇩🇴' },
    { code: '+212', country: 'Marruecos', flag: '🇲🇦' },
    { code: '+213', country: 'Argelia', flag: '🇩🇿' },
    { code: '+216', country: 'Túnez', flag: '🇹🇳' },
    { code: '+20', country: 'Egipto', flag: '🇪🇬' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+254', country: 'Kenia', flag: '🇰🇪' },
    { code: '+27', country: 'Sudáfrica', flag: '🇿🇦' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+81', country: 'Japón', flag: '🇯🇵' },
    { code: '+82', country: 'Corea del Sur', flag: '🇰🇷' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
    { code: '+63', country: 'Filipinas', flag: '🇵🇭' },
    { code: '+66', country: 'Tailandia', flag: '🇹🇭' },
    { code: '+90', country: 'Turquía', flag: '🇹🇷' },
    { code: '+961', country: 'Líbano', flag: '🇱🇧' },
    { code: '+972', country: 'Israel', flag: '🇮🇱' },
    { code: '+971', country: 'Emiratos Árabes', flag: '🇦🇪' },
    { code: '+966', country: 'Arabia Saudita', flag: '🇸🇦' },
    { code: '+48', country: 'Polonia', flag: '🇵🇱' },
    { code: '+40', country: 'Rumanía', flag: '🇷🇴' },
    { code: '+380', country: 'Ucrania', flag: '🇺🇦' },
    { code: '+7', country: 'Rusia', flag: '🇷🇺' },
    { code: '+31', country: 'Países Bajos', flag: '🇳🇱' },
    { code: '+32', country: 'Bélgica', flag: '🇧🇪' },
    { code: '+41', country: 'Suiza', flag: '🇨🇭' },
    { code: '+43', country: 'Austria', flag: '🇦🇹' },
    { code: '+46', country: 'Suecia', flag: '🇸🇪' },
    { code: '+47', country: 'Noruega', flag: '🇳🇴' },
    { code: '+45', country: 'Dinamarca', flag: '🇩🇰' },
    { code: '+358', country: 'Finlandia', flag: '🇫🇮' },
    { code: '+353', country: 'Irlanda', flag: '🇮🇪' },
    { code: '+30', country: 'Grecia', flag: '🇬🇷' },
    { code: '+385', country: 'Croacia', flag: '🇭🇷' },
    { code: '+420', country: 'Rep. Checa', flag: '🇨🇿' },
    { code: '+36', country: 'Hungría', flag: '🇭🇺' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+64', country: 'Nueva Zelanda', flag: '🇳🇿' },
];

const allLanguages = [
    { id: 'es', name: 'Español', flag: '🇪🇸' },
    { id: 'en', name: 'Inglés', flag: '🇬🇧' },
    { id: 'fr', name: 'Francés', flag: '🇫🇷' },
    { id: 'pt', name: 'Portugués', flag: '🇵🇹' },
    { id: 'de', name: 'Alemán', flag: '🇩🇪' },
    { id: 'it', name: 'Italiano', flag: '🇮🇹' },
    { id: 'ro', name: 'Rumano', flag: '🇷🇴' },
    { id: 'ar', name: 'Árabe', flag: '🇸🇦' },
    { id: 'zh', name: 'Chino', flag: '🇨🇳' },
    { id: 'ru', name: 'Ruso', flag: '🇷🇺' },
    { id: 'uk', name: 'Ucraniano', flag: '🇺🇦' },
    { id: 'pl', name: 'Polaco', flag: '🇵🇱' },
    { id: 'nl', name: 'Neerlandés', flag: '🇳🇱' },
    { id: 'ja', name: 'Japonés', flag: '🇯🇵' },
    { id: 'ko', name: 'Coreano', flag: '🇰🇷' },
    { id: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { id: 'bn', name: 'Bengalí', flag: '🇧🇩' },
    { id: 'tr', name: 'Turco', flag: '🇹🇷' },
    { id: 'sv', name: 'Sueco', flag: '🇸🇪' },
    { id: 'da', name: 'Danés', flag: '🇩🇰' },
    { id: 'no', name: 'Noruego', flag: '🇳🇴' },
    { id: 'fi', name: 'Finlandés', flag: '🇫🇮' },
    { id: 'el', name: 'Griego', flag: '🇬🇷' },
    { id: 'cs', name: 'Checo', flag: '🇨🇿' },
    { id: 'hu', name: 'Húngaro', flag: '🇭🇺' },
    { id: 'bg', name: 'Búlgaro', flag: '🇧🇬' },
    { id: 'hr', name: 'Croata', flag: '🇭🇷' },
    { id: 'sk', name: 'Eslovaco', flag: '🇸🇰' },
    { id: 'sl', name: 'Esloveno', flag: '🇸🇮' },
    { id: 'sr', name: 'Serbio', flag: '🇷🇸' },
    { id: 'he', name: 'Hebreo', flag: '🇮🇱' },
    { id: 'fa', name: 'Persa', flag: '🇮🇷' },
    { id: 'ur', name: 'Urdu', flag: '🇵🇰' },
    { id: 'th', name: 'Tailandés', flag: '🇹🇭' },
    { id: 'vi', name: 'Vietnamita', flag: '🇻🇳' },
    { id: 'id', name: 'Indonesio', flag: '🇮🇩' },
    { id: 'ms', name: 'Malayo', flag: '🇲🇾' },
    { id: 'tl', name: 'Tagalo', flag: '🇵🇭' },
    { id: 'sw', name: 'Suajili', flag: '🇰🇪' },
    { id: 'am', name: 'Amhárico', flag: '🇪🇹' },
    { id: 'ca', name: 'Catalán', flag: '🇪🇸' },
    { id: 'gl', name: 'Gallego', flag: '🇪🇸' },
    { id: 'eu', name: 'Euskera', flag: '🇪🇸' },
    { id: 'qu', name: 'Quechua', flag: '🇵🇪' },
    { id: 'gn', name: 'Guaraní', flag: '🇵🇾' },
];

const OnboardingPro = () => {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [locations, setLocations] = useState(['', '', '', '', '', '']);
    const [bio, setBio] = useState('');
    const [experience, setExperience] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [phonePrefix, setPhonePrefix] = useState('+34');
    const [showPrefixes, setShowPrefixes] = useState(false);
    const [prefixSearch, setPrefixSearch] = useState('');
    const [selectedLanguages, setSelectedLanguages] = useState([]);
    const [showLanguages, setShowLanguages] = useState(false);
    const [langSearch, setLangSearch] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [activeZoneIndex, setActiveZoneIndex] = useState(null);
    const avatarInputRef = useRef(null);
    const navigate = useNavigate();

    // Preload existing profile data if editing
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Load from profiles
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile) {
                    if (profile.full_name) setFullName(profile.full_name);
                    // location parsing
                    if (profile.location) {
                        const locs = profile.location.split(',').map(l => l.trim());
                        setLocations(prev => {
                            const newLocs = [...prev];
                            locs.forEach((l, i) => { if (i < 6) newLocs[i] = l; });
                            return newLocs;
                        });
                    }
                    if (profile.languages) setSelectedLanguages(profile.languages.split(',').map(l => l.trim()));
                    if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
                }

                // Load from professionals
                const { data: pro } = await supabase
                    .from('professionals')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (pro) {
                    if (pro.phone) {
                        const parts = pro.phone.split(' ');
                        if (parts.length > 1) {
                            setPhonePrefix(parts[0]);
                            setPhone(parts.slice(1).join(' '));
                        } else {
                            setPhone(pro.phone);
                        }
                    }
                    if (pro.bio) setBio(pro.bio);
                    if (pro.experience_years !== null) setExperience(pro.experience_years.toString());
                    if (pro.specialty) setSelectedCategories(pro.specialty.split(',').map(s => s.trim()));
                }

            } catch (err) {
                console.error("Error loading profile", err);
            }
        };
        loadProfile();
    }, []);

    const handleAvatarSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const toggleCategory = (id) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const specialtyStr = selectedCategories.join(', ');

            // Upload avatar if selected
            let avatarUrl = null;
            if (avatarFile) {
                const ext = avatarFile.name.split('.').pop();
                const fileName = `${user.id}/avatar_${Date.now()}.${ext}`;
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true });
                if (!uploadErr) {
                    const { data: urlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName);
                    avatarUrl = urlData?.publicUrl || null;
                }
            }

            // Save to profiles table (reliable - this always works)
            const locationStr = locations.filter(l => l.trim()).join(', ');
            const profileUpdate = {
                role: 'professional',
                username: fullName,
                full_name: fullName,
                specialty: specialtyStr,
                languages: selectedLanguages.join(', '),
                location: locationStr || null,
            };
            if (avatarUrl) profileUpdate.avatar_url = avatarUrl;

            await supabase.from('profiles').update(profileUpdate).eq('id', user.id);

            // Also try to save to professionals table (best-effort)
            try {
                const { data: existing } = await supabase
                    .from('professionals')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                const proData = {
                    full_name: fullName,
                    phone: `${phonePrefix} ${phone}`,
                    location: locations.filter(l => l.trim()).join(', '),
                    bio,
                    experience_years: parseInt(experience, 10) || 0,
                    specialty: specialtyStr
                };

                if (existing) {
                    const { error: updateErr } = await supabase.from('professionals').update(proData).eq('user_id', user.id);
                    if (updateErr) throw updateErr;
                } else {
                    const { error: insertErr } = await supabase.from('professionals').insert({ ...proData, id: user.id, subscription_status: 'active', user_id: user.id });
                    if (insertErr) throw insertErr;
                }
            } catch (proErr) {
                console.error('Pro table save error:', proErr);
                alert('No se pudieron guardar algunos datos profesionales: ' + (proErr.message || 'Error desconocido'));
                throw proErr; // Prevent navigation so we see what failed
            }

            navigate('/dashboard');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Datos Personales</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>Información básica de tu perfil profesional</p>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarSelect}
                                style={{ display: 'none' }}
                            />
                            <motion.div
                                whileTap={{ scale: 0.93 }}
                                onClick={() => avatarInputRef.current?.click()}
                                style={{
                                    width: '90px', height: '90px', borderRadius: '50%',
                                    background: avatarPreview ? 'none' : 'var(--bg-card)',
                                    border: avatarPreview ? '3px solid var(--accent)' : '2px dashed var(--border-light)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', overflow: 'hidden', position: 'relative',
                                    transition: 'border-color 0.3s, box-shadow 0.3s',
                                    boxShadow: avatarPreview ? '0 0 20px rgba(37,99,235,0.3)' : 'none',
                                }}
                            >
                                {avatarPreview ? (
                                    <>
                                        <img
                                            src={avatarPreview}
                                            alt="Avatar"
                                            style={{
                                                width: '100%', height: '100%', objectFit: 'cover',
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: 'rgba(0,0,0,0.35)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            opacity: 0, transition: 'opacity 0.2s',
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                                        >
                                            <Camera size={22} color="white" />
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <Camera size={22} color="var(--text-muted)" />
                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>{t('prof_photo', 'FOTO')}</span>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label>{t('onb_fullname', 'Nombre de usuario')}</label>
                                <input
                                    value={fullName}
                                    onChange={(e) => {
                                        setFullName(e.target.value);
                                        setUsernameError('');
                                    }}
                                    placeholder={t('onb_fullname_placeholder', 'Tu nombre de usuario')}
                                />
                                {usernameError && (
                                    <p style={{ color: 'var(--error, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                                        {usernameError}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label>{t('onb_phone', 'Teléfono')}</label>
                                <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowPrefixes(!showPrefixes); setPrefixSearch(''); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '0 12px', minWidth: '90px',
                                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                                            fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <span>{phonePrefixes.find(p => p.code === phonePrefix)?.flag || '🇲'}</span>
                                        <span style={{ fontWeight: '600' }}>{phonePrefix}</span>
                                        <ChevronDown size={14} color="var(--text-muted)" />
                                    </button>
                                    <input
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="600 000 000"
                                        type="tel"
                                        style={{ flex: 1 }}
                                    />
                                    {showPrefixes && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                            marginTop: '4px', maxHeight: '240px', overflowY: 'auto',
                                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius)', zIndex: 50,
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                        }}>
                                            <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                                                <input
                                                    value={prefixSearch}
                                                    onChange={(e) => setLangSearch(e.target.value)}
                                                    placeholder={t('search_country', 'Buscar país...')}
                                                    autoFocus
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                />
                                            </div>
                                            {phonePrefixes
                                                .filter(p => {
                                                    const q = prefixSearch.toLowerCase();
                                                    return !q || p.country.toLowerCase().includes(q) || p.code.includes(q);
                                                })
                                                .map(p => (
                                                    <button
                                                        key={p.code}
                                                        onClick={() => { setPhonePrefix(p.code); setShowPrefixes(false); }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '10px',
                                                            width: '100%', padding: '10px 12px',
                                                            background: phonePrefix === p.code ? 'var(--accent-soft)' : 'transparent',
                                                            border: 'none', borderBottom: '1px solid var(--border)',
                                                            color: 'var(--text-primary)', fontSize: '14px',
                                                            cursor: 'pointer', fontFamily: 'Inter', textAlign: 'left'
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '18px' }}>{p.flag}</span>
                                                        <span style={{ flex: 1 }}>{p.country}</span>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>{p.code}</span>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label style={{ marginBottom: '4px' }}>{t('onb_languages_spoken', 'Idiomas que hablas')}</label>
                                {/* Selected languages chips */}
                                {selectedLanguages.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                        {selectedLanguages.map(langId => {
                                            const lang = allLanguages.find(l => l.id === langId);
                                            return (
                                                <span key={langId} style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '4px 10px', borderRadius: '16px',
                                                    background: 'var(--accent-soft)', color: 'var(--accent)',
                                                    fontSize: '12px', fontWeight: '600',
                                                    border: '1px solid var(--accent)'
                                                }}>
                                                    <span>{lang?.flag}</span> {lang?.name || langId}
                                                    <button onClick={() => setSelectedLanguages(prev => prev.filter(l => l !== langId))}
                                                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '0 0 0 2px', display: 'flex' }}>
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Dropdown trigger */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowLanguages(!showLanguages); setLangSearch(''); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            width: '100%', padding: '12px 14px',
                                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius)', color: 'var(--text-secondary)',
                                            fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter', textAlign: 'left'
                                        }}
                                    >
                                        <Globe size={16} color="var(--accent)" />
                                        <span style={{ flex: 1 }}>
                                            {selectedLanguages.length === 0 ? t('onb_select_lang', 'Seleccionar idiomas...') : `${selectedLanguages.length} ${t('onb_langs_selected', 'idiomas seleccionados')}`}
                                        </span>
                                        <ChevronDown size={14} color="var(--text-muted)" style={{ transform: showLanguages ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                                    </button>
                                    {showLanguages && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                            marginTop: '4px', maxHeight: '220px', overflowY: 'auto',
                                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius)', zIndex: 50,
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                        }}>
                                            <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                                                <input
                                                    value={langSearch}
                                                    onChange={(e) => setLangSearch(e.target.value)}
                                                    placeholder={t('search_lang', 'Buscar idioma...')}
                                                    autoFocus
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                />
                                            </div>
                                            {allLanguages
                                                .filter(l => !langSearch || l.name.toLowerCase().includes(langSearch.toLowerCase()))
                                                .map(lang => {
                                                    const isSelected = selectedLanguages.includes(lang.id);
                                                    return (
                                                        <button
                                                            key={lang.id}
                                                            onClick={() => {
                                                                setSelectedLanguages(prev =>
                                                                    isSelected ? prev.filter(l => l !== lang.id) : [...prev, lang.id]
                                                                );
                                                            }}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                                width: '100%', padding: '10px 12px',
                                                                background: isSelected ? 'var(--accent-soft)' : 'transparent',
                                                                border: 'none', borderBottom: '1px solid var(--border)',
                                                                color: 'var(--text-primary)', fontSize: '14px',
                                                                cursor: 'pointer', fontFamily: 'Inter', textAlign: 'left'
                                                            }}
                                                        >
                                                            <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                                                            <span style={{ flex: 1 }}>{lang.name}</span>
                                                            {isSelected && <Check size={16} color="var(--accent)" />}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label style={{ marginBottom: '4px' }}>{t('onb_work_zones', 'Zonas de trabajo (hasta 6)')}</label>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                    {t('onb_work_zones_desc', 'Los clientes te encontrarán cuando busquen en estas zonas')}
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {locations.map((loc, i) => (
                                        <div key={i} style={{ position: 'relative' }}>
                                            <MapPin size={14} style={{
                                                position: 'absolute', left: '10px', top: '14px',
                                                color: loc.trim() ? 'var(--accent)' : 'var(--text-muted)',
                                                zIndex: 1,
                                            }} />
                                            <input
                                                value={loc}
                                                onChange={(e) => {
                                                    const updated = [...locations];
                                                    updated[i] = e.target.value;
                                                    setLocations(updated);
                                                    setActiveZoneIndex(i);
                                                }}
                                                onFocus={() => setActiveZoneIndex(i)}
                                                onBlur={() => setTimeout(() => setActiveZoneIndex(null), 200)}
                                                placeholder={`${t('onb_zone', 'Zona')} ${i + 1}`}
                                                style={{
                                                    paddingLeft: '30px', fontSize: '13px',
                                                    padding: '10px 10px 10px 30px',
                                                }}
                                            />
                                            {/* Autocomplete dropdown */}
                                            {activeZoneIndex === i && loc.trim().length > 0 && (() => {
                                                const matches = spanishLocations.filter(c =>
                                                    c.toLowerCase().includes(loc.toLowerCase().trim()) &&
                                                    !locations.includes(c)
                                                ).slice(0, 5);
                                                if (matches.length === 0 && loc.trim().length > 1) return (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                                        zIndex: 50, background: 'var(--bg-secondary)',
                                                        border: '1px solid var(--border)', borderRadius: '0 0 8px 8px',
                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                                    }}>
                                                        <div style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('not_found', 'No encontrado')}</p>
                                                            <button
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setActiveZoneIndex(null);
                                                                }}
                                                                style={{
                                                                    background: 'var(--accent)', color: 'white', border: 'none',
                                                                    borderRadius: '6px', padding: '5px 12px', fontSize: '11px',
                                                                    marginTop: '4px', cursor: 'pointer', fontFamily: 'Inter', fontWeight: '600',
                                                                }}
                                                            >
                                                                {t('use', 'Usar')} "{loc.trim()}"
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                                if (matches.length === 0) return null;
                                                return (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                                        zIndex: 50, background: 'var(--bg-secondary)',
                                                        border: '1px solid var(--border)', borderRadius: '0 0 8px 8px',
                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                                        maxHeight: '180px', overflowY: 'auto',
                                                    }}>
                                                        {matches.map(city => (
                                                            <button
                                                                key={city}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    const updated = [...locations];
                                                                    updated[i] = city;
                                                                    setLocations(updated);
                                                                    setActiveZoneIndex(null);
                                                                }}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                                    width: '100%', padding: '9px 12px',
                                                                    background: 'transparent', border: 'none',
                                                                    borderBottom: '1px solid var(--border)',
                                                                    color: 'var(--text-primary)', fontSize: '13px',
                                                                    cursor: 'pointer', fontFamily: 'Inter', textAlign: 'left',
                                                                }}
                                                            >
                                                                <MapPin size={12} color="var(--text-muted)" />
                                                                {city}
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{t('onb_bio_title', 'Bio Profesional')}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>{t('onb_bio_desc', 'Cuéntale al mundo tu experiencia')}</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label>{t('onb_experience', 'Años de experiencia')}</label>
                                <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="5" />
                            </div>
                            <div>
                                <label>{t('onb_about', 'Sobre ti')}</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder={t('onb_about_placeholder', 'Describe tu experiencia, habilidades y lo que te hace único como profesional...')}
                                    style={{ minHeight: '120px' }}
                                />
                            </div>
                        </div>
                    </motion.div>
                );

            case 3:
                return (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{t('onb_specialty', 'Especialidad')}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>{t('onb_specialty_desc', 'Selecciona tus áreas de trabajo')}</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                            {tradeGroups.map((group) => (
                                <div key={group.name}>
                                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {t(group.tkey, group.name)}
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {group.trades.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleCategory(cat.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '14px',
                                                    width: '100%', padding: '14px',
                                                    borderRadius: 'var(--radius)',
                                                    border: `2px solid ${selectedCategories.includes(cat.id) ? 'var(--accent)' : 'var(--border)'}`,
                                                    background: selectedCategories.includes(cat.id) ? 'var(--accent-soft)' : 'var(--bg-card)',
                                                    color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500',
                                                    fontFamily: 'Inter, sans-serif', cursor: 'pointer', textAlign: 'left',
                                                    transition: 'var(--transition)'
                                                }}
                                            >
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '8px',
                                                    background: `${cat.color}20`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                }}>
                                                    <cat.icon size={16} color={cat.color} />
                                                </div>
                                                <span style={{ flex: 1 }}>{t(cat.tkey, cat.name)}</span>
                                                {selectedCategories.includes(cat.id) && (
                                                    <Check size={18} color="var(--accent)" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Tiendas / Almacenes group */}
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {t('onb_stores_title', '🏪 Tiendas / Almacenes')}
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                    {t('onb_stores_desc', 'Publica tu tienda para que los profesionales te encuentren. Misma tarifa mensual.')}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {storeCategories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '14px',
                                                width: '100%', padding: '14px',
                                                borderRadius: 'var(--radius)',
                                                border: `2px solid ${selectedCategories.includes(cat.id) ? '#f59e0b' : 'var(--border)'}`,
                                                background: selectedCategories.includes(cat.id) ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)',
                                                color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500',
                                                fontFamily: 'Inter, sans-serif', cursor: 'pointer', textAlign: 'left',
                                                transition: 'var(--transition)'
                                            }}
                                        >
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: `${cat.color}20`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                            }}>
                                                <cat.icon size={16} color={cat.color} />
                                            </div>
                                            <span style={{ flex: 1 }}>{t(cat.tkey) || cat.name}</span>
                                            {selectedCategories.includes(cat.id) && (
                                                <Check size={18} color="#f59e0b" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case 4:
                return (
                    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{t('onb_subscription_title', 'Suscripción Pro')}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>{t('onb_subscription_desc', 'Elige tu plan para acceder a todas las funciones')}</p>

                        <div className="card" style={{
                            background: 'linear-gradient(135deg, #162032, #1e3050)',
                            border: '1px solid var(--accent)',
                            padding: '24px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <CreditCard size={24} color="var(--accent)" />
                                <div>
                                    <p style={{ fontWeight: '700', fontSize: '16px' }}>{t('onb_plan_pro_title', 'Plan Profesional')}</p>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t('onb_plan_pro_desc', 'Todo lo que necesitas para crecer')}</p>
                                </div>
                            </div>
                            <p style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>
                                9.99€<span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-secondary)' }}>{t('onb_per_month', '/mes')}</span>
                            </p>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[
                                    t('onb_feature_1', 'Perfil destacado en el directorio'),
                                    t('onb_feature_2', 'Contacto directo con clientes'),
                                    t('onb_feature_3', 'Portfolio ilimitado'),
                                    t('onb_feature_4', 'Estadísticas de perfil')
                                ].map(f => (
                                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                        <Check size={16} color="var(--success)" /> {f}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Prueba gratuita de 14 días</p>
                        </div>
                    </motion.div>
                );
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <button className="header-back" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
                    <ChevronLeft size={22} />
                </button>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    {step} de 4
                </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '3px', background: 'var(--bg-card)', borderRadius: '2px', marginBottom: '32px' }}>
                <div style={{
                    height: '100%',
                    width: `${(step / 4) * 100}%`,
                    background: 'var(--accent)',
                    borderRadius: '2px',
                    transition: 'width 0.4s ease'
                }} />
            </div>

            {renderStep()}

            {/* Continue button */}
            <div style={{ marginTop: '32px' }}>
                <button
                    className="btn btn-primary w-full"
                    onClick={async () => {
                        if (step === 1 && fullName.trim()) {
                            setLoading(true);
                            try {
                                const { data: { user } } = await supabase.auth.getUser();
                                const { data: existingUser, error } = await supabase
                                    .from('profiles')
                                    .select('id')
                                    .ilike('username', fullName.trim())
                                    .neq('id', user?.id)
                                    .maybeSingle();

                                if (existingUser) {
                                    setUsernameError('Este nombre de usuario ya está en uso. Por favor, elige otro.');
                                    setLoading(false);
                                    return;
                                }
                            } catch (err) {
                                console.error('Error checking username:', err);
                            }
                            setLoading(false);
                            setStep(step + 1);
                        } else if (step < 4) {
                            setStep(step + 1);
                        } else {
                            handleSubmit();
                        }
                    }}
                    disabled={loading || (step === 1 && !fullName.trim())}
                    style={{ padding: '16px', fontSize: '15px' }}
                >
                    {step === 4 ? (loading ? 'Procesando...' : 'Comenzar Prueba Gratuita') : 'Continuar'}
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default OnboardingPro;
