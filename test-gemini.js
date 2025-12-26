const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Manually load env since we can't rely on dotenv being installed
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GEMINI_API_KEY=(.+)/);
const apiKey = match ? match[1].replace(/"/g, '').trim() : null;

if (!apiKey) {
    console.error("Could not find GEMINI_API_KEY in .env.local");
    process.exit(1);
}

// console.log("Using Key:", apiKey.slice(0, 10) + "...");

async function test() {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        console.log("Testing gemini-1.5-flash...");
        const result = await model.generateContent("Hello, are you there?");
        console.log("SUCCESS! Response:", result.response.text());
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}

test();
