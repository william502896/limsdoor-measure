/**
 * Feature Flags and Admin Configuration
 * Source of truth for "1-Person Operation Mode"
 */

export const FEATURE_USER_REGISTRATION = process.env.FEATURE_USER_REGISTRATION === "true";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ceo122270@naver.com";
export const LIMSDOOR_COMPANY_ID = process.env.LIMSDOOR_COMPANY_ID || "00000000-0000-0000-0000-000000000000"; // Fallback to avoid crash, but should be set

/**
 * Checks if the user allows access to registration pages.
 * If false, these pages should be 404/403 or redirected.
 */
export const isRegistrationEnabled = () => FEATURE_USER_REGISTRATION;

/**
 * Checks if the given email is the designated Super Admin.
 * In 1-Person Mode, only this user can perform write operations or view dashboard.
 */
export const isSuperAdmin = (email: string | undefined | null) => {
    if (!email) return false;
    // Normalize comparison
    return email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();
};

/**
 * Route Guard Paths
 * Paths that should be BLOCKED when registration is disabled.
 */
export const BLOCKED_ROUTES = [
    "/signup",
    "/register",
    "/join",
    "/auth/signup",
    "/admin/onboarding",
    "/company/create",
    "/invite",
    "/members",
    "/switch-company"
];
