import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/data/blackhole_db.json');

export interface BlackholeUser {
    id: number;
    login: string;
    image: string;
    blackholeDate: string; // ISO Date string
    daysRemaining: number;
}

export interface BlackholeData {
    lastUpdated: number;
    nextPage: number; // For incremental fetching
    users: BlackholeUser[];
}

// Ensure DB exists
if (!fs.existsSync(DB_PATH)) {
    const initialData: BlackholeData = {
        lastUpdated: 0,
        nextPage: 1,
        users: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

export function getBlackholeData(): BlackholeData {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        if (!data.trim()) throw new Error("Empty file");
        return JSON.parse(data);
    } catch (error) {
        // If file is empty or invalid JSON, return default structure
        return {
            lastUpdated: 0,
            nextPage: 1,
            users: []
        };
    }
}

export function saveBlackholeData(data: BlackholeData) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function shouldUpdate(): boolean {
    const data = getBlackholeData();
    const now = new Date();
    const lastUpdate = new Date(data.lastUpdated);

    // Update if last update was not today (checking date string equality)
    return now.toDateString() !== lastUpdate.toDateString();
}
