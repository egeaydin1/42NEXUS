
import React, { useEffect, useState, useRef } from 'react';

interface IntroSequenceProps {
    onComplete: () => void;
    totalCheaters: number;
    totalMarks: number;
}

const IntroSequence: React.FC<IntroSequenceProps> = ({ onComplete, totalCheaters, totalMarks }) => {
    const [step, setStep] = useState(0);
    const [text, setText] = useState("");
    const [glitchText, setGlitchText] = useState("");
    const [showRadar, setShowRadar] = useState(false);
    const [showAlarm, setShowAlarm] = useState(false);
    const [showStats, setShowStats] = useState(false);

    const [progress, setProgress] = useState(0);
    const [countCheaters, setCountCheaters] = useState(0);
    const [countMarks, setCountMarks] = useState(0);

    // Rain effect state
    const [rainDrops, setRainDrops] = useState<{ left: string; delay: string; chars: string[] }[]>([]);

    useEffect(() => {
        // Generate rain drops only on client side
        const drops = Array.from({ length: 20 }).map((_, i) => ({
            left: `${i * 5}%`,
            delay: `${Math.random() * 2}s`,
            chars: Array.from({ length: 30 }).map(() => (Math.random() > 0.5 ? '1' : '0'))
        }));
        setRainDrops(drops);
    }, []);

    useEffect(() => {
        const sequence = async () => {
            // Step 0: CRT ON
            await new Promise(r => setTimeout(r, 1000));
            setStep(1);

            // Step 1: Boot Text & Progress
            const bootText = "INITIALIZING... BOOT SEQUENCE STARTED...";
            for (let i = 0; i <= bootText.length; i++) {
                setText(bootText.slice(0, i));
                setProgress(Math.min(100, Math.floor((i / bootText.length) * 100)));
                await new Promise(r => setTimeout(r, 30));
            }
            // Quick fill to 100%
            for (let p = 100; p <= 100; p += 5) { setProgress(p); await new Promise(r => setTimeout(r, 10)); }
            await new Promise(r => setTimeout(r, 500));

            // Step 2: Radar Scan
            setStep(2);
            setShowRadar(true);
            setGlitchText("SCANNING CAMPUS ISTANBUL & KOCAELI...");
            await new Promise(r => setTimeout(r, 3000));

            // Step 3: Alarm
            setStep(3);
            setShowRadar(false);
            setShowAlarm(true);
            await new Promise(r => setTimeout(r, 2000));

            // Step 4: Stats with Counting
            setStep(4);
            setShowStats(true);

            // Animate counters
            const duration = 2000;
            const steps = 60;
            const intervalTime = duration / steps;

            let currentStep = 0;
            const counterInterval = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out

                setCountCheaters(Math.floor(totalCheaters * easeOut));
                setCountMarks(Math.floor(totalMarks * easeOut));

                if (currentStep >= steps) {
                    clearInterval(counterInterval);
                    setCountCheaters(totalCheaters);
                    setCountMarks(totalMarks);
                }
            }, intervalTime);

            await new Promise(r => setTimeout(r, 3500));

            // Step 5: Fade Out
            setStep(5);
            await new Promise(r => setTimeout(r, 1000));
            onComplete();
        };

        sequence();
    }, [onComplete, totalCheaters, totalMarks]);

    if (step === 5) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col items-center justify-center font-mono text-green-500">
            {/* CRT Overlay Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-20"></div>
            <div className="absolute inset-0 pointer-events-none animate-scanline bg-gradient-to-b from-transparent via-green-900/10 to-transparent h-full w-full z-20 opacity-20"></div>

            {/* Content Container */}
            <div className={`relative z-10 w-full max-w-4xl p-8 transition-opacity duration-1000 ${step === 0 ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>

                {/* Step 1: Boot Text & Progress */}
                {step === 1 && (
                    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
                        <div className="text-2xl md:text-4xl font-bold glitch-text mb-8 text-center">
                            {text}<span className="animate-pulse">_</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-4 border-2 border-green-800 p-1 relative">
                            <div
                                className="h-full bg-green-500 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between w-full text-xs mt-2 text-green-700 font-bold">
                            <span>LOADING MODULES...</span>
                            <span>{progress}%</span>
                        </div>
                    </div>
                )}

                {/* Step 2: Radar */}
                {showRadar && (
                    <div className="flex flex-col items-center">
                        <div className="w-64 h-64 border-4 border-green-900 rounded-full relative overflow-hidden bg-black/50 mb-8 shadow-[0_0_30px_rgba(20,83,45,0.5)]">
                            {/* Radar Grid */}
                            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                            <div className="absolute inset-0 border-r-2 border-green-500/50 w-1/2 h-full origin-right animate-[spin_2s_linear_infinite] bg-gradient-to-l from-green-500/20 to-transparent"></div>

                            {/* Blips */}
                            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-red-500 rounded-full animate-ping shadow-[0_0_10px_#ff0000]"></div>
                            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-red-500 rounded-full animate-ping delay-75 shadow-[0_0_10px_#ff0000]"></div>
                            <div className="absolute bottom-1/3 right-1/3 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping delay-150 shadow-[0_0_10px_#ff0000]"></div>
                            <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-red-500 rounded-full animate-ping delay-300 shadow-[0_0_10px_#ff0000]"></div>
                        </div>
                        <div className="text-xl text-green-400 animate-pulse font-bold tracking-widest">{glitchText}</div>
                        <div className="mt-2 text-xs text-green-800 font-mono">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                                    SEARCHING SECTOR {Math.floor(Math.random() * 99)}...
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Alarm */}
                {showAlarm && (
                    <div className="flex flex-col items-center animate-pulse relative">
                        <div className="absolute inset-0 bg-red-900/20 blur-xl animate-pulse"></div>
                        <h1 className="text-4xl md:text-6xl font-black text-red-600 tracking-tighter border-4 border-red-600 p-4 mb-4 uppercase glitch-text-red relative z-10 bg-black/50 backdrop-blur-sm">
                            42 NEXUS
                        </h1>
                        <div className="text-2xl text-red-400 tracking-widest uppercase relative z-10">
                            HALL OF SHAME PROTOCOL <span className="font-bold text-red-500 bg-red-900/20 px-2">ONLINE</span>
                        </div>
                    </div>
                )}

                {/* Step 4: Stats */}
                {showStats && (
                    <div className="grid grid-cols-2 gap-8 w-full mt-8">
                        <div className="border-2 border-green-800 bg-black/90 p-8 flex flex-col items-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-green-900/10 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-500"></div>
                            <div className="text-sm text-green-500 mb-4 tracking-widest font-bold uppercase z-10">TOTAL CHEATERS DETECTED</div>
                            <div className="text-6xl md:text-7xl font-black text-green-400 tabular-nums z-10 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                                {countCheaters}
                            </div>
                            <div className="w-full h-1 bg-green-900 mt-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-green-500 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                        <div className="border-2 border-red-800 bg-black/90 p-8 flex flex-col items-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-red-900/10 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-500"></div>
                            <div className="text-sm text-red-500 mb-4 tracking-widest font-bold uppercase z-10">TOTAL -42 MARKS ISSUED</div>
                            <div className="text-6xl md:text-7xl font-black text-red-500 tabular-nums z-10 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]">
                                {countMarks}
                            </div>
                            <div className="w-full h-1 bg-red-900 mt-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-red-500 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ASCII Rain Background (Simplified) */}
                <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden text-[10px] leading-none text-green-500 -z-10">
                    {rainDrops.map((drop, i) => (
                        <div key={i} className="absolute top-0 animate-[fall_3s_linear_infinite]" style={{ left: drop.left, animationDelay: drop.delay }}>
                            {drop.chars.map((char, j) => (
                                <div key={j}>{char}</div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default IntroSequence;
