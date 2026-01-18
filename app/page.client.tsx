'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { 
  Settings, ShoppingCart, Heart, Shield, Target, 
  RefreshCw, Flame, Trophy, Clock, 
  ChevronRight, Wallet, Activity, Zap, X, 
  User, Moon, Sun, Medal, Star, Play, Pause,
  Hash, BarChart3, Database, Cpu, Layers, Trash2, Plus, ChevronDown, Sparkles
} from 'lucide-react';

// --- TYPES & INTERFACES ---
type GameState = 'start' | 'playing' | 'paused' | 'resuming' | 'gameover' | 'shop' | 'leaderboard' | 'profile' | 'achievements';
type FontSkin = 'font-sans' | 'font-mono' | 'font-serif';

interface UserProfile {
  id: string;
  name: string;
  stats: GameStats;
  achievements: string[];
  createdAt: number;
  level: number;
  xp: number;
}

interface GameSettings {
  speed: number;
  spawnRate: number;
  fontSize: number;
  volume: number;
}

interface FallingItem {
  id: number;
  char: string;
  x: number;
  y: number;
  color: string;
  type: 'normal' | 'heart' | 'gold' | 'bomb';
  scale?: number;
}

interface GameStats {
  totalScore: number;
  totalMoney: number;
  gamesPlayed: number;
  heartsCollected: number;
  maxCombo: number;
}
interface RankingEntry {
  playerName: string;
  score: number;
  date: string;
  config: {
    speed: number;
    spawnRate: number;
    fontSize: number;
  };
}
// --- CONSTANTS ---
const MAX_ACCOUNTS = 10;
const XP_PER_SCORE = 5;

const ACHIEVEMENT_LIST = [
  { id: '1', title: 'Novice', desc: 'Score 100 points', req: (s: GameStats) => s.totalScore >= 100, icon: <Star className="text-yellow-400"/> },
  { id: '2', title: 'Wealthy', desc: 'Earn 1000 credits', req: (s: GameStats) => s.totalMoney >= 1000, icon: <Wallet className="text-emerald-400"/> },
  { id: '3', title: 'Survivor', desc: 'Collect 50 hearts', req: (s: GameStats) => s.heartsCollected >= 50, icon: <Heart className="text-rose-400"/> },
  { id: '4', title: 'Veteran', desc: 'Play 50 games', req: (s: GameStats) => s.gamesPlayed >= 50, icon: <Trophy className="text-blue-400"/> },
  { id: '5', title: 'Combo King', desc: 'Reach 50x Combo', req: (s: GameStats) => s.maxCombo >= 50, icon: <Flame className="text-orange-500"/> },
];
const playSound = (src: string, volume: number) => {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {}); // Catch zapobiega błędom, gdy user jeszcze nie kliknął na stronę
};
// --- MAIN COMPONENT ---
export default function UltraTypeEngineV6() {
  // Accounts & Profiles
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ut6_profiles');
      if (saved) return JSON.parse(saved);
      return [{
        id: 'p1',
        name: 'TypeMaster_01',
        stats: { totalScore: 0, totalMoney: 0, gamesPlayed: 0, heartsCollected: 0, maxCombo: 0 },
        achievements: [],
        createdAt: Date.now(),
        level: 1,
        xp: 0
      }];
    }
    return [];
  });
const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ut6_active_id') || 'p1';
    }
    return 'p1';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ut6_theme');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [isLoaded, setIsLoaded] = useState(false);
    const [playerName, setPlayerName] = useState(profiles.find(p => p.id === activeProfileId)?.name || 'TypeMaster_01');
  
  // App States
  const [gameState, setGameState] = useState<GameState>('start');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [resumeCounter, setResumeCounter] = useState(3);
    const [prevGameState, setPrevGameState] = useState<GameState>('start');
  const [ranking, setRanking] = useState<RankingEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ut6_ranking');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Gameplay
  const [score, setScore] = useState(0);
  const [money, setMoney] = useState(0);
  const [lives, setLives] = useState(3);
  const [shields, setShields] = useState(0);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [heat, setHeat] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [screenFlash, setScreenFlash] = useState(false);

  // Config
  const [settings, setSettings] = useState<GameSettings>({
    speed: 0.25,
    spawnRate: 2000,
    fontSize: 70,
    volume: 0.3
  });

  const itemsRef = useRef<FallingItem[]>([]);
  const lastSpawnRef = useRef(0);
  const engineFrameRef = useRef(0);

  // Safe Accessor for Active Profile
  const activeProfile = useMemo(() => {
    if (profiles.length === 0) return null;
    return profiles.find(p => p.id === activeProfileId) || profiles[0];
  }, [profiles, activeProfileId]);

  // --- PERSISTENCE ---
  useEffect(() => {
    const savedProfiles = localStorage.getItem('ut6_profiles');
    const savedActiveId = localStorage.getItem('ut6_active_id');
    const savedTheme = localStorage.getItem('ut6_theme');
    
    let profilesToSet: UserProfile[];
    let activeIdToSet: string;
    
    if (savedProfiles) {
      profilesToSet = JSON.parse(savedProfiles);
      activeIdToSet = savedActiveId || profilesToSet[0]?.id || 'p1';
    } else {
      const defaultProfile: UserProfile = {
        id: 'p1',
        name: 'TypeMaster_01',
        stats: { totalScore: 0, totalMoney: 0, gamesPlayed: 0, heartsCollected: 0, maxCombo: 0 },
        achievements: [],
        createdAt: Date.now(),
        level: 1,
        xp: 0
      };
      profilesToSet = [defaultProfile];
      activeIdToSet = 'p1';
    }
    
    if (savedTheme) setIsDarkMode(JSON.parse(savedTheme));
    setProfiles(profilesToSet);
    setActiveProfileId(activeIdToSet);
    setIsLoaded(true);
  }, []);
  const handleReturnToGame = () => {
    if (prevGameState === 'playing') {
      setGameState('paused');
    } else {
      setGameState('start');
    }
  };

  useEffect(() => {
    if (isLoaded) {
    localStorage.setItem('ut6_profiles', JSON.stringify(profiles));
      localStorage.setItem('ut6_active_id', activeProfileId);
      localStorage.setItem('ut6_theme', JSON.stringify(isDarkMode))
        localStorage.setItem('ut6_ranking', JSON.stringify(ranking));
    }
  }, [profiles, activeProfileId, isDarkMode, isLoaded, ranking]);

  // --- PROFILE LOGIC ---
  const createProfile = (name: string) => {
    if (profiles.length >= MAX_ACCOUNTS) return;
    const newP: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || `Pilot_${profiles.length + 1}`,
      stats: { totalScore: 0, totalMoney: 0, gamesPlayed: 0, heartsCollected: 0, maxCombo: 0 },
      achievements: [],
      createdAt: Date.now(),
      level: 1,
      xp: 0
    };
    setProfiles([...profiles, newP]);
    setActiveProfileId(newP.id);
  };

  const deleteProfile = (id: string) => {
    if (profiles.length <= 1) return;
    const filtered = profiles.filter(p => p.id !== id);
    setProfiles(filtered);
    if (activeProfileId === id) setActiveProfileId(filtered[0].id);
  };

  const updateActiveStats = useCallback((newStats: Partial<GameStats>, gainedXp: number = 0) => {
    setProfiles(prev => prev.map(p => {
      if (p.id === activeProfileId) {
        const updatedStats = { ...p.stats, ...newStats };
        const newlyUnlocked = ACHIEVEMENT_LIST
          .filter(a => !p.achievements.includes(a.id) && a.req(updatedStats))
          .map(a => a.id);
        
        let newXp = p.xp + gainedXp;
        let newLevel = p.level;
        const xpToNext = p.level * 1000;
        
        if (newXp >= xpToNext) {
          newXp -= xpToNext;
          newLevel += 1;
        }

        return { 
          ...p, 
          stats: updatedStats,
          achievements: [...p.achievements, ...newlyUnlocked],
          xp: newXp,
          level: newLevel
        };
      }
      return p;
    }));
  }, [activeProfileId]);

  // --- GAME ENGINE ---
  const handleQuickReset = () => {
    setScore(0); setLives(3); setShields(0); setMoney(0); setHeat(0); setCombo(0);
    itemsRef.current = []; setItems([]);
    setGameState('playing');
    setShowSettingsDropdown(false);
  };
  const saveToRanking = useCallback((finalScore: number) => {
    const newEntry: RankingEntry = {
      playerName: playerName,
      score: finalScore,
      date: new Date().toLocaleString('pl-PL'),
      config: { ...settings }
    };
    setRanking(prev => [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 50));
  }, [playerName, settings]);

  const spawnItem = useCallback(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const rand = Math.random();
    let type: FallingItem['type'] = 'normal';
    let color = isDarkMode ? '#60a5fa' : '#2563eb';

    if (rand < 0.06) { type = 'heart'; color = '#f43f5e'; }
    else if (rand < 0.12) { type = 'gold'; color = '#fbbf24'; }
    else if (rand < 0.15) { type = 'bomb'; color = '#ef4444'; }

    itemsRef.current.push({
      id: Math.random(),
      char: chars[Math.floor(Math.random() * chars.length)],
      x: 5 + Math.random() * 90,
      y: -5,
      type,
      color,
      scale: 1
    });
  }, [isDarkMode]);

// 2. Usuń score, combo, shields z zależności, używając aktualizacji funkcyjnych

// 1. Stwórz Refy, które będą zawsze trzymać aktualne wartości bez przebudowywania funkcji
const statsRef = useRef({ score: 0, combo: 0 });
const settingsRef = useRef(settings);

// 2. Synchronizuj Refy z aktualnym stanem
useEffect(() => {
  statsRef.current = { score, combo };

}, [score, combo]);

useEffect(() => {
  settingsRef.current = settings;
}, [settings]);

const engineUpdate = useCallback((time: number) => {
  if (gameState !== 'playing') {
    setHeat(h => Math.max(0, h - 0.2));
    return;
  }

  // Używamy Refa zamiast stanu bezpośrednio, aby uniknąć zależności


  // SPAWN LOGIC
  if (time - lastSpawnRef.current > settingsRef.current.spawnRate) {
    spawnItem();
    lastSpawnRef.current = time;
  }

  const nextItems: FallingItem[] = [];
  let missed = false;

  itemsRef.current.forEach(it => {
    it.y += settingsRef.current.speed;
    if (it.y > 100) {
      if (it.type === 'normal') missed = true;
    } else {
      nextItems.push(it);
    }
  });

  itemsRef.current = nextItems;
  setItems([...nextItems]);

  if (missed) {  if(showSettingsDropdown) return 0;
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 100);
  playSound('https://assets.mixkit.co/active_storage/sfx/210/210-preview.mp3', settingsRef.current.volume);
    setShields(prevShields => {
      if (prevShields > 0) return prevShields - 1;

      setLives(l => {
        if (l <= 1) { 
          setGameState('gameover'); 
            playSound('https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3', settingsRef.current.volume);
          if (activeProfile) {
            // Pobieramy wartości z Refa w krytycznym momencie Game Over
            const finalScore = statsRef.current.score;
            const finalCombo = statsRef.current.combo;

            saveToRanking(finalScore); 
            updateActiveStats({ 
              totalScore: activeProfile.stats.totalScore + finalScore,
              gamesPlayed: activeProfile.stats.gamesPlayed + 1,
              maxCombo: Math.max(activeProfile.stats.maxCombo, finalCombo)
            }, finalScore * XP_PER_SCORE);
          }
          return 0; 
        }

      
        return l - 1;
      });
      return 0;
    });

    setMultiplier(1);
    setCombo(0);
  }

  setHeat(h => Math.max(0, h - 0.2));
  
}, [
  gameState, 
  spawnItem, 
  activeProfile, 
  updateActiveStats, 
  saveToRanking,
  showSettingsDropdown
  // ZAUWAŻ: score, combo i settings zostały usunięte z zależności!
  // Silnik nie będzie się restartował przy każdym punkcie.
]);
  useEffect(() => {
    const tick = (time: number) => {
      engineUpdate(time);
      engineFrameRef.current = requestAnimationFrame(tick);
    };
    engineFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(engineFrameRef.current);
  }, [engineUpdate]);

  // --- INPUT HANDLER ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || isOverheated || showSettingsDropdown) return;
      const key = e.key.toUpperCase();
      const idx = itemsRef.current.findIndex(it => it.char === key);
      if (idx !== -1) {
        const item = itemsRef.current[idx];
        
        if (item.type === 'bomb') {
          setLives(l => Math.max(0, l - 1));
          setHeat(100); setIsOverheated(true);
          setCombo(0);
          setTimeout(() => setIsOverheated(false), 1500);
        } else if (item.type === 'heart') {
          setLives(l => Math.min(5, l + 1));
          if (activeProfile) updateActiveStats({ heartsCollected: activeProfile.stats.heartsCollected + 1 });
            playSound('https://assets.mixkit.co/active_storage/sfx/2058/2058-preview.mp3', settings.volume);
        } else {
          const points = Math.floor(10 * multiplier);
          setScore(s => s + points);
          setMoney(m => m + 2);
          setMultiplier(m => Math.min(10, m + 0.05));
          setCombo(c => c + 1);
          playSound('https://assets.mixkit.co/active_storage/sfx/2533/2533-preview.mp3', settings.volume);
        }
        itemsRef.current.splice(idx, 1);
      } else {
        setHeat(h => {
          const nh = h + 15;
          if (nh >= 100) { setIsOverheated(true); setTimeout(() => setIsOverheated(false),1000); return 100; }
          return nh;
        });
        setMultiplier(1);
        setCombo(0);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, isOverheated, multiplier, activeProfile, updateActiveStats, showSettingsDropdown]);

  // Prevent crash if data not loaded
  if (!isLoaded || !activeProfile) {
    return <div className="bg-black w-screen h-screen flex items-center justify-center text-blue-500 font-mono">INITIALIZING KERNEL...</div>;
  }

  const theme = {
    bg: isDarkMode ? 'bg-[#050506]' : 'bg-[#f8fafc]',
    text: isDarkMode ? 'text-white' : 'text-slate-900',
    card: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50',
    sub: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    accent: 'text-blue-500',
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${theme.bg} ${theme.text} font-sans transition-colors duration-500 `}>

      <div className={`${screenFlash ? 'opacity-100' : 'opacity-0'} transition-all fixed top-0 left-0 w-full h-full bg-transparent border-8 border-red-500 pointer-events-none`}></div>
<div className="flex flex-col items-center mb-8 pointer-events-auto fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
  <div className="flex justify-between w-64 mb-2 px-1">
    <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
      <Flame size={12} className={heat > 70 ? "animate-pulse" : ""} /> 
      Temperatura Systemu
    </span>
    <span className={`text-[10px] font-black tabular-nums ${heat > 80 ? "text-red-500" : "text-slate-400"}`}>
      {Math.round(heat)}%
    </span>
  </div>
  
  {/* Kontener paska - w-64 zapewnia stałą szerokość */}
  <div className="w-64 h-3 bg-slate-500/20 rounded-full overflow-hidden border border-white/10 backdrop-blur-md relative p-0.5">
    <motion.div
      className="h-full rounded-full"
      // Używamy stylu inline dla szerokości i gradientu, aby uniknąć konfliktów klas
      style={{
        background: heat > 80 
          ? 'linear-gradient(to right, #ef4444, #b91c1c)' 
          : 'linear-gradient(to right, #f97316, #ef4444)',
      }}
      initial={{ width: "0%" }}
      animate={{ 
        width: `${Math.min(heat, 100)}%` // Zabezpieczenie przed wyjściem poza 100%
      }}
      transition={{ type: "spring", stiffness: 30000, damping: 10 }}
    />
  </div>
</div>
<AnimatePresence>
  {isOverheated && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-red-950/40 backdrop-blur-2xl"
    >
      {/* Efekt pulsującego tła */}
      <motion.div 
        className="absolute inset-0 bg-red-600/10"
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <motion.div
        initial={{ scale: 0.8, y: 20, rotateX: 30 }}
        animate={{ scale: 1, y: 0, rotateX: 0 }}
        exit={{ scale: 1.1, opacity: 0 }}
        className="relative bg-white dark:bg-black/80 p-12 rounded-[48px] border-4 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)] max-w-xl text-center"
      >
        {/* Ikona Ostrzeżenia */}
        <motion.div
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ repeat: Infinity, duration: 0.2 }}
          className="inline-flex p-6 bg-red-600 text-white rounded-3xl mb-8"
        >
          <Zap size={48} fill="currentColor" />
        </motion.div>

        {/* Tytuł z efektem Glitch */}
        <motion.h2 
          animate={{ x: [-1, 1, -1] }}
          transition={{ repeat: Infinity, duration: 0.1 }}
          className="text-5xl font-black italic uppercase tracking-tighter mb-4 text-red-600"
        >
          Klawiatura Przegrzana
        </motion.h2>

        <p className="text-xl font-bold opacity-70 uppercase tracking-tight leading-tight mb-8">
          Wykryto zbyt wiele błędnych sekwencji. <br />
          <span className="text-red-500">Blokada procesora wprowadzania.</span>
        </p>

        {/* Pasek odliczania (wizualny) */}
        <div className="w-full h-1 bg-red-600/20 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-red-600"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
        
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Chłodzenie rdzenia w toku...
        </p>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
      {/* BACKGROUND DECO & GRID */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${isDarkMode ? '#ffffff10' : '#00000010'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#ffffff10' : '#00000010'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div className={`absolute top-0 left-0 w-full h-full ${isDarkMode ? 'bg-[radial-gradient(circle_at_50%_50%,#1e40af_0%,transparent_70%)]' : 'bg-[radial-gradient(circle_at_50%_50%,#bfdbfe_0%,transparent_70%)]'}`} />
      </div>

      {/* GAME CANVAS */}
      <div className="absolute inset-0 z-10">
        <AnimatePresence>
          {items.map(it => (
            <motion.div 
              key={it.id} 
              className="absolute font-black pointer-events-none drop-shadow-2xl"
              style={{ left: `${it.x}%`, top: `${it.y}%`, fontSize: `${settings.fontSize}px`, color: it.color }}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 2, opacity: 0 }}
            >
              {it.char}
              {it.type === 'gold' && <Sparkles size={14} className="absolute -top-4 -right-4 animate-pulse" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* COMBO HUD */}
      {combo > 5 && (
        <motion.div 
          initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className="absolute right-10 top-1/2 -translate-y-1/2 z-50 text-right"
          onViewportEnter={()=>  playSound('https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3', settingsRef.current.volume)}
        >
          <p className="text-xl font-bold text-orange-500 uppercase italic">Combo</p>
          <p className="text-8xl font-black italic leading-none">{combo}x</p>
          <div className="w-full h-1 bg-white/10 mt-2 overflow-hidden">
            <motion.div className="h-full bg-orange-500" animate={{ width: '100%' }} transition={{ duration: 2 }} />
          </div>
        </motion.div>
      )}

      {/* TOP NAVIGATION HUD */}
      <div className="absolute top-0 inset-x-0 p-6 z-[60] flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          <motion.div layout className={`${theme.card} backdrop-blur-3xl p-6 rounded-[32px] flex items-center gap-8`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-xl">
                {activeProfile.level}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-blue-500">Pilot Level</p>
                <div className="w-32 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                   <div className="h-full bg-blue-500" style={{ width: `${(activeProfile.xp / (activeProfile.level * 1000)) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-500/20" />
            <div>
              <p className="text-[10px] font-bold uppercase text-orange-500">Score</p>
              <p className="text-4xl font-black tabular-nums">{score}</p>
            </div>
            <div className="w-px h-10 bg-slate-500/20" />
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-500">Credits</p>
              <p className="text-2xl font-black text-emerald-400">${money}</p>
            </div>
            <div className="w-px h-10 bg-slate-500/20" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Heart key={i} size={18} className={i < lives ? "fill-rose-500 text-rose-500" : "text-slate-500/20"} />
              ))}
            </div>
          </motion.div>

          <div className="flex gap-2">
            <button 
              onClick={handleQuickReset}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl flex items-center gap-2 font-black transition-all shadow-lg shadow-red-600/30"
            >
              <RefreshCw size={18} /> RESET
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                className={`p-3 ${theme.card} rounded-2xl flex items-center gap-2 hover:scale-105 transition-all pointer-events-auto`}
              >
                <Settings size={20} /> <ChevronDown size={14} />
              </button>
              
              <AnimatePresence>
                {showSettingsDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className={`absolute top-full left-0 mt-4 w-72 p-6 ${theme.card} backdrop-blur-2xl rounded-3xl z-[100] shadow-2xl`}
                  >
                    <p className="text-xs font-black mb-6 uppercase tracking-widest text-blue-500">Engine Tuning</p>
                    <div className="space-y-6">
                      <Slider label="Gravity" val={settings.speed} min={0.05} max={0.8} step={0.01} onChange={(v: number) => setSettings({...settings, speed: v})} />
                      <Slider label="Intensity" val={settings.spawnRate} min={1200} max={5000} step={50} invert onChange={(v: number) => setSettings({...settings, spawnRate: v})} />
                      <Slider label="Char Size" val={settings.fontSize} min={20} max={80} step={2} onChange={(v: number) => setSettings({...settings, fontSize: v})} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <NavBtn onClick={() => setGameState('profile')} icon={<User size={20}/>} theme={theme} />
          <NavBtn onClick={() => setGameState('achievements')} icon={<Medal size={20}/>} theme={theme} />
          <NavBtn onClick={() => setGameState('leaderboard')} icon={<Trophy size={20}/>} theme={theme} />
          <NavBtn onClick={() => setIsDarkMode(!isDarkMode)} icon={isDarkMode ? <Sun size={20}/> : <Moon size={20}/>} theme={theme} />
          <button 
            onClick={() => setGameState(gameState === 'playing' ? 'paused' : 'playing')}
            className={`p-4 rounded-2xl ${gameState === 'playing' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-600 text-white'} transition-all`}
          >
            {gameState === 'playing' ? <Pause size={20}/> : <Play size={20}/>}
          </button>
        </div>
      </div>

      {/* OVERLAYS */}
      <AnimatePresence mode="wait">
        {gameState === 'start' && (
          <Overlay key="start">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
              <h1 className="text-[100px] font-black leading-none mb-4 italic tracking-tighter">ULTRA<span className="text-blue-600">TYPE</span></h1>
              <p className={`${theme.sub} uppercase tracking-[0.5em] text-sm mb-12`}>V6.5 Kinetic typing system</p>
              <button 
                onClick={() => setGameState('playing')}
                className="px-16 py-6 bg-blue-600 text-white rounded-full text-2xl font-black shadow-2xl hover:bg-blue-500 transition-all"
              >
                START INTERFACE
              </button>
              <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold">
                <span className={theme.sub}>ACTIVE PILOT:</span>
                <span className="text-blue-500 underline uppercase tracking-widest">{activeProfile.name}</span>
              </div>
            </motion.div>
          </Overlay>
        )}

        {gameState === 'paused' && (
      
            <div className="text-center z-200 p-12 bg-black/40 backdrop-blur-md rounded-[60px] border border-white/10 pointer-events-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Pause size={64} className="mx-auto mb-8 text-blue-500 animate-pulse" />
              <h2 className="text-5xl font-black mb-12 uppercase italic">Engine Paused</h2>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setGameState('playing')} className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black text-xl hover:scale-110 transition-transform">RESUME</button>
                <button onClick={handleQuickReset} className="px-12 py-5 bg-white/10 rounded-3xl font-black text-xl hover:bg-white/20 transition-all">RESTART</button>
              </div>
            </div>
    
        )}

        {gameState === 'profile' && (
          <Overlay key="profile" onClose={() => setGameState('paused')}>
            <div className="w-full max-w-5xl">
              <div className="flex justify-between items-end mb-12">
                <div>
                  <h2 className="text-6xl font-black italic uppercase mb-2">Profile</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Zarządzaj kontami operatorów</p>
                </div>
                <button 
                  onClick={() => {
                    const name = prompt('Imię nowego operatora:');
                    if (name) {
                      const newP: UserProfile = {
                        id: 'p' + Date.now(),
                        name,
                        stats: { totalScore: 0, totalMoney: 0, gamesPlayed: 0, heartsCollected: 0, maxCombo: 0 },
                        achievements: [],
                        createdAt: Date.now(),
                        level: 1,
                        xp: 0
                      };
                      setProfiles([...profiles, newP]);
                      setActiveProfileId(newP.id);
                    }
                  }}
                  className="p-6 bg-blue-600 text-white rounded-[32px] font-black flex items-center gap-3 hover:scale-105 transition-all"
                >
                  <Plus size={24}/> NOWY OPERATOR
                </button>
              </div>

      
        <div className="grid grid-cols-2 gap-6">
  {profiles.map(p => (
    <div 
      key={p.id}
      onClick={() => {
        // Zmieniamy tylko jeśli to nie jest obecny profil
        if (activeProfileId !== p.id) {
          setActiveProfileId(p.id);
          location.reload();
        }
      }}
      className={`p-8 rounded-[40px] border-4 transition-all cursor-pointer flex items-center justify-between group ${
        activeProfileId === p.id ? 'border-blue-600 bg-blue-600/10' : 'border-transparent ' + theme.card
      }`}
    >
      <div className="flex items-center gap-6">
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-2xl ${activeProfileId === p.id ? 'bg-blue-600 text-white' : 'bg-slate-500/20'}`}>
          {p.name[0]}
        </div>
        <div>
          <p className="text-2xl font-black">{p.name}</p>
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Poziom {p.level}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {activeProfileId === p.id ? (
          <div className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase">Aktywny</div>
        ) : (
          /* Przycisk usuwania - widoczny po najechaniu (hover) na kartę */
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Ważne: zapobiega przełączeniu profilu przy usuwaniu
              if (profiles.length <= 1) {
                alert("Nie można usunąć ostatniego operatora w systemie.");
                return;
              }
              if (confirm(`Czy na pewno chcesz bezpowrotnie usunąć profil ${p.name}?`)) {
                setProfiles(profiles.filter(pr => pr.id !== p.id));
              }
            }}
            className="p-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
    </div>
  ))}
</div>
            </div>
          </Overlay>
        )}

        {gameState === 'achievements' && (
          <Overlay key="achievements" onClose={() => setGameState('paused')}>
            <h2 className="text-4xl font-black mb-12 italic flex items-center gap-3"><Medal/> PILOT MERITS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
              {ACHIEVEMENT_LIST.map(ach => {
                const isUnlocked = activeProfile.achievements.includes(ach.id);
                return (
                  <div key={ach.id} className={`p-8 rounded-[40px] flex items-center gap-6 border transition-all ${isUnlocked ? 'bg-blue-600/10 border-blue-500/30' : 'bg-white/5 border-transparent opacity-40 grayscale'}`}>
                    <div className="w-16 h-16 rounded-3xl bg-black/20 flex items-center justify-center text-3xl">{ach.icon}</div>
                    <div>
                      <h4 className="font-black text-xl">{ach.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{ach.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Overlay>
        )}
        {gameState === 'leaderboard' && (
          <Overlay key="leaderboard" onClose={() => setGameState('paused')}>
            <div className="w-full max-w-4xl max-h-[80vh] flex flex-col">
              <h2 className="text-5xl font-black mb-10 italic uppercase flex items-center gap-6">
                <Trophy size={48} className="text-blue-600"/> Ranking Lokalny
              </h2>
              <div className="flex-1 overflow-y-auto pr-6 space-y-4">
                {ranking.length === 0 ? (
                  <div className="p-20 text-center opacity-30 font-bold uppercase tracking-widest">Brak zapisanych wyników</div>
                ) : (
                  ranking.map((entry, i) => (
                    <div key={i} className={`${theme.card} p-6 rounded-3xl flex items-center justify-between`}>
                      <div className="flex items-center gap-8">
                        <span className="text-3xl font-black text-blue-600/50 w-12 italic">#{i + 1}</span>
                        <div>
                          <p className="font-black text-xl">{entry.playerName}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{entry.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black tracking-tighter text-blue-500">{entry.score}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Punkty</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Overlay>
        )}

        {gameState === 'resuming' && (
            <Overlay key="resuming" >
            <motion.div 
                key={resumeCounter}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                className="text-[200px] font-black italic text-blue-500"
            >
                {resumeCounter}
            </motion.div>
            </Overlay>
        )}
        
        {gameState === 'gameover' && (
          <Overlay key="over">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
              <Zap size={80} className="text-red-500 mx-auto mb-6 animate-bounce" />
              <h2 className="text-7xl font-black italic mb-4">SYSTEM CRASH</h2>
              <div className="grid grid-cols-2 gap-4 mb-12 max-w-md mx-auto">
                <div className="bg-white/5 p-8 rounded-[40px] border border-white/10">
                   <p className="text-xs font-bold text-blue-500 uppercase mb-2">Final Score</p>
                   <p className="text-4xl font-black">{score}</p>
                </div>
                <div className="bg-white/5 p-8 rounded-[40px] border border-white/10">
                   <p className="text-xs font-bold text-orange-500 uppercase mb-2">Max Combo</p>
                   <p className="text-4xl font-black">{combo}x</p>
                </div>
              </div>
              <button onClick={handleQuickReset} className="px-20 py-6 bg-blue-600 text-white rounded-full font-black text-2xl shadow-2xl hover:scale-105 transition-transform">REBOOT ENGINE</button>
              <button onClick={() => setGameState('start')} className="block mx-auto mt-6 text-slate-500 font-bold hover:text-white transition-colors uppercase text-xs tracking-widest">Return to Base</button>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* FOOTER STATS */}
      <div className="absolute bottom-6 left-6 z-[60] opacity-30 flex gap-6 text-[10px] font-black uppercase tracking-widest pointer-events-none">
         <div className="flex items-center gap-2"><Cpu size={12}/> Kernel: Stable</div>
         <div className="flex items-center gap-2"><Activity size={12}/> Latency: 4ms</div>
         <div className="flex items-center gap-2"><Database size={12}/> Node: {activeProfileId}</div>
      </div>
    </div>
  );
}

// --- HELPERS ---

function NavBtn({ onClick, icon, theme }: {onClick: () => void, icon: React.ReactNode, theme: {    bg: string;
    text: string;
    card: string;
    sub: string;
    accent: string;}}) {
  return (
    <button onClick={onClick} className={`p-4 ${theme.card} rounded-2xl hover:scale-110 active:scale-95 transition-all`}>
      {icon}
    </button>
  );
}

function Slider({ label, val, min, max, step, onChange, invert }: { label: string, val: number, min: number, max: number, step: number, onChange: (v: number) => void, invert?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter opacity-50">
        <span>{label}</span>
        <span>{val.toFixed(2)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={val} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 bg-blue-600/20 rounded-full appearance-none accent-blue-600 cursor-pointer ${invert ? 'rotate-180' : ''}`}
      />
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode, onClose?: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`absolute inset-0 z-100 bg-white/60 dark:bg-black backdrop-blur-2xl flex items-center justify-center p-8`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {onClose && (
  <motion.button
    onClick={onClose}
    whileHover={{ scale: 1.1, rotate: 90 }}
    whileTap={{ scale: 0.9 }}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="absolute top-8 right-8 z-[160] group hover:cursor-pointer"
  >
    {/* Efekt poświaty w tle */}
    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
    
    <div className="relative p-5 bg-white/5 dark:bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-black dark:text-white shadow-xl flex items-center justify-center overflow-hidden">
      {/* Ruchomy pasek (shine effect) */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
        animate={{ x: ['100%', '-100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      
      <X size={28} strokeWidth={3} className="group-hover:text-red-500 transition-colors" />
    </div>
    
    {/* Napis "ESC" pod przyciskiem - fajny detal gamingowy */}
    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest text-slate-500">
      Close
    </span>
  </motion.button>
)}
        {children}
      </div>
    </motion.div>
  );
}