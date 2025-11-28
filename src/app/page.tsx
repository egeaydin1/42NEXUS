import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "./api/auth/[...nextauth]/route"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            42 Nexus
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-white">{(session.user as any).login}</p>
              <p className="text-sm text-slate-400">Student</p>
            </div>
            <img
              src={(session.user as any).image}
              alt="Profile"
              className="w-10 h-10 rounded-full border border-slate-700"
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Market Module Link */}
          <Link href="/market" className="block bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/50 transition-colors group cursor-pointer">
            <h2 className="text-xl font-bold mb-2 text-cyan-400 group-hover:text-cyan-300">Stock Market</h2>
            <p className="text-slate-400">Invest in your peers. Track the rising stars of 42.</p>
          </Link>

          {/* Pulse Module Link */}
          <Link href="/pulse" className="block bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-purple-500/50 transition-colors group cursor-pointer">
            <h2 className="text-xl font-bold mb-2 text-purple-400 group-hover:text-purple-300">Campus Pulse</h2>
            <p className="text-slate-400">Real-time heatmap and historical time machine.</p>
          </Link>

          {/* Game Module Link */}
          <Link href="/game" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-1 hover:scale-[1.02] transition-all duration-300 border border-white/10 hover:border-purple-500/50">
            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-300" />
            <div className="relative h-full bg-black/40 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Nexus Wars</h2>
              <p className="text-gray-400 text-sm">Territory Control Game</p>
            </div>
          </Link>

          <Link href="/cheaters" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/50 to-orange-900/50 p-1 hover:scale-[1.02] transition-all duration-300 border border-white/10 hover:border-red-500/50">
            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-300" />
            <div className="relative h-full bg-black/40 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">Hall of Shame</h2>
              <p className="text-gray-400 text-sm">42 Cheaters List</p>
            </div>
          </Link>

          {/* Blackhole Module Link */}
          <Link href="/blackhole" className="block bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-red-600/50 transition-colors group cursor-pointer md:col-span-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-black rounded-full shadow-[0_0_10px_purple]"></div>
              <h2 className="text-xl font-bold text-red-500 group-hover:text-red-400">Event Horizon (Blackhole)</h2>
            </div>
            <p className="text-slate-400">Visualize students approaching the singularity.</p>
          </Link>
        </div>
      </div>
    </main>
  )
}
