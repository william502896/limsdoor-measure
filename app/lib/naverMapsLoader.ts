declare global {
    interface Window {
        naver: any;
        navermap_authFailure?: () => void;
    }
}

/**
 * Load Naver Maps script dynamically
 * - Prevents duplicate script loading
 * - Handles authentication failures
 * - Returns promise that resolves when maps API is ready
 */
export function loadNaverMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined") {
            return reject(new Error("window undefined - server-side rendering?"));
        }

        // Already loaded
        if (window.naver?.maps) {
            return resolve();
        }

        const key = process.env.NEXT_PUBLIC_NCP_MAPS_KEY_ID;
        if (!key) {
            return reject(new Error("NEXT_PUBLIC_NCP_MAPS_KEY_ID missing in environment"));
        }

        const src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}`;

        // Check if script tag already exists
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("Maps script load error")));
            return;
        }

        // Set up auth failure handler
        window.navermap_authFailure = () => {
            alert("네이버지도 인증 실패: Naver Cloud 콘솔의 Web 서비스 URL 설정을 확인하세요 (포트/경로 제외).");
        };

        // Create and append script
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Maps script load error"));
        document.head.appendChild(script);
    });
}
