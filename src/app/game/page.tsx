"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Shield, Sword, Map as MapIcon, User, Zap, Trophy, Crown, Flame } from "lucide-react";

// Factions
const FACTIONS = [
    { id: 0, name: "The Alliance", color: "bg-green-500", text: "text-green-500", border: "border-green-500", icon: Shield },
    { id: 1, name: "The Order", color: "bg-red-500", text: "text-red-500", border: "border-red-500", icon: Sword },
    { id: 2, name: "The Assembly", color: "bg-purple-500", text: "text-purple-500", border: "border-purple-500", icon: Crown },
    { id: 3, name: "The Federation", color: "bg-blue-500", text: "text-blue-500", border: "border-blue-500", icon: Zap },
];

export default function GamePage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'war-room' | 'my-hero'>('war-room');
    const [gameState, setGameState] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [myProfile, setMyProfile] = useState<any>(null);

    useEffect(() => {
        if ((session as any)?.accessToken) {
            initGame();
        }
    }, [session]);

    const initGame = async () => {
        try {
            // 1. Register User in Game DB
            await fetch("/api/game/register", { method: "POST" });

            // 2. Fetch User Profile (Intra API)
            const meRes = await fetch("https://api.intra.42.fr/v2/me", {
                headers: { Authorization: `Bearer ${(session as any).accessToken}` }
            });
            const meData = await meRes.json();
            setMyProfile(meData);

            // 3. Fetch Game State
            await fetchGameState();
        } catch (error) {
            console.error("Error initializing game:", error);
            setLoading(false);
        }
    };

    const fetchGameState = async () => {
        try {
            const res = await fetch("/api/game/state");
            const data = await res.json();
            setGameState(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching game state:", error);
        }
    };

    const handleAction = async (action: 'attack' | 'defend', territoryId: string) => {
        if (actionLoading) return;
        setActionLoading(true);

        try {
            const res = await fetch("/api/game/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, territoryId })
            });

            const result = await res.json();
            if (!res.ok) {
                alert(result.error);
            } else {
                // Optimistic update or refetch
                fetchGameState();
            }
        } catch (error) {
            console.error("Action failed:", error);
        } finally {
            setActionLoading(false);
        }
    };

    // Helper to get faction by ID
    const getFactionById = (id: number) => FACTIONS[id] || FACTIONS[0];

    // Group territories by Module (Client-side grouping for display)
    // We need to fetch active locations to know WHICH seats exist, 
    // but status comes from Game DB.
    // For simplicity, we will assume a fixed set of seats or fetch active ones and merge.
    // Let's fetch active locations again to build the map structure.
    const [locations, setLocations] = useState<any[]>([]);

    useEffect(() => {
        if ((session as any)?.accessToken) {
            fetch(`https://api.intra.42.fr/v2/campus/49/locations?filter[active]=true&page[size]=100`, {
                headers: { Authorization: `Bearer ${(session as any).accessToken}` }
            }).then(res => res.json()).then(data => setLocations(data));
        }
    }, [session]);

    const clustersMap = locations.reduce((acc: any, loc) => {
        const match = loc.host.match(/k(\d+)m(\d+)s(\d+)/);
        if (match) {
            const [_, k, m, s] = match;
            const clusterName = `Module ${m} (Floor ${k})`;
            if (!acc[clusterName]) {
                acc[clusterName] = { name: clusterName, hosts: [] };
            }

            // Merge with Game DB state
            const territoryId = loc.host;
            const dbTerritory = gameState?.territories[territoryId];

            acc[clusterName].hosts.push({
                ...loc,
                seat: parseInt(s),
                gameData: dbTerritory || { factionId: -1, health: 50 } // Default neutral
            });
        }
        return acc;
    }, {});

    const sortedClusters = Object.values(clustersMap).sort((a: any, b: any) => a.name.localeCompare(b.name));

    if (loading || !gameState) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Nexus Wars...</div>;

    const myGameUser = gameState.user;
    const myFaction = getFactionById(myGameUser?.factionId || 0);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
                            <Trophy className="w-10 h-10 text-orange-500" />
                            Nexus Wars
                        </h1>
                        <p className="text-slate-400 mt-2 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            Energy: <span className="text-yellow-400 font-bold">{myGameUser?.energy || 0}/100</span>
                            <span className="text-xs text-slate-500">(+10 every 5m)</span>
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => setActiveTab('war-room')}
                            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'war-room' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            War Room
                        </button>
                        <button
                            onClick={() => setActiveTab('my-hero')}
                            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'my-hero' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            My Hero
                        </button>
                    </div>
                </header>

                {activeTab === 'war-room' && (
                    <div className="space-y-8">
                        {/* Global Leaderboard */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.values(gameState.factions).map((f: any) => {
                                const faction = getFactionById(f.id);
                                return (
                                    <div key={f.id} className={`bg-slate-900/50 border ${faction.border} border-opacity-30 rounded-xl p-4 flex flex-col items-center justify-center gap-2`}>
                                        <div className="flex items-center gap-2">
                                            <faction.icon className={`w-5 h-5 ${faction.text}`} />
                                            <span className="font-bold text-sm">{faction.name}</span>
                                        </div>
                                        <div className="text-2xl font-mono font-bold">{f.score}</div>
                                        <div className="text-xs text-slate-500">{f.territories} Territories</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Map */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {sortedClusters.map((cluster: any) => (
                                <div key={cluster.name} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                                    <h3 className="text-lg font-bold text-slate-200 mb-4">{cluster.name}</h3>

                                    <div className="flex flex-wrap justify-center bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 shadow-inner">
                                        {cluster.hosts.map((loc: any) => {
                                            const faction = loc.gameData.factionId !== -1 ? getFactionById(loc.gameData.factionId) : null;
                                            const isMyFaction = loc.gameData.factionId === myGameUser?.factionId;
                                            const isNeutral = loc.gameData.factionId === -1;

                                            return (
                                                <div
                                                    key={loc.host}
                                                    className={`
                                                w-10 h-10 rounded-md m-1 flex items-center justify-center text-[10px] relative group cursor-pointer transition-all
                                                ${faction
                                                            ? `${faction.color} text-white shadow-[0_0_10px_rgba(0,0,0,0.5)]`
                                                            : 'bg-slate-800/30 text-slate-700 border border-slate-800'}
                                            `}
                                                >
                                                    {faction ? <User className="w-4 h-4" /> : <span className="opacity-50">{loc.seat}</span>}

                                                    {/* Tooltip / Action Menu */}
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-20 shadow-xl min-w-[150px]">
                                                        <div className="font-bold text-base mb-1">{loc.user.login}</div>
                                                        <div className="text-slate-400 mb-2">{loc.host}</div>

                                                        <div className="flex justify-between items-center mb-2 bg-slate-800 p-1 rounded">
                                                            <span>Health</span>
                                                            <span className={`font-mono font-bold ${loc.gameData.health < 30 ? 'text-red-400' : 'text-green-400'}`}>
                                                                {loc.gameData.health}%
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-2 pointer-events-auto">
                                                            {isMyFaction ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleAction('defend', loc.host); }}
                                                                    className="flex-1 bg-blue-600 hover:bg-blue-500 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                                                                >
                                                                    <Shield className="w-3 h-3" /> Defend
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleAction('attack', loc.host); }}
                                                                    className="flex-1 bg-red-600 hover:bg-red-500 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                                                                >
                                                                    <Flame className="w-3 h-3" /> Attack
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'my-hero' && myProfile && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                            {/* Banner */}
                            <div className={`h-32 bg-gradient-to-r ${myFaction.color.replace('bg-', 'from-')} to-slate-900 relative`}>
                                <div className="absolute inset-0 bg-[url('https://cdn.intra.42.fr/coalition/cover/366/cover.jpg')] bg-cover opacity-20"></div>
                            </div>

                            {/* Avatar & Info */}
                            <div className="px-8 pb-8 relative">
                                <div className="flex justify-between items-end -mt-12 mb-6">
                                    <img
                                        src={myProfile.image?.link}
                                        alt={myProfile.login}
                                        className={`w-32 h-32 rounded-3xl border-4 ${myFaction.border} shadow-xl bg-slate-900`}
                                    />
                                    <div className="text-right">
                                        <h2 className="text-3xl font-bold text-white">{myProfile.displayname}</h2>
                                        <p className={`font-mono font-bold ${myFaction.text}`}>{myFaction.name} Warrior</p>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider">War Score</p>
                                        <p className="text-3xl font-bold text-white">{myGameUser?.score || 0}</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider">Battles Won</p>
                                        <p className="text-3xl font-bold text-green-400">{myGameUser?.battlesWon || 0}</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider">Energy</p>
                                        <p className="text-3xl font-bold text-yellow-400">{myGameUser?.energy || 0}<span className="text-sm text-slate-500">/100</span></p>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider">Faction Rank</p>
                                        <p className="text-xl font-bold text-white">#1</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
