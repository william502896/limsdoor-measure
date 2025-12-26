import { z } from "zod";


// --- Tool Definitions ---

// 1. Dashboard Stats
const GetDashboardStatsSchema = z.object({});
type GetDashboardStatsArgs = z.infer<typeof GetDashboardStatsSchema>;

// 2. Web Search (Mock/Simulation)
const SearchWebSchema = z.object({
    query: z.string(),
});
type SearchWebArgs = z.infer<typeof SearchWebSchema>;

// 3. Manage Order
const ManageOrderSchema = z.object({
    orderId: z.string(),
    action: z.enum(["approve", "reject", "mark_paid"]),
});
type ManageOrderArgs = z.infer<typeof ManageOrderSchema>;


export const AGENT_TOOLS = [
    {
        type: "function",
        function: {
            name: "get_dashboard_stats",
            description: "Get real-time sales and order statistics from the dashboard.",
            parameters: { type: "object", properties: {}, required: [] },
        },
    },
    {
        type: "function",
        function: {
            name: "search_web",
            description: "Search external information from the web (Market research, competitor prices).",
            parameters: {
                type: "object",
                properties: { query: { type: "string" } },
                required: ["query"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "manage_order",
            description: "Manage a specific order (approve/reject/paid).",
            parameters: {
                type: "object",
                properties: {
                    orderId: { type: "string" },
                    action: { type: "string", enum: ["approve", "reject", "mark_paid"] }
                },
                required: ["orderId", "action"],
            },
        },
    },
];

// --- Tool Implementations (Mock for now, can be real DB later) ---

async function getDashboardStats() {
    // Mock Data (In real app, query `useGlobalStore` or DB)
    return {
        total_revenue: 15400000,
        active_orders: 12,
        pending_measurements: 4,
        top_selling_item: "3연동 초슬림 (화이트)",
    };
}

async function searchWeb(args: SearchWebArgs) {
    // Simulation since we don't have a real Search API Key for the User App
    return {
        query: args.query,
        results: [
            { title: "2024 Door Market Types", snippet: "Slim sliding doors are trending..." },
            { title: "Competitor Price Index", snippet: "Average 3-interlocking door price is 750,000 KRW." },
        ]
    };
}

async function manageOrder(args: ManageOrderArgs) {
    return {
        status: "success",
        message: `Order ${args.orderId} has been ${args.action}ed.`,
        timestamp: new Date().toISOString()
    };
}

// --- Executor ---

export async function executeTool(name: string, args: any) {
    switch (name) {
        case "get_dashboard_stats": return await getDashboardStats();
        case "search_web": return await searchWeb(args);
        case "manage_order": return await manageOrder(args);
        default: return { error: "Unknown tool" };
    }
}
