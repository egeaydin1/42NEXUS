"use client";

import { useEffect, useState, useRef } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Cheat {
    projectName: string;
    date: string;
    mark: number;
}

interface Cheater {
    id: number;
    login: string;
    image: string;
    cheatCount: number;
    lastCheatDate: string;
    cheats: Cheat[];
    achievements: string[];
    campus?: string;
}

import IntroSequence from '@/components/IntroSequence';

export default function CheatersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);
    const [cheaters, setCheaters] = useState<Cheater[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState<number | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'RECENT' | 'MOST_CRIMES' | 'ALPHABETICAL'>('MOST_CRIMES');
    const [filterCampus, setFilterCampus] = useState<'ALL' | 'Istanbul' | 'Kocaeli'>('ALL');
    const [filterAchievement, setFilterAchievement] = useState<string>('ALL');
    const [introStatus, setIntroStatus] = useState<'IDLE' | 'PLAYING' | 'COMPLETED'>('IDLE');
    const [isMusicPlaying, setIsMusicPlaying] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        // Handle Audio
        if (!isMusicPlaying) {
            // Fade out to 0 and pause
            if (audioRef.current) {
                const fadeOut = setInterval(() => {
                    if (audioRef.current && audioRef.current.volume > 0.01) {
                        audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.05);
                    } else {
                        if (audioRef.current) {
                            audioRef.current.volume = 0;
                            audioRef.current.pause();
                        }
                        clearInterval(fadeOut);
                    }
                }, 100);
            }
            return;
        }

        if (introStatus === 'PLAYING') {
            if (audioRef.current) {
                audioRef.current.volume = 1.0;
                audioRef.current.play().catch(e => console.log("Audio play failed", e));
            }
        } else if (introStatus === 'COMPLETED') {
            // Lower volume to 60% when intro ends
            if (audioRef.current) {
                const fadeAudio = setInterval(() => {
                    if (audioRef.current && audioRef.current.volume > 0.60) {
                        audioRef.current.volume = Math.max(0.60, audioRef.current.volume - 0.02);
                    } else {
                        clearInterval(fadeAudio);
                    }
                }, 100);
            }
        }
    }, [introStatus, isMusicPlaying]);

    const fetchCheaters = async () => {
        try {
            // setLoading(true); // Don't show loading on poll
            const res = await fetch('/api/cheaters');
            if (res.ok) {
                const data = await res.json();
                setCheaters(data);
            }
        } catch (error) {
            console.error("Failed to fetch cheaters", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCheaters();
        // Poll every 30 seconds
        const interval = setInterval(fetchCheaters, 30000);
        return () => clearInterval(interval);
    }, []);

    const toggleExpand = (id: number) => {
        setExpandedUser(expandedUser === id ? null : id);
    };

    // Calculate totals for Intro
    const totalCheaters = cheaters.length;
    const totalMarks = cheaters.reduce((acc, c) => acc + c.cheatCount, 0);

    const sortedCheaters = [...cheaters]
        .filter(c => filterCampus === 'ALL' || c.campus === filterCampus)
        .filter(c => filterAchievement === 'ALL' || (c.achievements && c.achievements.includes(filterAchievement)))
        .sort((a, b) => {
            if (filter === 'MOST_CRIMES') {
                if (b.cheatCount !== a.cheatCount) return b.cheatCount - a.cheatCount;
                return new Date(b.lastCheatDate).getTime() - new Date(a.lastCheatDate).getTime();
            } else if (filter === 'RECENT') {
                return new Date(b.lastCheatDate).getTime() - new Date(a.lastCheatDate).getTime();
            } else if (filter === 'ALPHABETICAL') {
                return a.login.localeCompare(b.login);
            }
            return 0;
        });

    if (status === "loading") {
        return <div className="min-h-screen bg-black text-green-500 flex items-center justify-center font-mono text-xl animate-pulse">INITIALIZING SECURITY PROTOCOLS...</div>;
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-red-600 font-mono p-8 selection:bg-red-900 selection:text-white relative overflow-x-hidden">
            {/* Audio */}
            <audio ref={audioRef} src="/intro_theme_dark.mp3" loop />

            {/* Start Button Overlay */}
            {introStatus === 'IDLE' && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
                    <div className="absolute inset-0 pointer-events-none bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-10 mix-blend-overlay"></div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase glitch-text mb-12 text-center" style={{ textShadow: '0 0 10px #ff0000, 0 0 20px #ff0000' }}>
                        HALL OF SHAME
                    </h1>
                    <button
                        onClick={() => setIntroStatus('PLAYING')}
                        className="group relative px-12 py-6 bg-transparent border-4 border-red-600 text-red-600 font-black text-2xl tracking-[0.2em] uppercase hover:bg-red-600 hover:text-black transition-all duration-300 overflow-hidden"
                    >
                        <span className="relative z-10 group-hover:animate-pulse">START DETECTION</span>
                        <div className="absolute inset-0 bg-red-600 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out -z-0"></div>
                    </button>
                    <div className="mt-8 text-red-800 text-sm animate-pulse tracking-widest">
                        SYSTEM READY • WAITING FOR INPUT
                    </div>
                </div>
            )}

            {/* Intro Sequence Overlay */}
            {introStatus === 'PLAYING' && (
                <IntroSequence
                    onComplete={() => setIntroStatus('COMPLETED')}
                    totalCheaters={totalCheaters}
                    totalMarks={totalMarks}
                />
            )}

            {/* Stop Music Button */}
            {introStatus !== 'IDLE' && isMusicPlaying && (
                <button
                    onClick={() => setIsMusicPlaying(false)}
                    className="fixed bottom-8 right-8 z-[70] bg-black/80 border border-red-900 text-red-500 px-4 py-2 text-xs font-bold uppercase hover:bg-red-900 hover:text-white transition-colors flex items-center gap-2"
                >
                    <span>🔊 STOP MUSIC</span>
                </button>
            )}

            <div className={`max-w-6xl mx-auto transition-all duration-1000 ease-out transform ${introStatus !== 'COMPLETED' ? 'opacity-0 translate-y-20' : 'opacity-100 translate-y-0'}`}>
                <header className="mb-12 text-center relative">
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase glitch-text mb-4" style={{ textShadow: '0 0 10px #ff0000, 0 0 20px #ff0000' }}>
                        HALL OF SHAME
                    </h1>
                    <p className="text-xl text-red-500 animate-pulse tracking-[0.5em] uppercase">
                        42 Türkiye • Cheater Detection System
                    </p>
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-10 mix-blend-overlay"></div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="border-4 border-red-900 bg-black p-6 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                            <h2 className="text-2xl font-bold mb-4 border-b-2 border-red-800 pb-2">STATUS</h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-red-400">TOTAL CHEATERS</div>
                                    <div className="text-4xl font-black">{cheaters.length}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-red-400">TOTAL -42 MARKS</div>
                                    <div className="text-4xl font-black">
                                        {cheaters.reduce((acc, c) => acc + c.cheatCount, 0)}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-red-900">
                                    <div className="text-xs text-red-500 animate-pulse">
                                        SYSTEM ACTIVE<br />SCANNING CAMPUS ISTANBUL & KOCAELI...
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-2 border-red-900/50 bg-black/50 p-4">
                            <h3 className="text-lg font-bold mb-2 text-red-400">LATEST INCIDENTS</h3>
                            <div className="space-y-2 text-xs">
                                {cheaters.slice(0, 5).map(c => (
                                    <div key={c.id} className="flex justify-between border-b border-red-900/30 pb-1">
                                        <span>{c.login}</span>
                                        <span className="text-red-500">{new Date(c.lastCheatDate).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main List */}
                    <div className="lg:col-span-3">
                        {/* Filters & Sorting */}
                        <div className="mb-6 flex flex-col gap-4 bg-black/60 p-4 border border-red-900/50">
                            <div className="flex flex-wrap gap-4 items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-red-500 font-bold text-sm tracking-widest">CAMPUS:</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setFilterCampus('ALL')} className={`px-3 py-1 text-xs font-bold border ${filterCampus === 'ALL' ? 'bg-red-900 text-white border-red-500' : 'bg-black text-red-700 border-red-900 hover:border-red-500'} transition-all uppercase`}>ALL</button>
                                        <button onClick={() => setFilterCampus('Istanbul')} className={`px-3 py-1 text-xs font-bold border ${filterCampus === 'Istanbul' ? 'bg-red-900 text-white border-red-500' : 'bg-black text-red-700 border-red-900 hover:border-red-500'} transition-all uppercase`}>ISTANBUL</button>
                                        <button onClick={() => setFilterCampus('Kocaeli')} className={`px-3 py-1 text-xs font-bold border ${filterCampus === 'Kocaeli' ? 'bg-red-900 text-white border-red-500' : 'bg-black text-red-700 border-red-900 hover:border-red-500'} transition-all uppercase`}>KOCAELI</button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-red-500 font-bold text-sm tracking-widest">SORT:</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setFilter('MOST_CRIMES')} className={`px-3 py-1 text-xs font-bold border ${filter === 'MOST_CRIMES' ? 'bg-red-900 text-white border-red-500' : 'bg-black text-red-700 border-red-900 hover:border-red-500'} transition-all uppercase`}>COUNT</button>
                                        <button onClick={() => setFilter('RECENT')} className={`px-3 py-1 text-xs font-bold border ${filter === 'RECENT' ? 'bg-red-900 text-white border-red-500' : 'bg-black text-red-700 border-red-900 hover:border-red-500'} transition-all uppercase`}>RECENT</button>
                                        <button onClick={() => setFilter('ALPHABETICAL')} className={`px-3 py-1 text-xs font-bold border ${filter === 'ALPHABETICAL' ? 'bg-red-900 text-white border-red-500' : 'bg-black text-red-700 border-red-900 hover:border-red-500'} transition-all uppercase`}>A-Z</button>
                                    </div>
                                </div>
                            </div>

                            {/* Achievement Filter */}
                            <div className="flex items-center gap-4 border-t border-red-900/30 pt-4">
                                <div className="text-red-500 font-bold text-sm tracking-widest">ACHIEVEMENT:</div>
                                <select
                                    value={filterAchievement}
                                    onChange={(e) => setFilterAchievement(e.target.value)}
                                    className="bg-black text-red-500 border border-red-900 text-xs font-bold px-2 py-1 uppercase focus:outline-none focus:border-red-500"
                                >
                                    <option value="ALL">ALL ACHIEVEMENTS</option>
                                    <option value="FIRST_BLOOD">🩸 FIRST BLOOD</option>
                                    <option value="FRESH_MEAT">🥩 FRESH MEAT</option>
                                    <option value="SERIAL_OFFENDER">🔪 SERIAL OFFENDER</option>
                                    <option value="CRIME_LORD">💀 CRIME LORD</option>
                                    <option value="EXAM_FAIL">📝 EXAM FAIL</option>
                                    <option value="NIGHT_WATCH">🌙 NIGHT OWL</option>
                                    <option value="WEEKEND_WARRIOR">📅 WEEKEND WARRIOR</option>
                                    <option value="SPEEDRUN">🏎️ SPEEDRUN</option>
                                    <option value="COMBO_BREAKER">🥊 COMBO BREAKER</option>
                                    <option value="REPEAT_OFFENDER">🔄 REPEAT OFFENDER</option>
                                    <option value="TEAM_BETRAYAL">🤝 TEAM BETRAYAL</option>
                                    <option value="BAD_EXAMPLE">🤵 BAD EXAMPLE</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-20">
                                <div className="text-4xl font-black animate-pulse text-red-600">LOADING DATA...</div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sortedCheaters.map((cheater, index) => {
                                    // Dynamic size for top 5 (only if sorted by count)
                                    let imgSizeClass = "w-24 h-24";
                                    let borderClass = "border-red-900";
                                    let containerClass = "border-red-900/30 bg-black/80";
                                    let rankColor = "text-red-700";

                                    if (filter === 'MOST_CRIMES' && filterCampus === 'ALL' && filterAchievement === 'ALL') {
                                        if (index === 0) {
                                            imgSizeClass = "w-64 h-64";
                                            borderClass = "border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.9)]";
                                            containerClass = "border-red-600 bg-red-950/20 shadow-[0_0_60px_rgba(220,38,38,0.3)] scale-105 z-10";
                                            rankColor = "text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,1)]";
                                        }
                                        else if (index === 1) { imgSizeClass = "w-48 h-48"; borderClass = "border-red-700 shadow-[0_0_40px_rgba(220,38,38,0.7)]"; }
                                        else if (index === 2) { imgSizeClass = "w-40 h-40"; borderClass = "border-red-800 shadow-[0_0_30px_rgba(220,38,38,0.5)]"; }
                                        else if (index === 3) { imgSizeClass = "w-32 h-32"; borderClass = "border-red-900"; }
                                        else if (index === 4) { imgSizeClass = "w-28 h-28"; borderClass = "border-red-900"; }
                                    }

                                    const isExpanded = expandedUser === cheater.id;

                                    return (
                                        <div
                                            key={cheater.id}
                                            className={`relative border ${containerClass} p-6 transition-all duration-300 hover:border-red-500 group overflow-hidden`}
                                        >
                                            {/* Background Glitch Effect on Hover */}
                                            <div className="absolute inset-0 bg-red-900/0 group-hover:bg-red-900/5 transition-colors pointer-events-none"></div>

                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-6">
                                                    <div className={`font-black text-center ${index < 3 && filter === 'MOST_CRIMES' && filterCampus === 'ALL' && filterAchievement === 'ALL' ? 'text-6xl' : 'text-3xl w-12'} ${rankColor} italic`}>
                                                        #{index + 1}
                                                    </div>

                                                    <a href={`https://profile.intra.42.fr/users/${cheater.login}`} target="_blank" className="relative block hover:scale-110 transition-transform duration-300">
                                                        <img
                                                            src={cheater.image}
                                                            alt={cheater.login}
                                                            className={`${imgSizeClass} rounded-none border-2 ${borderClass} grayscale group-hover:grayscale-0 transition-all object-cover`}
                                                            style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%)' }}
                                                        />
                                                        {index === 0 && filter === 'MOST_CRIMES' && filterCampus === 'ALL' && filterAchievement === 'ALL' && <div className="absolute -top-6 -right-6 text-6xl animate-bounce drop-shadow-[0_0_10px_rgba(255,0,0,1)]">👑</div>}
                                                    </a>

                                                    <div>
                                                        <a href={`https://profile.intra.42.fr/users/${cheater.login}`} target="_blank" className="hover:underline decoration-red-500 underline-offset-4 flex items-center gap-3">
                                                            <div className={`font-black uppercase tracking-wider text-white group-hover:text-red-500 transition-colors ${index === 0 && filter === 'MOST_CRIMES' && filterCampus === 'ALL' && filterAchievement === 'ALL' ? 'text-4xl' : 'text-2xl'}`}>
                                                                {cheater.login}
                                                            </div>
                                                            {cheater.campus && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-900/50 text-red-200 border border-red-700 rounded uppercase tracking-wider">
                                                                    {cheater.campus}
                                                                </span>
                                                            )}
                                                        </a>

                                                        {/* Achievements Badges */}
                                                        <div className="flex gap-2 mt-2 flex-wrap">
                                                            {cheater.achievements && cheater.achievements.map(ach => {
                                                                let label = ach;
                                                                let desc = "";
                                                                switch (ach) {
                                                                    case 'FIRST_BLOOD': label = '🩸 FIRST BLOOD'; desc = "First person ever to get a -42"; break;
                                                                    case 'FRESH_MEAT': label = '🥩 FRESH MEAT'; desc = "Most recent cheater"; break;
                                                                    case 'SERIAL_OFFENDER': label = '🔪 SERIAL'; desc = "3 or more cheats"; break;
                                                                    case 'CRIME_LORD': label = '💀 CRIME LORD'; desc = "5 or more cheats"; break;
                                                                    case 'EXAM_FAIL': label = '📝 EXAM FAIL'; desc = "Cheated on an Exam project"; break;
                                                                    case 'NIGHT_WATCH': label = '🌙 NIGHT OWL'; desc = "Cheated between 00:00 - 06:00"; break;
                                                                    case 'WEEKEND_WARRIOR': label = '📅 WEEKEND WARRIOR'; desc = "Cheated on a weekend"; break;
                                                                    case 'SPEEDRUN': label = '🏎️ SPEEDRUN'; desc = "Cheated in Piscine or Rush"; break;
                                                                    case 'COMBO_BREAKER': label = '🥊 COMBO'; desc = "2 cheats within 24 hours"; break;
                                                                    case 'REPEAT_OFFENDER': label = '🔄 REPEAT'; desc = "Cheated on the same project twice"; break;
                                                                    case 'TEAM_BETRAYAL': label = '🤝 BETRAYAL'; desc = "Cheated on a group project"; break;
                                                                    case 'BAD_EXAMPLE': label = '🤵 BAD EXAMPLE'; desc = "Patron who cheated"; break;
                                                                }

                                                                return (
                                                                    <div key={ach} className="group/tooltip relative">
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-black text-red-400 border border-red-800 uppercase tracking-wider flex items-center gap-1 hover:bg-red-900/30 transition-colors cursor-help">
                                                                            {label}
                                                                        </span>
                                                                        {/* Custom Tooltip */}
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/90 border border-red-500 p-2 text-center z-50 hidden group-hover/tooltip:block pointer-events-none shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                                                                            <div className="text-red-500 font-bold text-xs mb-1 border-b border-red-900 pb-1">{label}</div>
                                                                            <div className="text-red-200 text-[10px] leading-tight">{desc}</div>
                                                                            {/* Arrow */}
                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="text-sm text-red-600 font-bold mt-2">
                                                            LAST INCIDENT: <span className="text-red-400">{new Date(cheater.lastCheatDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleExpand(cheater.id)}
                                                            className="mt-2 text-xs bg-red-900/30 hover:bg-red-900/60 text-red-300 px-2 py-1 border border-red-800 transition-colors uppercase tracking-widest"
                                                        >
                                                            {isExpanded ? 'Hide Crimes [-]' : 'View Crimes [+]'}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className={`font-black text-red-600 ${index === 0 && filter === 'MOST_CRIMES' && filterCampus === 'ALL' && filterAchievement === 'ALL' ? 'text-7xl' : 'text-5xl'} drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]`}>
                                                        {cheater.cheatCount}
                                                    </div>
                                                    <div className="text-xs uppercase tracking-[0.2em] text-red-800 font-bold">
                                                        FATAL ERRORS
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Details: List of Cheats */}
                                            {isExpanded && (
                                                <div className="mt-6 pt-4 border-t border-red-900/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <h4 className="text-sm font-bold text-red-500 mb-3 uppercase tracking-widest">CRIMINAL RECORD:</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {cheater.cheats && cheater.cheats.length > 0 ? (
                                                            cheater.cheats.map((cheat, i) => (
                                                                <div key={i} className="flex justify-between items-center bg-black/40 p-2 border-l-2 border-red-800 hover:bg-red-900/20 transition-colors">
                                                                    <span className="font-bold text-red-300">{cheat.projectName}</span>
                                                                    <div className="text-right">
                                                                        <span className="block text-xs text-red-600">{new Date(cheat.date).toLocaleDateString()}</span>
                                                                        <span className="block text-xs font-black text-red-500">-42</span>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-red-800 italic text-xs">No detailed records available.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes glitch {
                    0% { transform: translate(0) }
                    20% { transform: translate(-2px, 2px) }
                    40% { transform: translate(-2px, -2px) }
                    60% { transform: translate(2px, 2px) }
                    80% { transform: translate(2px, -2px) }
                    100% { transform: translate(0) }
                }
                .glitch-text {
                    animation: glitch 0.2s cubic-bezier(.25, .46, .45, .94) both infinite;
                }
            `}</style>
        </div>
    );
}
