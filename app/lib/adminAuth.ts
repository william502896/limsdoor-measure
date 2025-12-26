export function isAdminRequest(req: Request) {
    const key = req.headers.get("x-admin-key");
    return key && key === process.env.ADMIN_MASTER_KEY;
}
