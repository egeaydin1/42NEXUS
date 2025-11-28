"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wallet } from "lucide-react";
import StockChart from "@/components/StockChart";

// Istanbul Campus ID is 49
const CAMPUS_ID = 49;

interface Stock {
    id: number;
    symbol: string;
    price: number;
    change: number;
    history: any[];
    user: any;
    detailsLoaded?: boolean;
}

export default function MarketPage() {
    const { data: session } = useSession();
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [wallet, setWallet] = useState(0);
    const [portfolio, setPortfolio] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

    useEffect(() => {
        if ((session as any)?.accessToken) {
            fetchData();
        }
    }, [session]);

    const fetchData = async () => {
        try {
            // 1. Fetch current user for wallet
            const meRes = await fetch("https://api.intra.42.fr/v2/me", {
                headers: { Authorization: `Bearer ${(session as any).accessToken}` }
            });
            const me = await meRes.json();
            setWallet((me.correction_point || 0) * 10);

            // 2. Fetch Istanbul users
            const usersRes = await fetch(`https://api.intra.42.fr/v2/campus/${CAMPUS_ID}/users?page[size]=30`, {
                headers: { Authorization: `Bearer ${(session as any).accessToken}` }
            });

            if (!usersRes.ok) {
                throw new Error(`API Error: ${usersRes.status} ${usersRes.statusText}`);
            }

            const users = await usersRes.json();
            console.log("API Response:", users); // Debug log

            if (!Array.isArray(users)) {
                console.error("Expected array but got:", users);
                setStocks([]);
                setLoading(false);
                return;
            }

            // 3. Generate Stock Data
            const generatedStocks = users.map((u: any) => {
                // Handle missing cursus_users or find the 42cursus level safely
                let level = 0;
                if (u.cursus_users && Array.isArray(u.cursus_users)) {
                    const cursus = u.cursus_users.find((cu: any) => cu.cursus?.slug === '42cursus') || u.cursus_users[0];
                    level = cursus?.level || 0;
                }

                const basePrice = level * 10 + (u.correction_point || 0) * 0.5 + 10; // +10 base
                const change = (Math.random() * 10 - 5);

                return {
                    id: u.id,
                    symbol: u.login.toUpperCase(),
                    price: basePrice,
                    change: change,
                    user: u,
                    history: Array.from({ length: 7 }, (_, i) => ({
                        day: `Day ${i + 1}`,
                        price: basePrice + (Math.random() * 20 - 10),
                    }))
                };
            });

            setStocks(generatedStocks);
            if (generatedStocks.length > 0) setSelectedStock(generatedStocks[0]);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch data", error);
            setLoading(false);
        }
    };

    const fetchStockDetails = async (stock: Stock) => {
        if (stock.detailsLoaded) return;

        try {
            const res = await fetch(`https://api.intra.42.fr/v2/users/${stock.id}`, {
                headers: { Authorization: `Bearer ${(session as any).accessToken}` }
            });

            if (!res.ok) return;

            const fullUser = await res.json();

            // Find 42cursus level
            const cursus = fullUser.cursus_users.find((cu: any) => cu.cursus?.slug === '42cursus') || fullUser.cursus_users[0];
            const level = cursus?.level || 0;

            // Recalculate price with accurate level
            const newPrice = level * 10 + (fullUser.correction_point || 0) * 0.5 + 10;

            setStocks(prev => prev.map(s =>
                s.id === stock.id
                    ? { ...s, price: newPrice, user: fullUser, detailsLoaded: true }
                    : s
            ));

            if (selectedStock?.id === stock.id) {
                setSelectedStock(prev => prev ? { ...prev, price: newPrice, user: fullUser, detailsLoaded: true } : null);
            }
        } catch (error) {
            console.error("Failed to fetch stock details", error);
        }
    };

    const handleStockSelect = (stock: Stock) => {
        setSelectedStock(stock);
        fetchStockDetails(stock);
    };

    const buyStock = (stock: Stock) => {
        if (wallet >= stock.price) {
            setWallet(prev => prev - stock.price);
            setPortfolio(prev => ({
                ...prev,
                [stock.symbol]: (prev[stock.symbol] || 0) + 1
            }));
        }
    };

    const sellStock = (stock: Stock) => {
        if (portfolio[stock.symbol] > 0) {
            setWallet(prev => prev + stock.price);
            setPortfolio(prev => ({
                ...prev,
                [stock.symbol]: prev[stock.symbol] - 1
            }));
        }
    };

    // Calculate Portfolio Value
    const portfolioValue = stocks.reduce((acc, stock) => {
        return acc + (stock.price * (portfolio[stock.symbol] || 0));
    }, 0);

    const netWorth = wallet + portfolioValue;

    if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Market Data...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-3">
                        <DollarSign className="w-10 h-10 text-green-400" />
                        42 Stock Market
                    </h1>

                    {/* Portfolio Dashboard */}
                    <div className="flex gap-4">
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 min-w-[160px]">
                            <div className="flex items-center gap-2 mb-1">
                                <Wallet className="w-4 h-4 text-yellow-400" />
                                <p className="text-xs text-slate-400">Cash</p>
                            </div>
                            <p className="text-xl font-bold font-mono text-white">${wallet.toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 min-w-[160px]">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-blue-400" />
                                <p className="text-xs text-slate-400">Net Worth</p>
                            </div>
                            <p className="text-xl font-bold font-mono text-blue-400">${netWorth.toFixed(2)}</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Trading & Portfolio */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Selected Stock Trading Panel */}
                        {selectedStock ? (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                                <div className="flex justify-between items-start mb-6 relative">
                                    <div className="flex items-center gap-4">
                                        <img src={selectedStock.user.image?.link} alt={selectedStock.symbol} className="w-20 h-20 rounded-full border-4 border-slate-800 shadow-lg" />
                                        <div>
                                            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                                                {selectedStock.symbol}
                                                {!selectedStock.detailsLoaded && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full animate-pulse">Updating Price...</span>}
                                            </h2>
                                            <p className="text-slate-400">{selectedStock.user.displayname}</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                                                    Level: {selectedStock.detailsLoaded
                                                        ? (selectedStock.user.cursus_users.find((c: any) => c.cursus?.slug === '42cursus')?.level || 0)
                                                        : '?'}
                                                </span>
                                                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                                                    CP: {selectedStock.user.correction_point}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-right ${selectedStock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        <div className="text-5xl font-mono font-bold tracking-tighter">${selectedStock.price.toFixed(2)}</div>
                                        <div className="flex items-center justify-end gap-1 text-lg font-medium mt-1">
                                            {selectedStock.change >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                            {selectedStock.change.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="h-64 bg-slate-900/50 rounded-xl border border-slate-800 p-4 mb-6">
                                    <StockChart data={selectedStock.history} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => buyStock(selectedStock)}
                                        className="py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                                        disabled={wallet < selectedStock.price}
                                    >
                                        Buy {selectedStock.symbol}
                                    </button>
                                    <button
                                        onClick={() => sellStock(selectedStock)}
                                        className="py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                                        disabled={!portfolio[selectedStock.symbol]}
                                    >
                                        Sell {selectedStock.symbol} ({portfolio[selectedStock.symbol] || 0})
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="text-xl">Select a stock from the market to start trading</p>
                            </div>
                        )}

                        {/* My Portfolio Section */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-purple-400" />
                                My Portfolio
                            </h3>
                            {Object.keys(portfolio).filter(k => portfolio[k] > 0).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(portfolio).filter(([_, qty]) => qty > 0).map(([symbol, qty]) => {
                                        const stock = stocks.find(s => s.symbol === symbol);
                                        if (!stock) return null;
                                        return (
                                            <div key={symbol} className="bg-slate-800/50 p-4 rounded-xl flex justify-between items-center border border-slate-700/50">
                                                <div className="flex items-center gap-3">
                                                    <img src={stock.user.image?.link} className="w-10 h-10 rounded-full" />
                                                    <div>
                                                        <div className="font-bold">{symbol}</div>
                                                        <div className="text-xs text-slate-400">{qty} shares</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-bold">${(stock.price * qty).toFixed(2)}</div>
                                                    <div className="text-xs text-green-400">Avg: ${stock.price.toFixed(0)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-8">You don't own any stocks yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Market List */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-[800px] overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl font-bold mb-4 text-slate-200 sticky top-0 bg-slate-900/95 p-2 backdrop-blur-sm z-10 border-b border-slate-800">
                            Market Listings
                        </h3>
                        <div className="space-y-2">
                            {stocks.map((stock) => (
                                <div
                                    key={stock.id}
                                    onClick={() => handleStockSelect(stock)}
                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all group ${selectedStock?.id === stock.id ? 'bg-slate-800 border border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'bg-slate-800/30 hover:bg-slate-800/60 border border-transparent'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={stock.user.image?.link} className="w-10 h-10 rounded-full bg-slate-800" />
                                            {portfolio[stock.symbol] > 0 && (
                                                <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                                    {portfolio[stock.symbol]}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm group-hover:text-cyan-400 transition-colors">{stock.symbol}</div>
                                            <div className="text-xs text-slate-500">Vol: {(Math.random() * 1000).toFixed(0)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-mono font-bold ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ${stock.price.toFixed(2)}
                                        </div>
                                        <div className={`text-xs ${stock.change >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
                                            {stock.change > 0 ? '+' : ''}{stock.change.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

