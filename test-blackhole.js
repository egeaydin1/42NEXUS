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

async function main() {
    try {
        console.log("Getting Token...");
        const tokenData = await getToken();
        const token = tokenData.access_token;
        console.log("Token obtained.");

        // Test 3: Filter by campus (not campus_id)
        const path3 = `/v2/projects_users?filter[campus]=49&filter[final_mark]=-42&page[size]=5`;

        const fetchUrl = (urlPath, label) => {
            return new Promise((resolve) => {
                console.log(`Fetching ${label}: https://api.intra.42.fr${urlPath}`);
                const req = https.request({
                    hostname: 'api.intra.42.fr',
                    path: urlPath,
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` },
                }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        resolve({ label, status: res.statusCode, body });
                    });
                });
                req.end();
            });
        };

        // Test cursus_users filters
        const path1 = `/v2/cursus_users?filter[campus_id]=49,50&page[size]=5`;
        const path2 = `/v2/cursus_users?filter[campus_id]=49&page[size]=5`;

        Promise.all([
            fetchUrl(path1, "Campus ID 49,50"),
            fetchUrl(path2, "Campus ID 49")
        ]).then((results) => {
            results.forEach(r => {
                console.log(`${r.label} Status: ${r.status}`);
                if (r.status !== 200) {
                    console.log(`${r.label} Error:`, r.body);
                } else {
                    const data = JSON.parse(r.body);
                    console.log(`${r.label} Count: ${data.length}`);
                }
            });
        });

        // Fetch all campuses to find Turkish ones
        const campusPath = `/v2/campus?page[size]=100`;

        fetchUrl(campusPath, "Campuses").then((r) => {
            console.log(`${r.label} Status: ${r.status}`);
            if (r.status === 200) {
                const data = JSON.parse(r.body);
                console.log(`${r.label} Count: ${data.length}`);

                const turkishCampuses = data.filter(c => c.country === "Turkey" || c.name.toLowerCase().includes("istanbul") || c.name.toLowerCase().includes("kocaeli"));
                console.log("Turkish Campuses:", JSON.stringify(turkishCampuses, null, 2));
            }
        });

        // Test exact route URL
        const pathExact = `/v2/cursus_users?filter[campus_id]=49,50&filter[cursus_id]=21&filter[active]=true&sort=begin_at&page[size]=5`;

        fetchUrl(pathExact, "Exact Route URL").then((r) => {
            console.log(`${r.label} Status: ${r.status}`);
            if (r.status !== 200) {
                console.log(`${r.label} Error:`, r.body);
            } else {
                const data = JSON.parse(r.body);
                console.log(`${r.label} Count: ${data.length}`);
                if (data.length > 0) {
                    console.log("Sample User:", data[0].user.login);
                }
            }
        });

        // Check for deadlines in teams
        const teamsPath = `/v2/users/egeaydin/teams?page[size]=100`;

        fetchUrl(teamsPath, "Teams").then((r) => {
            console.log(`${r.label} Status: ${r.status}`);
            if (r.status === 200) {
                const data = JSON.parse(r.body);
                console.log(`${r.label} Count: ${data.length}`);

                // Look for any date around Dec 10, 2025 (2025-12-10)
                const targetDate = "2025-12-10";

                data.forEach(team => {
                    // Check terminating_at, locked_at, closed_at, or any other date
                    // Also check project session deadlines if available
                    if (JSON.stringify(team).includes("2025-12")) {
                        console.log("Found matching date in team:", JSON.stringify(team, null, 2));
                    }
                });
            }
        });

    } catch (error) {
        console.error(error);
    }
}

main();
