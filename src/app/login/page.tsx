"use client"

import { signIn } from "next-auth/react"
import { Monitor } from "lucide-react"

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
            <div className="max-w-md w-full p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
                        <Monitor className="w-8 h-8 text-cyan-400" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    42 Nexus
                </h1>
                <p className="text-slate-400 mb-8">
                    The ultimate dashboard for 42 students.
                </p>

                <button
                    onClick={() => signIn("42-school", { callbackUrl: "/" })}
                    className="w-full py-3 px-4 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0L24 12L12 24L0 12L12 0Z" />
                    </svg>
                    Sign in with 42
                </button>
            </div>
        </div>
    )
}
