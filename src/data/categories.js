import {
    Paintbrush, Wrench, Zap, Droplets, BrickWall, Wind,
    Flame, Ruler, DoorOpen, Footprints, Sparkles, KeyRound,
    HardHat, Flower2,
    Hammer, Settings, Building2
} from 'lucide-react';

// ── Individual trades ──────────────────────────────────────
export const trades = [
    { id: 'renovations', name: 'Reformas', tkey: 'trade_reformas', icon: HardHat, color: '#f43f5e', group: 'Oficios' },
    { id: 'painting', name: 'Pintor', tkey: 'trade_pintor', icon: Paintbrush, color: '#3b82f6', group: 'Oficios' },
    { id: 'carpentry', name: 'Carpintero', tkey: 'trade_carpintero', icon: Wrench, color: '#f59e0b', group: 'Oficios' },
    { id: 'electrical', name: 'Electricista', tkey: 'trade_electricista', icon: Zap, color: '#ef4444', group: 'Oficios' },
    { id: 'plumbing', name: 'Fontanero', tkey: 'trade_fontanero', icon: Droplets, color: '#22c55e', group: 'Oficios' },
    { id: 'masonry', name: 'Albañil', tkey: 'trade_albanil', icon: BrickWall, color: '#8b5cf6', group: 'Oficios' },
    { id: 'hvac', name: 'Climatización', tkey: 'trade_climatizacion', icon: Wind, color: '#06b6d4', group: 'Oficios' },
    { id: 'welder', name: 'Soldador', tkey: 'trade_soldador', icon: Flame, color: '#f97316', group: 'Oficios' },
    { id: 'plasterer', name: 'Escayolista / Yesista', tkey: 'trade_escayolista', icon: Ruler, color: '#a3a3a3', group: 'Oficios' },
    { id: 'drywall', name: 'Pladur', tkey: 'trade_pladur', icon: DoorOpen, color: '#64748b', group: 'Oficios' },
    { id: 'tiler', name: 'Ensolador', tkey: 'trade_ensolador', icon: Footprints, color: '#0ea5e9', group: 'Oficios' },
    { id: 'floor-polisher', name: 'Pulimentador de suelos', tkey: 'trade_pulimentador', icon: Sparkles, color: '#eab308', group: 'Oficios' },
    { id: 'locksmith', name: 'Cerrajero', tkey: 'trade_cerrajero', icon: KeyRound, color: '#d946ef', group: 'Oficios' },
    { id: 'formwork', name: 'Encofrador / Ferallista', tkey: 'trade_encofrador', icon: Hammer, color: '#b45309', group: 'Oficios' },
    { id: 'pools', name: 'Piscinas', tkey: 'trade_piscinas', icon: Droplets, color: '#38bdf8', group: 'Oficios' },
    { id: 'gardener', name: 'Jardinero', tkey: 'trade_jardinero', icon: Flower2, color: '#16a34a', group: 'Oficios' },
    { id: 'maintenance', name: 'Mantenimiento', tkey: 'trade_mantenimiento', icon: Settings, color: '#64748b', group: 'Oficios' },
    { id: 'real-estate', name: 'Inmobiliaria', tkey: 'trade_inmobiliaria', icon: Building2, color: '#0d9488', group: 'Oficios' },
];

// ── Grouped for display ────────────────────────────────────
export const tradeGroups = [
    { name: 'Oficios', tkey: 'dash_trades', trades: trades.filter(t => t.group === 'Oficios') },
];

// ── Featured trades for the Dashboard grid (top 6) ─────────
export const featuredTrades = trades.slice(0, 6);

// ── Helper: find trade by id ───────────────────────────────
export const getTradeById = (id) => trades.find(t => t.id === id);
