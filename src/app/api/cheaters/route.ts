import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCheatersData, saveCheatersData, Cheater } from "@/lib/cheaters-db";

const CAMPUS_ID = 49; // Istanbul

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const currentData = getCheatersData();
        const now = new Date();
        const lastUpdateDate = new Date(currentData.lastUpdated);

        // Check if data is fresh (updated today)
        const isFresh = now.toDateString() === lastUpdateDate.toDateString();

        if (isFresh && currentData.cheaters.length > 0) {
            console.log("Serving Cheaters Data from Cache (Updated Today)");
            return NextResponse.json(currentData.cheaters);
        }

        console.log("Updating Cheaters Data from 42 API...");
        const accessToken = (session as any).accessToken;
        const pageToFetch = currentData.nextPage || 1;

        console.log(`Fetching Cheaters Data Page ${pageToFetch}...`);

        // Fetch projects_users with final_mark = -42, filtered by Istanbul (49) and Kocaeli (50)
        // We need to fetch for both campuses. We can do this in parallel.
        const [resIstanbul, resKocaeli] = await Promise.all([
            fetch(`https://api.intra.42.fr/v2/projects_users?filter[campus]=49&filter[final_mark]=-42&sort=-marked_at&page[size]=100&page[number]=${pageToFetch}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            }),
            fetch(`https://api.intra.42.fr/v2/projects_users?filter[campus]=50&filter[final_mark]=-42&sort=-marked_at&page[size]=100&page[number]=${pageToFetch}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
        ]);

        if (!resIstanbul.ok || !resKocaeli.ok) {
            console.warn(`Cheaters API Error: Falling back to cache.`);
            return NextResponse.json(currentData.cheaters);
        }

        const dataIstanbul = await resIstanbul.json();
        const dataKocaeli = await resKocaeli.json();

        // Tag data with campus before combining
        const taggedIstanbul = Array.isArray(dataIstanbul) ? dataIstanbul.map((r: any) => ({ ...r, _campus: 'Istanbul' })) : [];
        const taggedKocaeli = Array.isArray(dataKocaeli) ? dataKocaeli.map((r: any) => ({ ...r, _campus: 'Kocaeli' })) : [];

        // Combine data
        const pageData = [...taggedIstanbul, ...taggedKocaeli];

        // If no more data in EITHER, we stop? Or if BOTH have data?
        // Since we fetch page X for both, if either returns data, we should probably check next page.
        // But this simple logic might re-fetch empty pages for one campus while the other is still going.
        // Ideally, we track pages separately, but for simplicity in this "Cheaters" module which is just a fun feature,
        // we'll increment if we got *any* data.
        const nextPageIndex = (pageData.length > 0) ? pageToFetch + 1 : 1;

        const cheatersMap = new Map<number, Cheater>();

        // Load existing data into map
        currentData.cheaters.forEach(c => cheatersMap.set(c.id, c));

        if (Array.isArray(pageData)) {
            for (const record of pageData) {
                const user = record.user;
                if (!user) continue;

                // Temporary Log to inspect structure
                // console.log("User Object Keys:", Object.keys(user));
                // console.log("User Sample:", JSON.stringify(user, null, 2));

                let cheater = cheatersMap.get(user.id);

                // Check for Patron status (Godfather)
                // user.patroning is usually an array of users they patron
                const isPatron = Array.isArray(user.patroning) && user.patroning.length > 0;

                if (!cheater) {
                    cheater = {
                        id: user.id,
                        login: user.login,
                        image: user.image?.link,
                        cheatCount: 0,
                        lastCheatDate: record.marked_at,
                        cheats: [],
                        achievements: [],
                        campus: record._campus,
                        isPatron: isPatron
                    };
                } else {
                    // Update campus if missing (migration)
                    if (!cheater.campus) cheater.campus = record._campus;
                    // Update patron status
                    if (isPatron) cheater.isPatron = true;
                }

                // Check if this specific cheat record is already recorded
                // We can use project name + date as unique key
                const cheatExists = cheater.cheats.some(c => c.projectName === record.project.name && c.date === record.marked_at);

                if (!cheatExists) {
                    cheater.cheats.push({
                        projectName: record.project.name,
                        date: record.marked_at,
                        mark: record.final_mark
                    });
                    cheater.cheatCount = cheater.cheats.length;

                    // Update last cheat date if this one is newer
                    if (new Date(record.marked_at) > new Date(cheater.lastCheatDate)) {
                        cheater.lastCheatDate = record.marked_at;
                    }
                }

                cheatersMap.set(user.id, cheater);
            }
        }

        const allCheaters = Array.from(cheatersMap.values())
            .sort((a, b) => {
                if (b.cheatCount !== a.cheatCount) {
                    return b.cheatCount - a.cheatCount;
                }
                return new Date(b.lastCheatDate).getTime() - new Date(a.lastCheatDate).getTime();
            });

        // Calculate Achievements
        // 1. Find First Ever Cheater (Global)
        let oldestCheatDate = new Date().getTime();
        let firstCheaterId = 0;

        allCheaters.forEach(c => {
            c.achievements = []; // Reset achievements

            // Serial Cheater (3+ cheats)
            if (c.cheatCount >= 3) c.achievements.push("SERIAL_OFFENDER");
            // Mega Cheater (5+ cheats)
            if (c.cheatCount >= 5) c.achievements.push("CRIME_LORD");

            // Analyze Cheats
            let hasExamCheat = false;
            let hasNightCheat = false;
            let hasWeekendCheat = false;
            let hasPiscineCheat = false;
            let hasGroupCheat = false;
            let cheatDates: number[] = [];
            let projectNames: string[] = [];

            const groupProjects = ['minishell', 'cub3d', 'ft_irc', 'webserv', 'ft_transcendence', 'cpp', 'inception'];

            c.cheats.forEach(cheat => {
                const cheatDate = new Date(cheat.date);
                const cheatTime = cheatDate.getTime();
                const hour = cheatDate.getHours();
                const day = cheatDate.getDay(); // 0 = Sunday, 6 = Saturday
                const projName = cheat.projectName.toLowerCase();

                cheatDates.push(cheatTime);
                projectNames.push(projName);

                // Oldest check
                if (cheatTime < oldestCheatDate) {
                    oldestCheatDate = cheatTime;
                    firstCheaterId = c.id;
                }

                // Exam Cheat
                if (projName.includes("exam")) hasExamCheat = true;

                // Piscine Cheat (Speedrun?)
                if (projName.includes("piscine") || projName.includes("rush")) hasPiscineCheat = true;

                // Group Project Cheat
                if (groupProjects.some(gp => projName.includes(gp))) hasGroupCheat = true;

                // Night Owl (00:00 - 06:00)
                if (hour >= 0 && hour < 6) hasNightCheat = true;

                // Weekend Warrior (Sat/Sun)
                if (day === 0 || day === 6) hasWeekendCheat = true;
            });

            if (hasExamCheat) c.achievements.push("EXAM_FAIL");
            if (hasNightCheat) c.achievements.push("NIGHT_WATCH");
            if (hasWeekendCheat) c.achievements.push("WEEKEND_WARRIOR");
            if (hasPiscineCheat) c.achievements.push("SPEEDRUN"); // Cheating in Piscine = Speedrun to failure
            if (hasGroupCheat) c.achievements.push("TEAM_BETRAYAL");

            // Combo Breaker: 2 cheats within 24 hours
            cheatDates.sort((a, b) => a - b);
            let hasCombo = false;
            for (let i = 0; i < cheatDates.length - 1; i++) {
                if (cheatDates[i + 1] - cheatDates[i] < 24 * 60 * 60 * 1000) {
                    hasCombo = true;
                    break;
                }
            }
            if (hasCombo) c.achievements.push("COMBO_BREAKER");

            // Repeat Offender: Same project twice
            const uniqueProjects = new Set(projectNames);
            if (uniqueProjects.size < projectNames.length) {
                c.achievements.push("REPEAT_OFFENDER");
            }

            // Bad Example (Patron) - Checking user object if available, but we only have 'user' from the loop above.
            // We need to store 'isPatron' in the Cheater object during the loop.
            // Since we can't easily access it here without modifying the loop, let's assume we added it.
            // For now, I'll skip BAD_EXAMPLE implementation in this block until I update the loop to extract it.
            if (c.isPatron) c.achievements.push("BAD_EXAMPLE");
        });

        // Assign First Blood
        const firstCheater = allCheaters.find(c => c.id === firstCheaterId);
        if (firstCheater) firstCheater.achievements.push("FIRST_BLOOD");

        // Assign Fresh Meat (Most recent cheat in the entire list)
        let newestCheatDate = 0;
        let lastCheaterId = 0;

        allCheaters.forEach(c => {
            if (new Date(c.lastCheatDate).getTime() > newestCheatDate) {
                newestCheatDate = new Date(c.lastCheatDate).getTime();
                lastCheaterId = c.id;
            }
        });

        const lastCheater = allCheaters.find(c => c.id === lastCheaterId);
        if (lastCheater) lastCheater.achievements.push("FRESH_MEAT");

        saveCheatersData({
            lastUpdated: Date.now(),
            nextPage: nextPageIndex,
            cheaters: allCheaters
        });

        return NextResponse.json(allCheaters);

    } catch (error) {
        console.error("Cheaters API Error:", error);
        // Fallback to cache on any error
        const currentData = getCheatersData();
        return NextResponse.json(currentData.cheaters);
    }
}
