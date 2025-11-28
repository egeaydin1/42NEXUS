const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const CLIENT_ID = env.FORTY_TWO_CLIENT_ID;
const CLIENT_SECRET = env.FORTY_TWO_CLIENT_SECRET;

async function getToken() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        });

        const req = https.request({
            hostname: 'api.intra.42.fr',
            path: '/oauth/token',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.write(data);
        req.end();
    });
}

async function fetchUserCoalition(token, userId) {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'api.intra.42.fr',
            path: `/v2/users/${userId}/coalitions_users`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.end();
    });
}

async function main() {
    try {
        const tokenData = await getToken();
        const token = tokenData.access_token;

        // 1. Fetch a few active locations to get user IDs
        console.log("Fetching active locations...");
        const locations = await new Promise((resolve) => {
            https.get({
                hostname: 'api.intra.42.fr',
                path: '/v2/campus/49/locations?filter[active]=true&page[size]=5',
                headers: { 'Authorization': `Bearer ${token}` }
            }, (res) => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => resolve(JSON.parse(body)));
            });
        });

        if (locations.length > 0) {
            const user = locations[0].user;
            console.log(`Checking coalition for user: ${user.login} (${user.id})`);

            // 2. Check if we can get coalition for this user
            const coalitions = await fetchUserCoalition(token, user.id);
            console.log("Coalitions found:", JSON.stringify(coalitions, null, 2));
        } else {
            console.log("No active users found to test.");
        }

    } catch (error) {
        console.error(error);
    }
}

main();
