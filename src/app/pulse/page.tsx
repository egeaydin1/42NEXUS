"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Activity, Clock, Map, Users, Zap } from "lucide-react";

// Istanbul Campus ID
const CAMPUS_ID = 49;

interface Location {
    id: number;
    host: string;
    user: any;
    begin_at: string;
}

export default function PulsePage() {
    const { data: session } = useSession();
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeMachineValue, setTimeMachineValue] = useState(100); // 100 = Now, 0 = 24h ago
    const [debouncedTimeValue, setDebouncedTimeValue] = useState(100);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTimeValue(timeMachineValue);
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [timeMachineValue]);

    useEffect(() => {
        if ((session as any)?.accessToken) {
            fetchLocations(debouncedTimeValue);
        }
    }, [session, debouncedTimeValue]);

    const fetchLocations = async (timeValue: number) => {
        setLoading(true);
        try {
            let url = `https://api.intra.42.fr/v2/campus/${CAMPUS_ID}/locations?page[size]=100`;

            if (timeValue === 100) {
                // Live data
                url += '&filter[active]=true';
            } else {
                // Historical data
                const now = new Date();
                const pastHours = 24 - Math.floor(timeValue * 0.24);
                const targetTime = new Date(now.getTime() - pastHours * 60 * 60 * 1000);
                const targetTimeEnd = new Date(targetTime.getTime() + 15 * 60 * 1000); // 15 min window

                url += `&range[begin_at]=${targetTime.toISOString()},${targetTimeEnd.toISOString()}`;
            }

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${(session as any).accessToken}` }
            });

            if (!res.ok) throw new Error("Failed to fetch locations");

            const data = await res.json();
            setLocations(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching locations:", error);
            setLoading(false);
        }
    };

    // Parse and group locations by Module (m)
    // Format: k1m06s03 -> Floor 1, Module 06, Seat 03
    const clustersMap = locations.reduce((acc: any, loc) => {
        const match = loc.host.match(/k(\d+)m(\d+)s(\d+)/);
        if (match) {
            const [_, k, m, s] = match;
            const clusterName = `Module ${m} (Floor ${k})`;
            if (!acc[clusterName]) {
                acc[clusterName] = { name: clusterName, hosts: [] };
            }
            acc[clusterName].hosts.push({ ...loc, seat: parseInt(s) });
        }
        return acc;
    }, {});

    const sortedClusters = Object.values(clustersMap).sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Render a cluster
    const renderCluster = (cluster: any) => {
        // Determine grid size dynamically based on max seat number found
        const maxSeat = Math.max(...cluster.hosts.map((h: any) => h.seat), 20); // Min 20 seats
        const grid = [];

        for (let s = 1; s <= maxSeat; s++) {
            const loc = cluster.hosts.find((h: any) => h.seat === s);
            const isOccupied = !!loc;

            grid.push(
                <div
                    key={s}
                    className={`
            w-8 h-8 rounded-md m-1 flex items-center justify-center text-[10px] cursor-pointer transition-all duration-500 relative group
            ${isOccupied
                            ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)] text-white hover:scale-125 z-10'
                            : 'bg-slate-800/30 text-slate-700 border border-slate-800'}
          `}
                >
                    {isOccupied ? <Users className="w-4 h-4" /> : <span className="opacity-50">{s}</span>}

                    {/* Tooltip */}
                    {isOccupied && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs p-4 rounded-2xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-2xl flex flex-col items-center gap-3 min-w-[120px] transition-all duration-300 transform group-hover:-translate-y-2">
                            <div className="relative overflow-hidden rounded-full w-20 h-20 border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                                <img
                                    src={loc.user.image?.link}
                                    alt={loc.user.login}
                                    className="w-full h-full object-cover transform scale-110"
                                />
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-base text-cyan-400">{loc.user.login}</div>
                                <div className="text-slate-400 font-mono text-[10px]">{loc.host}</div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        return grid;
    };

    if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Pulse Data...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                            <Activity className="w-10 h-10 text-cyan-400" />
                            Campus Pulse
                        </h1>
                        <p className="text-slate-400 mt-2">Real-time occupancy & historical density analysis</p>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-slate-400">Active Students</p>
                            <p className="text-2xl font-bold font-mono text-cyan-400">
                                {timeMachineValue === 100 ? locations.length : Math.floor(locations.length * (timeMachineValue / 100 + 0.2))}
                            </p>
                        </div>
                        <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-pulse" />
                    </div>
                </header>

                {/* Time Machine Slider */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 mb-12 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="w-6 h-6 text-purple-400" />
                            Time Machine
                        </h2>
                        <span className="font-mono text-cyan-400 bg-cyan-950/50 px-3 py-1 rounded-lg border border-cyan-900">
                            {timeMachineValue === 100 ? "LIVE NOW" : `-${24 - Math.floor(timeMachineValue * 0.24)} Hours Ago`}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={timeMachineValue}
                        onChange={(e) => setTimeMachineValue(parseInt(e.target.value))}
                        className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                        <span>24h Ago</span>
                        <span>12h Ago</span>
                        <span>Now</span>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Clusters (2/3 width) */}
                    <div className="lg:col-span-2 space-y-8">
                        {sortedClusters.length > 0 ? (
                            sortedClusters.map((cluster: any) => (
                                <div key={cluster.name} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                            <Map className="w-5 h-5 text-slate-400" />
                                            {cluster.name}
                                        </h3>
                                        <div className="flex gap-2 text-[10px] text-slate-500">
                                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500"></div> Occupied</span>
                                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700"></div> Empty</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap justify-center bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 shadow-inner">
                                        {renderCluster(cluster)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                                <p className="text-xl">No active locations found for this time.</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Recent Logins (1/3 width) */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sticky top-8 h-[800px] overflow-y-auto custom-scrollbar">
                            <h3 className="text-xl font-bold mb-6 text-slate-200 flex items-center gap-2 sticky top-0 bg-slate-900/95 p-2 backdrop-blur-sm z-10 border-b border-slate-800">
                                <Clock className="w-5 h-5 text-green-400" />
                                Recent Logins
                            </h3>
                            <div className="space-y-3">
                                {[...locations]
                                    .sort((a, b) => new Date(b.begin_at).getTime() - new Date(a.begin_at).getTime())
                                    .map((loc) => (
                                        <div key={loc.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 transition-colors border border-slate-800/50 group cursor-default">
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-700 group-hover:border-cyan-500 transition-colors">
                                                <img
                                                    src={loc.user.image?.link}
                                                    alt={loc.user.login}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-125"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm text-slate-200 truncate">{loc.user.displayname}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                                    <span className="font-mono text-cyan-500">{loc.host}</span>
                                                    <span>•</span>
                                                    <span>{new Date(loc.begin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
