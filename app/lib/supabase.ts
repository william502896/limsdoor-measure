import { createClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

// Prevent crash if env vars are missing (returns a stub that handles chaining)
const createStub = (message: string) => {
    // Recursive header for database methods
    const dbStub: any = {
        data: [],
        error: { message },
        select: () => dbStub,
        from: () => dbStub,
        eq: () => dbStub,
        neq: () => dbStub, // Added
        gt: () => dbStub,  // Added
        lt: () => dbStub,  // Added
        gte: () => dbStub, // Added
        lte: () => dbStub, // Added
        like: () => dbStub,// Added
        order: () => dbStub,
        limit: () => dbStub, // Added
        single: () => dbStub,
        maybeSingle: () => dbStub, // Added
        upsert: () => dbStub,
        update: () => dbStub,
        insert: () => dbStub, // Added
        delete: () => dbStub, // Added

        // Channel Stub Logic (Infinite Chaining)
        channel: () => {
            const chanStub: any = {
                on: () => chanStub, // Returns itself to allow .on().on().on()
                subscribe: (cb: any) => {
                    if (cb) cb('SUBSCRIBED');
                    return chanStub;
                },
                track: () => Promise.resolve(),
                unsubscribe: () => Promise.resolve(),
                presenceState: () => ({}),
                send: () => Promise.resolve()
            };
            return chanStub;
        },

        // Promise interface to make it awaitable
        then: (resolve: any) => resolve({ data: [], error: { message }, count: 0 })
    };
    return dbStub;
};

// Debugging Env Vars
const isUrlValid = url && url.startsWith("http");
const isKeyValid = anon && anon.length > 0;

if (typeof window !== 'undefined') {
    console.log("[Supabase Init Debug]");
    console.log("URL Present:", !!url, "Valid:", isUrlValid);
    console.log("Key Present:", !!anon, "Length:", anon.length);
    if (!isUrlValid || !isKeyValid) {
        console.warn("Supabase Stub Mode Activated. Missing Credentials.");
    }

    if (isKeyValid && !anon.startsWith("eyJ")) {
        console.warn("⚠️ POTENTIAL CONFIG ERROR: The Supabase Anon Key does not start with 'eyJ'.");
        console.warn("You might have copied the wrong key. It should be the 'anon public' key, which is a long JWT.");
        alert("⚠️ 설정 오류 가능성: Supabase Key가 'eyJ'로 시작하지 않습니다.\nProject Settings > API > anon public 키를 복사했는지 확인해주세요.");
    }
    console.log("[Current Key Prefix]:", anon ? anon.slice(0, 15) + "..." : "NONE");
}

const isStubMode = !(isUrlValid && isKeyValid);

export const supabase = !isStubMode
    ? createClient(url, anon)
    : createStub("Supabase Client not initialized (Check env vars)");

export const isStub = isStubMode;
