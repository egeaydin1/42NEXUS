import { getServerSession } from "next-auth";
import { authOptions } from "../app/api/auth/[...nextauth]/route";

const BASE_URL = "https://api.intra.42.fr/v2";

export async function fetch42(endpoint: string) {
    const session = await getServerSession(authOptions);

    if (!session || !(session as any).accessToken) {
        throw new Error("Unauthorized");
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${(session as any).accessToken}`,
        },
    });

    if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
    }

    return res.json();
}
