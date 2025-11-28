import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/data/game_db.json');

export interface GameUser {
    id: number;
    login: string;
    factionId: number;
    energy: number;
    lastEnergyUpdate: number;
    score: number;
    battlesWon: number;
    battlesLost: number;
}

export interface Faction {
    id: number;
    name: string;
    score: number;
    territories: number;
}

export interface Territory {
    id: string; // e.g., "c1r1s1" (host)
    factionId: number;
    health: number; // 0-100
    ownerLogin: string | null; // User who captured it
}

export interface GameData {
    users: Record<string, GameUser>; // Keyed by login
    factions: Record<string, Faction>;
    territories: Record<string, Territory>;
}

// Ensure DB exists
if (!fs.existsSync(DB_PATH)) {
    const initialData: GameData = {
        users: {},
        factions: {
            "0": { id: 0, name: "The Alliance", score: 0, territories: 0 },
            "1": { id: 1, name: "The Order", score: 0, territories: 0 },
            "2": { id: 2, name: "The Assembly", score: 0, territories: 0 },
            "3": { id: 3, "name": "The Federation", score: 0, territories: 0 }
        },
        territories: {}
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

export function getGameData(): GameData {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}

export function saveGameData(data: GameData) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getUser(login: string): GameUser | null {
    const data = getGameData();
    return data.users[login] || null;
}

export function registerUser(user: Partial<GameUser> & { login: string, id: number }): GameUser {
    const data = getGameData();

    // Deterministic Faction
    const hash = user.login.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const factionId = hash % 4;

    const defaults: GameUser = {
        id: user.id,
        login: user.login,
        factionId: factionId,
        energy: 100,
        lastEnergyUpdate: Date.now(),
        score: 0,
        battlesWon: 0,
        battlesLost: 0,
    };

    const newUser: GameUser = {
        ...defaults,
        ...data.users[user.login]
    };

    data.users[user.login] = newUser;
    saveGameData(data);
    return newUser;
}

export function regenerateEnergy(user: GameUser): GameUser {
    const now = Date.now();
    const timeDiff = now - user.lastEnergyUpdate;
    const energyToAdd = Math.floor(timeDiff / (5 * 60 * 1000)) * 10; // 10 energy every 5 mins

    if (energyToAdd > 0) {
        user.energy = Math.min(100, user.energy + energyToAdd);
        user.lastEnergyUpdate = now;
    }
    return user;
}

export function processAction(login: string, action: 'attack' | 'defend', territoryId: string): { success: boolean; message: string; newState?: any } {
    const data = getGameData();
    const user = data.users[login];

    if (!user) return { success: false, message: "User not found" };
    if (user.energy < 10) return { success: false, message: "Not enough energy" };

    // Initialize territory if not exists
    if (!data.territories[territoryId]) {
        data.territories[territoryId] = {
            id: territoryId,
            factionId: -1, // Neutral
            health: 50,
            ownerLogin: null
        };
    }

    const territory = data.territories[territoryId];
    const userFaction = user.factionId;

    // Consume Energy
    user.energy -= 10;
    user.lastEnergyUpdate = Date.now(); // Reset regen timer on action? Or keep it independent? Let's keep independent but update timestamp to avoid double regen if we called regenerate before.
    // Actually, regenerateEnergy should be called BEFORE this to ensure they have up-to-date energy.

    if (action === 'attack') {
        if (territory.factionId === userFaction) {
            return { success: false, message: "Cannot attack your own faction's territory. Use Defend." };
        }

        // Damage Calculation (Random 10-20)
        const damage = Math.floor(Math.random() * 11) + 10;
        territory.health -= damage;

        if (territory.health <= 0) {
            // Territory Captured!
            const oldFactionId = territory.factionId;

            // Update Faction Scores
            if (oldFactionId !== -1) {
                data.factions[oldFactionId].territories--;
                data.factions[oldFactionId].score = Math.max(0, data.factions[oldFactionId].score - 50);
            }

            territory.factionId = userFaction;
            territory.health = 50; // Reset health
            territory.ownerLogin = login;

            data.factions[userFaction].territories++;
            data.factions[userFaction].score += 100;

            user.score += 50;
            user.battlesWon++;

            saveGameData(data);
            return { success: true, message: `Territory Captured! You dealt ${damage} damage.`, newState: { territory, user, factions: data.factions } };
        } else {
            user.score += 5; // Small XP for attacking
            saveGameData(data);
            return { success: true, message: `Attack successful! Dealt ${damage} damage. Health: ${territory.health}`, newState: { territory, user } };
        }
    }

    else if (action === 'defend') {
        if (territory.factionId !== userFaction) {
            return { success: false, message: "Cannot defend enemy territory. Use Attack." };
        }

        if (territory.health >= 100) {
            return { success: false, message: "Territory is already at max health." };
        }

        // Repair Calculation (Random 10-20)
        const repair = Math.floor(Math.random() * 11) + 10;
        territory.health = Math.min(100, territory.health + repair);

        user.score += 10; // XP for defending

        saveGameData(data);
        return { success: true, message: `Defended territory! Repaired ${repair} health.`, newState: { territory, user } };
    }

    return { success: false, message: "Invalid action" };
}
