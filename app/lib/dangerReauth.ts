export async function ensureDangerReauth(): Promise<boolean> {
    // 서버 쿠키를 직접 읽기 어렵기 때문에 "항상 확인" 방식으로 간단 처리
    const pin = prompt("대표 PIN을 다시 입력하세요(중요 작업)");
    if (!pin) return false;

    const res = await fetch("/api/admin/reauth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
    });
    return res.ok;
}
