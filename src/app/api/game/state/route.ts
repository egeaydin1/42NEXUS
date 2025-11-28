import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getGameData, getUser, regenerateEnergy } from "@/lib/game-db";

export async function GET() {
    const session = await getServerSession(authOptions);
    const data = getGameData();

    let user = null;
    if (session) {
        const login = (session.user as any).login;
        user = getUser(login);
        if (user) {
            user = regenerateEnergy(user);
        }
    }

    return NextResponse.json({
        factions: data.factions,
        territories: data.territories,
        user: user,
        leaderboard: Object.values(data.users)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(u => ({ login: u.login, score: u.score, factionId: u.factionId }))
    });
}
