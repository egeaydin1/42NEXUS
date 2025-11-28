import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getUser, processAction, regenerateEnergy } from "@/lib/game-db";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, territoryId } = await req.json();
    const login = (session.user as any).login;

    // Ensure user exists and has energy
    let user = getUser(login);
    if (!user) {
        return NextResponse.json({ error: "User not registered" }, { status: 400 });
    }

    // Regenerate energy before action to be fair
    user = regenerateEnergy(user);

    const result = processAction(login, action, territoryId);

    if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
}
