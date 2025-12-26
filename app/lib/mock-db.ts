
import { User } from "./store";

// Temporary in-memory store for Radio Users when Supabase is not configured
interface RadioUser {
    id: string;
    phone: string;
    name: string;
    role: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";
    created_at: string;
    updated_at: string;
}

// Global singleton to persist across hot reloads in dev (mostly)
const globalForMock = globalThis as unknown as { mockRadioUsers: RadioUser[] };

export const mockDb = {
    users: globalForMock.mockRadioUsers || [
        {
            id: "mock-1",
            phone: "010-0000-0000",
            name: "테스트 사용자",
            role: "field",
            status: "APPROVED",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
    ],

    upsert: (user: Partial<RadioUser>) => {
        if (!globalForMock.mockRadioUsers) globalForMock.mockRadioUsers = mockDb.users;

        const existingIndex = mockDb.users.findIndex(u => u.phone === user.phone);
        const now = new Date().toISOString();

        if (existingIndex >= 0) {
            mockDb.users[existingIndex] = {
                ...mockDb.users[existingIndex],
                ...user,
                updated_at: now
            };
            return mockDb.users[existingIndex];
        } else {
            const newUser: RadioUser = {
                id: `mock-${Date.now()}`,
                phone: user.phone!,
                name: user.name!,
                role: user.role || "field",
                status: (user.status as any) || "PENDING",
                created_at: now,
                updated_at: now
            };
            mockDb.users.unshift(newUser); // Add to top
            return newUser;
        }
    },

    update: (id: string, updates: Partial<RadioUser>) => {
        if (!globalForMock.mockRadioUsers) globalForMock.mockRadioUsers = mockDb.users;

        const idx = mockDb.users.findIndex(u => u.id === id);
        if (idx >= 0) {
            mockDb.users[idx] = { ...mockDb.users[idx], ...updates, updated_at: new Date().toISOString() };
            return mockDb.users[idx];
        }
        return null;
    }
};

// Ensure global sync
if (process.env.NODE_ENV !== "production") globalForMock.mockRadioUsers = mockDb.users;
