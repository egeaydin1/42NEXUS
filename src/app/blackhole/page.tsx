"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Skull, Clock } from "lucide-react";

interface BlackholeUser {
    id: number;
    login: string;
    image: string;
    blackholeDate: string;
    daysRemaining: number;
}

export default function BlackholePage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<BlackholeUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ((session as any)?.accessToken) {
            fetch("/api/blackhole")
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch blackhole data");
                    return res.json();
                })
                .then(data => {
                    if (Array.isArray(data)) {
                        setUsers(data);
                    } else {
                        console.error("Invalid data format:", data);
                        setUsers([]);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Blackhole fetch error:", err);
                    setLoading(false);
                });
        }
    }, [session]);

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Event Horizon...</div>;

    // Filter users for visualization
    const dyingUsers = users.filter(u => u.daysRemaining <= 0);
    const criticalUsers = users.filter(u => u.daysRemaining > 0 && u.daysRemaining <= 15);
    const warningUsers = users.filter(u => u.daysRemaining > 15 && u.daysRemaining <= 45);
    const safeUsers = users.filter(u => u.daysRemaining > 45);

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden flex">

            {/* Sidebar - Doomsday List */}
            <div className="w-80 bg-slate-900/80 border-r border-slate-800 p-6 flex flex-col z-20 backdrop-blur-md h-screen overflow-hidden">
                <h1 className="text-2xl font-bold text-red-500 mb-2 flex items-center gap-2">
                    <Skull className="w-6 h-6" /> Doomsday List
                </h1>
                <p className="text-xs text-slate-400 mb-6">Students closest to the singularity.</p>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {users
                        .filter(u => u.daysRemaining >= 0) // Only show active students in the list
                        .slice(0, 50)
                        .map((user, idx) => (
                            <a
                                key={user.id}
                                href={`https://profile.intra.42.fr/users/${user.login}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-slate-800 cursor-pointer ${user.daysRemaining <= 10 ? 'bg-red-900/20 border-red-900/50' : 'bg-slate-800/50 border-slate-700/50'}`}
                            >
                                <div className="font-mono text-slate-500 w-6">#{idx + 1}</div>
                                <img src={user.image} alt={user.login} className="w-8 h-8 rounded-full object-cover" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate">{user.login}</div>
                                    <div className={`text-xs ${user.daysRemaining <= 10 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                                        {user.daysRemaining} days left
                                    </div>
                                </div>
                            </a>
                        ))}
                </div>
            </div>

            {/* Main Visualization Area */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">

                {/* Background Stars & Shooting Stars */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Shooting Star 1 */}
                    <div className="absolute top-0 left-1/4 w-[2px] h-[100px] bg-gradient-to-b from-transparent via-white to-transparent opacity-0 animate-[shooting-star_4s_infinite_2s] rotate-45"></div>
                    {/* Shooting Star 2 */}
                    <div className="absolute top-1/3 right-0 w-[2px] h-[150px] bg-gradient-to-b from-transparent via-blue-200 to-transparent opacity-0 animate-[shooting-star_7s_infinite] -rotate-45"></div>
                    {/* Shooting Star 3 */}
                    <div className="absolute bottom-0 left-1/3 w-[2px] h-[120px] bg-gradient-to-b from-transparent via-purple-200 to-transparent opacity-0 animate-[shooting-star_5s_infinite_1s] rotate-12"></div>
                </div>

                {/* The Blackhole (Singularity) */}
                <div className="relative w-48 h-48 bg-black rounded-full shadow-[0_0_150px_rgba(147,51,234,0.6)] z-10 flex items-center justify-center group">
                    {/* Accretion Disk */}
                    <div className="absolute inset-0 rounded-full border-4 border-purple-600/50 blur-md animate-[spin_3s_linear_infinite]"></div>
                    <div className="absolute -inset-2 rounded-full border-2 border-purple-400/30 blur-lg animate-[spin_5s_linear_infinite_reverse]"></div>
                    <div className="absolute -inset-8 rounded-full border border-purple-900/20 blur-xl animate-pulse"></div>

                    {/* Event Horizon */}
                    <div className="w-40 h-40 bg-black rounded-full shadow-inner shadow-purple-900 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 to-transparent animate-spin-slow"></div>
                        <span className="text-xs text-purple-300/30 font-mono tracking-widest z-20">EVENT HORIZON</span>
                    </div>
                </div>

                {/* Orbit: Critical (Red) - Slower & Larger */}
                <div className="absolute w-[500px] h-[500px] rounded-full border border-red-900/20 animate-[spin_60s_linear_infinite]">
                    {criticalUsers.map((user, i) => {
                        const angle = (i / criticalUsers.length) * 360;
                        return (
                            <a
                                key={user.id}
                                href={`https://profile.intra.42.fr/users/${user.login}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full overflow-hidden border-2 border-red-500 shadow-[0_0_15px_red] transition-transform hover:scale-150 hover:z-50 z-20 group cursor-pointer"
                                style={{
                                    top: '50%',
                                    left: '50%',
                                    transform: `rotate(${angle}deg) translate(250px) rotate(-${angle}deg)`
                                }}
                            >
                                <img src={user.image} className="w-full h-full object-cover" />
                                {/* Tooltip on hover */}
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-900/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                    {user.login} ({user.daysRemaining}d)
                                </div>
                            </a>
                        );
                    })}
                </div>

                {/* Orbit: Warning (Orange) - Slower & Larger */}
                <div className="absolute w-[800px] h-[800px] rounded-full border border-orange-900/10 animate-[spin_120s_linear_infinite]">
                    {warningUsers.map((user, i) => {
                        const angle = (i / warningUsers.length) * 360;
                        return (
                            <a
                                key={user.id}
                                href={`https://profile.intra.42.fr/users/${user.login}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full overflow-hidden border border-orange-500/80 opacity-90 transition-transform hover:scale-150 hover:z-50 group cursor-pointer"
                                style={{
                                    top: '50%',
                                    left: '50%',
                                    transform: `rotate(${angle}deg) translate(400px) rotate(-${angle}deg)`
                                }}
                            >
                                <img src={user.image} className="w-full h-full object-cover" />
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-orange-900/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                    {user.login} ({user.daysRemaining}d)
                                </div>
                            </a>
                        );
                    })}
                </div>

                {/* Orbit: Safe (Blue) - Very Slow */}
                <div className="absolute w-[1200px] h-[1200px] rounded-full border border-blue-900/5 animate-[spin_240s_linear_infinite]">
                    {safeUsers.slice(0, 40).map((user, i) => {
                        const angle = (i / 40) * 360;
                        return (
                            <a
                                key={user.id}
                                href={`https://profile.intra.42.fr/users/${user.login}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full overflow-hidden border border-blue-500/50 opacity-60 transition-transform hover:scale-150 hover:z-50 hover:opacity-100 group cursor-pointer"
                                style={{
                                    top: '50%',
                                    left: '50%',
                                    transform: `rotate(${angle}deg) translate(600px) rotate(-${angle}deg)`
                                }}
                            >
                                <img src={user.image} className="w-full h-full object-cover" />
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-900/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                    {user.login} ({user.daysRemaining}d)
                                </div>
                            </a>
                        );
                    })}
                </div>

                {/* Falling Animation (Dying Users) */}
                {dyingUsers.map((user) => (
                    <div
                        key={user.id}
                        className="absolute w-10 h-10 rounded-full border-2 border-red-600 z-0 animate-[ping_3s_ease-in-out_infinite]"
                        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                    >
                        <img src={user.image} className="w-full h-full object-cover rounded-full opacity-30" />
                    </div>
                ))}

            </div>
        </div>
    );
}

