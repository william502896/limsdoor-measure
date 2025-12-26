import { NextRequest, NextResponse } from "next/server";

export function newRequestId() {
    return crypto.randomUUID();
}

export function json(res: any, status = 200) {
    return NextResponse.json(res, { status });
}

export function error(res: {
    request_id: string;
    code: string;
    message: string;
    detail?: string;
}, status = 400) {
    return NextResponse.json({
        status: "error",
        request_id: res.request_id,
        error: { code: res.code, message: res.message, detail: res.detail }
    }, { status });
}

export function getRole(req: NextRequest) {
    // 예시: 헤더/쿠키/JWT에서 role 추출
    // For dev/mock, we accept 'x-role' header.
    return req.headers.get("x-role"); // admin | measurer | installer | customer
}

export function requireRole(req: NextRequest, roles: string[]) {
    const role = getRole(req);
    if (!role || !roles.includes(role)) {
        return false;
    }
    return true;
}

export function nowMs() {
    return Date.now();
}
