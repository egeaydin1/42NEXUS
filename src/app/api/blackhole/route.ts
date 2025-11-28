import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";
import { getBlackholeData, saveBlackholeData, shouldUpdate, BlackholeUser } from "@/lib/blackhole-db";

const CAMPUS_ID = "49,50"; // Istanbul, Kocaeli

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Always fetch next page incrementally on every request
        if (true) {
            console.log("Updating Blackhole Data from 42 API...");
            const accessToken = (session as any).accessToken;

            // Strategy: Incremental Fetching
            // We fetch the next page defined in the DB, append new users, and update the DB.
            // This allows us to build the full dataset over time without timeouts.

            const currentData = getBlackholeData();
            const pageToFetch = currentData.nextPage || 1;

            console.log(`Fetching Blackhole Data Page ${pageToFetch}...`);

            const res = await fetch(`https://api.intra.42.fr/v2/cursus_users?filter[campus_id]=${CAMPUS_ID}&filter[cursus_id]=21&filter[active]=true&sort=begin_at&page[size]=100&page[number]=${pageToFetch}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                console.warn(`42 API Error (${res.status}): Falling back to cache.`);
                const data = getBlackholeData();
                return NextResponse.json(data.users);
            }

            const pageData = await res.json();

            // If no more data, reset to page 1 to refresh from start next time
            const nextPageIndex = (Array.isArray(pageData) && pageData.length > 0) ? pageToFetch + 1 : 1;

            const now = new Date();
            const newUsers: BlackholeUser[] = Array.isArray(pageData) ? pageData
                .filter((u: any) => u.blackholed_at && u.user['active?']) // Must have date AND be active (not frozen)
                .map((u: any) => {
                    const bhDate = new Date(u.blackholed_at);
                    const diffTime = bhDate.getTime() - now.getTime();
                    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    return {
                        id: u.user.id,
                        login: u.user.login,
                        image: u.user.image?.link,
                        blackholeDate: u.blackholed_at,
                        daysRemaining: daysRemaining
                    };
                }) : [];

            // Merge with existing users, avoiding duplicates (update existing ones)
            const existingUsersMap = new Map(currentData.users.map(u => [u.id, u]));
            newUsers.forEach(u => existingUsersMap.set(u.id, u));

            const allUsers = Array.from(existingUsersMap.values())
                .sort((a, b) => a.daysRemaining - b.daysRemaining);

            saveBlackholeData({
                lastUpdated: Date.now(),
                nextPage: nextPageIndex,
                users: allUsers
            });

            return NextResponse.json(allUsers);
        } else {
            console.log("Serving Blackhole Data from Cache");
            const data = getBlackholeData();
            return NextResponse.json(data.users);
        }

    } catch (error) {
        console.error("Blackhole API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
