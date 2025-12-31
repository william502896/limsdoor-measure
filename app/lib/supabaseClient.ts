import { createClient } from "@supabase/supabase-js";

const createStub = (message: string) => {
    const dbStub: any = {
        data: [],
        error: { message },
        select: () => dbStub,
        from: () => dbStub,
        eq: () => dbStub,
        neq: () => dbStub,
        gt: () => dbStub,
        lt: () => dbStub,
        gte: () => dbStub,
        lte: () => dbStub,
        like: () => dbStub,
        order: () => dbStub,
        limit: () => dbStub,
        single: () => dbStub,
        maybeSingle: () => dbStub,
        upsert: () => dbStub,
        update: () => dbStub,
        insert: () => dbStub,
        delete: () => dbStub,
        channel: () => ({
            on: () => ({ subscribe: () => { } }),
            subscribe: () => { },
            track: () => Promise.resolve(),
            unsubscribe: () => Promise.resolve(),
            presenceState: () => ({}),
            send: () => Promise.resolve()
        }),
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: () => Promise.resolve({ data: {}, error: { message: message } }),
            signOut: () => Promise.resolve({ error: null }),
        },
        then: (resolve: any) => resolve({ data: [], error: { message }, count: 0 })
    };
    return dbStub;
};

export function createSupabaseBrowser() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        console.error('Supabase environment variables missing. Returning Stub to prevent crash.');
        return createStub('Supabase configuration is missing. Please check your environment variables.');
    }

    return createClient(url, anonKey);
}

export function createSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서버에서만 사용!
        { auth: { persistSession: false } }
    );
}
