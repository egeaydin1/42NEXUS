import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/data/cheaters_db.json');

export interface Cheater {
    id: number;
    login: string;
    image: string;
    cheatCount: number;
    lastCheatDate: string;
    cheats: {
        projectName: string;
        date: string;
        mark: number;
    }[];
    achievements: string[]; // Array of achievement IDs or names
    campus: string; // 'Istanbul' or 'Kocaeli'
    isPatron?: boolean;
}

export interface CheatersData {
    lastUpdated: number;
    nextPage: number;
    cheaters: Cheater[];
}

// Ensure DB exists
if (!fs.existsSync(DB_PATH)) {
    const initialData: CheatersData = {
        lastUpdated: 0,
        nextPage: 1,
        cheaters: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

export function getCheatersData(): CheatersData {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        if (!data.trim()) throw new Error("Empty file");
        return JSON.parse(data);
    } catch (error) {
        return {
            lastUpdated: 0,
            nextPage: 1,
            cheaters: []
        };
    }
}

export function saveCheatersData(data: CheatersData) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
