import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, Camera, Check, CreditCard, Store, Hammer, Droplets, TreePine, Square, Zap, Paintbrush, CircleDot, MapPin, Globe, X, Shield, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { spanishLocations } from '../data/locations';
import { tradeGroups } from '../data/categories';
import { useLanguage } from '../lib/LanguageContext';
import { DAYS_CONFIG, TIMEZONES } from '../utils/businessHoursUtils';
import { LANGUAGES } from '../utils/languagesUtils';

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



const OnboardingPro = () => {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [isExistingPro, setIsExistingPro] = useState(false);
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
    const [dniFile, setDniFile] = useState(null);
    const [dniPreview, setDniPreview] = useState(null);
    const [dniUploading, setDniUploading] = useState(false);
    const [dniUploaded, setDniUploaded] = useState(false);
    const [storeAddress, setStoreAddress] = useState(''); // physical address for stores
    const [businessHours, setBusinessHours] = useState(null);
    const [timezone, setTimezone] = useState('Europe/Madrid');
    const [storeImageFile, setStoreImageFile] = useState(null);
    const [storeImagePreview, setStoreImagePreview] = useState(null);
    const [deliveryAvailable, setDeliveryAvailable] = useState(false);
    const [website, setWebsite] = useState('');
    const [taxId, setTaxId] = useState('');
    const storeImageInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const dniInputRef = useRef(null);
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
                    if (Array.isArray(profile.languages)) setSelectedLanguages(profile.languages);
                    if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
                }

                // Load from professionals
                const { data: pro } = await supabase
                    .from('professionals')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (pro) {
                    // Only skip payment step if subscription is actually active
                    setIsExistingPro(pro.subscription_status === 'active');
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
                    if (pro.specialty) {
                        const cats = pro.specialty.split(',').map(s => s.trim());
                        setSelectedCategories(cats);
                        // If this is a store, load the physical address into storeAddress
                        if (cats.some(c => c.startsWith('store-')) && pro.location) {
                            setStoreAddress(pro.location);
                        }
                    }
                    // Store fields
                    if (pro.business_hours && typeof pro.business_hours === 'object') setBusinessHours(pro.business_hours);
                    if (pro.timezone) setTimezone(pro.timezone);
                    if (pro.store_image) setStoreImagePreview(pro.store_image);
                    if (pro.delivery_available !== undefined && pro.delivery_available !== null) setDeliveryAvailable(pro.delivery_available);
                    if (pro.website) setWebsite(pro.website);
                    if (pro.tax_id) setTaxId(pro.tax_id);
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
        setSelectedCategories(prev => {
            const isStore = id.startsWith('store-');
            if (prev.includes(id)) return prev.filter(c => c !== id);
            return [...prev.filter(c => c.startsWith('store-') === isStore), id];
        });
    };

    // Save profile data without navigating - returns the user object
    const saveProfileData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        // TEMPORARY FALLBACK: Si estamos bloqueados por Supabase y no hay sesión, 
        // devolvemos un usuario de prueba para poder ver la pasarela de Stripe
        if (!user) {
             console.warn("Usuario no autenticado, saltando guardado DB y usando modo demo");
             return { email: 'demo@conectaobra.com', id: 'demo-user-123' };
        }

        const specialtyStr = selectedCategories.join(', ');

        // Upload avatar if selected
        let avatarUrl = null;
        if (avatarFile) {
            const ext = avatarFile.name.split('.').pop();
            const fileName = `${user.id}/avatar_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage
                .from('avatars')
                .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true });
            if (!uploadErr) {
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);
                avatarUrl = urlData?.publicUrl || null;
            }
        }

        // Upload store image if selected
        let storeImageUrl = storeImagePreview && !storeImageFile ? storeImagePreview : null;
        if (storeImageFile) {
            const ext = storeImageFile.name.split('.').pop();
            const fileName = `${user.id}/store_${Date.now()}.${ext}`;
            const { error: storeUploadErr } = await supabase.storage
                .from('portfolio')
                .upload(fileName, storeImageFile, { cacheControl: '3600', upsert: true });
            if (!storeUploadErr) {
                const { data: urlData } = supabase.storage
                    .from('portfolio')
                    .getPublicUrl(fileName);
                storeImageUrl = urlData?.publicUrl || null;
            }
        }

        // Save to profiles table
        const locationStr = locations.filter(l => l.trim()).join(', ');
        const profileUpdate = {
            // Do NOT set role: 'professional' here — that happens via Stripe webhook after payment
            username: fullName.trim(),
            full_name: fullName.trim(),
            specialty: specialtyStr,
            languages: selectedLanguages,
            location: locationStr || null,
            pending_professional: true,
        };
        if (avatarUrl) profileUpdate.avatar_url = avatarUrl;

        const { error: profileErr } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
        if (profileErr) throw new Error(`Error al actualizar perfil: ${profileErr.message}`);

        // Save to professionals table
        const { data: existing } = await supabase
            .from('professionals')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        const isStore = selectedCategories.some(c => c.startsWith('store-'));
        const locationValue = isStore
            ? storeAddress.trim()
            : locations.filter(l => l.trim()).join(', ');

        const proData = {
            full_name: fullName.trim(),
            phone: `${phonePrefix} ${phone}`,
            ...(locationValue ? { location: locationValue } : {}),
            bio,
            experience_years: parseInt(experience, 10) || 0,
            specialty: specialtyStr,
            business_hours: businessHours && Object.values(businessHours).some(slots => slots.length > 0) ? businessHours : null,
            timezone: timezone,
            store_image: storeImageUrl,
            delivery_available: deliveryAvailable,
            website: website,
            tax_id: taxId
        };

        if (existing) {
            const { error: updateErr } = await supabase.from('professionals').update(proData).eq('user_id', user.id);
            if (updateErr) throw new Error(`Error al actualizar profesional: ${updateErr.message}`);
        } else {
            const { error: insertErr } = await supabase.from('professionals').insert({ ...proData, id: user.id, subscription_status: 'pending', user_id: user.id });
            if (insertErr) throw new Error(`Error al crear profesional: ${insertErr.message}`);
        }

        return user;
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await saveProfileData();
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const isStoreSelected = selectedCategories.some(c => c.startsWith('store-'));
    const stepsFlow = isExistingPro
        ? (isStoreSelected
            ? ['personal', 'languages', 'categories', 'storeContact']
            : ['personal', 'languages', 'categories'])
        : (isStoreSelected
            ? ['personal', 'languages', 'categories', 'storeContact', 'subscription']
            : ['personal', 'languages', 'categories', 'subscription']);
    const currentStepId = stepsFlow[step - 1];
    const totalSteps = stepsFlow.length;

    const renderStep = () => {
        switch (currentStepId) {
            case 'personal':
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
                                            const lang = LANGUAGES.find(l => l.id === langId);
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
                                            {LANGUAGES
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

            case 'languages':
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

            case 'categories':
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

                                {/* Extra fields when a store is selected */}
                                {selectedCategories.some(c => c.startsWith('store-')) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{ marginTop: '16px', padding: '16px', background: 'rgba(245,158,11,0.06)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', flexDirection: 'column', gap: '14px' }}
                                    >
                                        <p style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '700', margin: 0 }}>
                                            Datos de contacto de la tienda
                                        </p>
                                        <div>
                                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Telefono de la tienda</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button type="button" onClick={() => setShowPrefixes(v => !v)} style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-container)', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                    {phonePrefixes.find(p => p.code === phonePrefix)?.flag} {phonePrefix} <ChevronDown size={14} />
                                                </button>
                                                <input type="tel" placeholder="612 345 678" value={phone} onChange={e => setPhone(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-container)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Direccion fisica de la tienda</label>
                                            <input type="text" placeholder="Ej: C/ Gran Via 45, Madrid" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-container)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>Se usara para el boton Como llegar.</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );

            
            case 'storeContact':
                return (
                    <motion.div key="step-store-contact" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Tu Tienda o Almacén</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>Completa todos los detalles para que los profesionales te encuentren más fácil.</p>

                        <div style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Nombre & NIF */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1.5 }}>
                                    <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Nombre del negocio *</label>
                                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>NIF/CIF</label>
                                    <input type="text" placeholder="B12345678" value={taxId} onChange={e => setTaxId(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            
                            {/* Descripción */}
                            <div>
                                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Descripción breve *</label>
                                <textarea placeholder="¿Qué venden o en qué se especializan?" value={bio} onChange={e => setBio(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                            </div>

                            {/* Foto del local */}
                            <div>
                                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Foto del local / almacén</label>
                                <input ref={storeImageInputRef} type="file" accept="image/*" onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        setStoreImageFile(file);
                                        const reader = new FileReader();
                                        reader.onloadend = () => setStoreImagePreview(reader.result);
                                        reader.readAsDataURL(file);
                                    }
                                    e.target.value = '';
                                }} style={{ display: 'none' }} />
                                
                                {storeImagePreview ? (
                                    <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                        <img src={storeImagePreview} alt="Local" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button onClick={() => { setStoreImageFile(null); setStoreImagePreview(null); }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}><X size={16} /></button>
                                    </div>
                                ) : (
                                    <motion.button whileTap={{ scale: 0.98 }} onClick={() => storeImageInputRef.current?.click()} style={{ width: '100%', height: '100px', borderRadius: '10px', border: '2px dashed var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '8px' }}>
                                        <Camera size={24} />
                                        <span style={{ fontSize: '13px' }}>Añadir foto principal</span>
                                    </motion.button>
                                )}
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

                            {/* Zona horaria */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Zona horaria</label>
                                <select
                                    value={timezone}
                                    onChange={e => setTimezone(e.target.value)}
                                    style={{
                                        width: '100%', padding: '12px 14px', borderRadius: '10px',
                                        border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)', fontSize: '15px', outline: 'none',
                                        boxSizing: 'border-box', appearance: 'none',
                                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
                                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                                    }}
                                >
                                    {TIMEZONES.map(tz => (
                                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Horario de apertura */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Horario de apertura</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const mondaySlots = (businessHours?.monday || []).map(s => ({ ...s }));
                                            setBusinessHours(prev => {
                                                const updated = { ...(prev || {}) };
                                                ['tuesday', 'wednesday', 'thursday', 'friday'].forEach(d => {
                                                    updated[d] = mondaySlots.map(s => ({ ...s }));
                                                });
                                                return updated;
                                            });
                                        }}
                                        style={{
                                            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600',
                                            background: 'rgba(37,99,235,0.1)', color: 'var(--accent)',
                                            border: '1px solid rgba(37,99,235,0.2)', cursor: 'pointer',
                                        }}
                                    >
                                        Copiar Lunes a L-V
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {DAYS_CONFIG.map(day => {
                                        const slots = businessHours?.[day.key] || [];
                                        const isOpen = slots.length > 0;

                                        const updateSlot = (slotIndex, field, value) => {
                                            setBusinessHours(prev => {
                                                const updated = { ...(prev || {}) };
                                                const daySlots = [...(updated[day.key] || [])];
                                                daySlots[slotIndex] = { ...daySlots[slotIndex], [field]: value };
                                                updated[day.key] = daySlots;
                                                return updated;
                                            });
                                        };

                                        const toggleDay = () => {
                                            setBusinessHours(prev => {
                                                const updated = { ...(prev || {}) };
                                                if (isOpen) {
                                                    updated[day.key] = [];
                                                } else {
                                                    updated[day.key] = [{ open: '09:00', close: '14:00' }];
                                                }
                                                return updated;
                                            });
                                        };

                                        const addSlot = () => {
                                            setBusinessHours(prev => {
                                                const updated = { ...(prev || {}) };
                                                updated[day.key] = [...(updated[day.key] || []), { open: '16:00', close: '20:00' }];
                                                return updated;
                                            });
                                        };

                                        const removeSlot = (index) => {
                                            setBusinessHours(prev => {
                                                const updated = { ...(prev || {}) };
                                                updated[day.key] = (updated[day.key] || []).filter((_, i) => i !== index);
                                                return updated;
                                            });
                                        };

                                        return (
                                            <div key={day.key} style={{
                                                padding: '10px 12px', borderRadius: '10px',
                                                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '600', width: '70px', flexShrink: 0 }}>{day.label}</span>
                                                    {/* Toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={toggleDay}
                                                        style={{
                                                            width: '40px', height: '22px', borderRadius: '11px', border: 'none',
                                                            background: isOpen ? '#22c55e' : 'var(--border)',
                                                            position: 'relative', cursor: 'pointer', transition: '0.2s', flexShrink: 0,
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                                            position: 'absolute', top: '2px',
                                                            left: isOpen ? '20px' : '2px', transition: '0.2s',
                                                        }} />
                                                    </button>
                                                    {!isOpen && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cerrado</span>}
                                                    {isOpen && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                                            {slots.map((slot, si) => (
                                                                <div key={si} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <input
                                                                        type="time"
                                                                        value={slot.open}
                                                                        onChange={e => updateSlot(si, 'open', e.target.value)}
                                                                        style={{
                                                                            padding: '4px 6px', borderRadius: '6px', fontSize: '13px',
                                                                            border: '1px solid var(--border)', background: 'var(--bg-card)',
                                                                            color: 'var(--text-primary)', width: '80px',
                                                                        }}
                                                                    />
                                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                                                                    <input
                                                                        type="time"
                                                                        value={slot.close}
                                                                        onChange={e => updateSlot(si, 'close', e.target.value)}
                                                                        style={{
                                                                            padding: '4px 6px', borderRadius: '6px', fontSize: '13px',
                                                                            border: '1px solid var(--border)', background: 'var(--bg-card)',
                                                                            color: 'var(--text-primary)', width: '80px',
                                                                        }}
                                                                    />
                                                                    {si > 0 && (
                                                                        <button type="button" onClick={() => removeSlot(si)} style={{
                                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                                            color: '#ef4444', padding: '2px', display: 'flex',
                                                                        }}>
                                                                            <X size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {slots.length < 2 && (
                                                                <button type="button" onClick={addSlot} style={{
                                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                                    color: 'var(--accent)', fontSize: '11px', fontWeight: '600',
                                                                    padding: '2px 0', textAlign: 'left',
                                                                }}>
                                                                    + Añadir franja
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

                            {/* Sitio web */}
                            <div>
                                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Sitio web</label>
                                <input type="url" placeholder="Ej: miferr.com" value={website} onChange={e => setWebsite(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            
                            {/* Envío a obra */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                <div style={{
                                    width: '24px', height: '24px', borderRadius: '6px',
                                    background: deliveryAvailable ? 'var(--accent)' : 'var(--bg-card)',
                                    border: `2px solid ${deliveryAvailable ? 'var(--accent)' : 'var(--border-light)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                                }}>
                                    {deliveryAvailable && <Check size={16} color="white" />}
                                </div>
                                <input type="checkbox" checked={deliveryAvailable} onChange={e => setDeliveryAvailable(e.target.checked)} style={{ display: 'none' }} />
                                <div>
                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Hacemos envíos a obra</p>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Diferencial importante</p>
                                </div>
                            </label>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

                            {/* Contacto existents */}
                            <div>
                                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Teléfono de la tienda *</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" onClick={() => setShowPrefixes(v => !v)} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        {phonePrefixes.find(p => p.code === phonePrefix)?.flag} {phonePrefix} <ChevronDown size={14} />
                                    </button>
                                    <input type="tel" placeholder="612 345 678" value={phone} onChange={e => setPhone(e.target.value)} style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Dirección física exacta *</label>
                                <input type="text" placeholder="Ej: C/ Gran Vía 45, Madrid" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', color: 'var(--success)' }}>
                                    <MapPin size={14} />
                                    <span style={{ fontSize: '13px' }}>Esta dirección se usará para el botón "Cómo llegar".</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'subscription':
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

            case 'verification':
                return (
                    <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '16px',
                            background: 'var(--accent-soft)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '20px'
                        }}>
                            <Shield size={28} color="var(--accent)" />
                        </div>

                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{t('verify_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px', lineHeight: 1.5 }}>
                            {t('verify_desc')}
                        </p>

                        <input
                            ref={dniInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setDniFile(file);
                                if (file.type.startsWith('image/')) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setDniPreview(reader.result);
                                    reader.readAsDataURL(file);
                                } else {
                                    setDniPreview(null);
                                }
                                e.target.value = '';
                            }}
                            style={{ display: 'none' }}
                        />

                        {!dniFile && !dniUploaded && (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => dniInputRef.current?.click()}
                                className="card"
                                style={{
                                    width: '100%',
                                    padding: '40px 20px',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', gap: '12px',
                                    cursor: 'pointer',
                                    border: '2px dashed var(--border)',
                                    background: 'var(--bg-secondary)',
                                    transition: 'var(--transition)',
                                }}
                            >
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '50%',
                                    background: 'var(--accent-soft)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Upload size={24} color="var(--accent)" />
                                </div>
                                <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                    {t('verify_upload')}
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    JPG, PNG, PDF
                                </p>
                            </motion.button>
                        )}

                        {dniFile && !dniUploaded && (
                            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                                {dniPreview && (
                                    <img
                                        src={dniPreview}
                                        alt="DNI Preview"
                                        style={{
                                            width: '100%', maxHeight: '200px',
                                            objectFit: 'contain',
                                            borderRadius: 'var(--radius-sm)',
                                            marginBottom: '12px',
                                            border: '1px solid var(--border)',
                                        }}
                                    />
                                )}
                                {!dniPreview && (
                                    <div style={{
                                        padding: '20px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        marginBottom: '12px',
                                    }}>
                                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>📄 {dniFile.name}</p>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => { setDniFile(null); setDniPreview(null); }}
                                        className="btn"
                                        style={{
                                            flex: 1, padding: '10px', fontSize: '13px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setDniUploading(true);
                                            try {
                                                const { data: { user } } = await supabase.auth.getUser();
                                                if (!user) return;
                                                const ext = dniFile.name.split('.').pop();
                                                const fileName = `${user.id}/dni_${Date.now()}.${ext}`;
                                                const { error: uploadErr } = await supabase.storage
                                                    .from('identity-documents')
                                                    .upload(fileName, dniFile, { cacheControl: '3600', upsert: true });
                                                if (uploadErr) throw uploadErr;

                                                // Create signed URL (private bucket)
                                                const { data: signedData } = await supabase.storage
                                                    .from('identity-documents')
                                                    .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

                                                const docUrl = signedData?.signedUrl || fileName;

                                                // Upsert verification record
                                                const { error: dbErr } = await supabase
                                                    .from('identity_verifications')
                                                    .upsert({
                                                        user_id: user.id,
                                                        document_url: docUrl,
                                                        status: 'pending',
                                                        submitted_at: new Date().toISOString(),
                                                    }, { onConflict: 'user_id' });
                                                if (dbErr) throw dbErr;

                                                setDniUploaded(true);
                                            } catch (err) {
                                                console.error('DNI upload error:', err);
                                                alert(err.message || 'Error uploading document');
                                            } finally {
                                                setDniUploading(false);
                                            }
                                        }}
                                        disabled={dniUploading}
                                        className="btn btn-primary"
                                        style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                                    >
                                        {dniUploading ? t('verify_uploading') : t('verify_upload')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {dniUploaded && (
                            <div className="card" style={{
                                padding: '24px', textAlign: 'center',
                                border: '2px solid rgba(34,197,94,0.4)',
                                background: 'rgba(34,197,94,0.08)',
                            }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '50%',
                                    background: 'rgba(34,197,94,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 12px',
                                }}>
                                    <Check size={28} color="#22c55e" />
                                </div>
                                <p style={{ fontSize: '15px', fontWeight: '700', color: '#22c55e', marginBottom: '8px' }}>
                                    {t('verify_pending')}
                                </p>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {t('verify_success')}
                                </p>
                            </div>
                        )}
                    </motion.div>
                );
        }
    };

    return (
        <div style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg-primary)', padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 20px 20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <button className="header-back" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
                    <ChevronLeft size={22} />
                </button>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    {step} de {totalSteps}
                </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '3px', background: 'var(--bg-card)', borderRadius: '2px', marginBottom: '32px' }}>
                <div style={{
                    height: '100%',
                    width: `${(step / totalSteps) * 100}%`,
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
                        if (currentStepId === 'personal' && fullName.trim()) {
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
                        } else if (currentStepId === 'subscription') {
                            setLoading(true);
                            try {
                                // Save profile data first
                                const user = await saveProfileData();
                                // Then redirect to Stripe Checkout
                                const response = await fetch('/api/create-checkout-session', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        email: user?.email,
                                        userId: user?.id,
                                    }),
                                });
                                const data = await response.json();
                                if (data.url) {
                                    window.location.href = data.url;
                                    return;
                                } else {
                                    throw new Error(data.error || 'Error al crear la sesión de pago');
                                }
                            } catch (error) {
                                console.error('Error:', error);
                                alert(error.message);
                                // Optional: Keep them on this page instead of navigating
                            } finally {
                                setLoading(false);
                            }
                        } else if (isExistingPro && step === totalSteps) {
                            // Existing pro editing profile: just save and go back
                            setLoading(true);
                            try {
                                await saveProfileData();
                                navigate('/profile');
                            } catch (error) {
                                console.error(error);
                                alert(error.message);
                            } finally {
                                setLoading(false);
                            }
                        } else {
                            setStep(step + 1);
                        }
                    }}
                    disabled={loading || (currentStepId === 'personal' && !fullName.trim())}
                    style={{ padding: '16px', fontSize: '15px' }}
                >
                    {currentStepId === 'subscription'
                        ? (loading ? 'Procesando...' : 'Comenzar Prueba Gratuita')
                        : (isExistingPro && step === totalSteps)
                            ? (loading ? 'Guardando...' : 'Guardar cambios')
                            : currentStepId === 'verification'
                                ? (dniUploaded ? t('onb_next') : t('verify_skip'))
                                : t('onb_next')}
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default OnboardingPro;
