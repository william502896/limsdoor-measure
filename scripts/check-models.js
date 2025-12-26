
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
    console.log("Starting model check...");

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        try {
            const envPath = path.join(__dirname, '..', '.env.local');
            if (fs.existsSync(envPath)) {
                const content = fs.readFileSync(envPath, 'utf-8');
                const match = content.match(/GEMINI_API_KEY=(.+)/);
                if (match && match[1]) {
                    apiKey = match[1].trim();
                    if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
                        apiKey = apiKey.slice(1, -1);
                    }
                }
            }
        } catch (e) {
            console.warn("Could not read .env.local:", e.message);
        }
    }

    if (!apiKey) {
        console.error("❌ No GEMINI_API_KEY found");
        process.exit(1);
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            console.error(`❌ API Request Failed: ${response.status}`);
            return;
        }

        const data = await response.json();
        const outputPath = path.join(__dirname, 'available_models.json');
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`✅ Models written to ${outputPath}`);

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
