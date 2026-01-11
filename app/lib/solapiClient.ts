import "server-only";

// Mock implementation to pass build and allow Alimtalk/SMS logic in notify.ts to work
export function solapiMessageService() {
    return {
        async send(params: any) {
            console.log("[SOLAPI MOCK] Send request:", JSON.stringify(params, null, 2));

            const apiKey = process.env.SOLAPI_API_KEY;
            const apiSecret = process.env.SOLAPI_API_SECRET;

            if (!apiKey || !apiSecret) {
                console.warn("[SOLAPI MOCK] Missing credentials API_KEY or API_SECRET");
            }

            // Mock response structure matching Solapi SDK
            return {
                groupInfo: {
                    groupId: "MOCK_GROUP_" + Date.now(),
                    status: "PENDING"
                },
                messageId: "MOCK_MSG_" + Date.now(),
                accountId: "MOCK_ACC",
                statusCode: "2000",
                statusMessage: "Normal (Mock)"
            };
        }
    };
}
