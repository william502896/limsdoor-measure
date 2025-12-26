"use client";

import { useMemo } from "react";

export type AIStatus = "ok" | "warning" | "critical";

export interface AnalysisResult {
    status: AIStatus;
    confidence: number;
    issues: string[]; // List of potential causes
    actions: string[]; // Checklist
    requiredPhotos: string[]; // List of required photo types
    message: string;
}

interface AIInput {
    category: string;
    detail: string;
    widthPoints: number[]; // valid numbers only
    heightPoints: number[]; // valid numbers only
    minPointsW: number;
    minPointsH: number;
}

export function useFieldAI() {

    const analyze = (input: AIInput): AnalysisResult => {
        const issues: string[] = [];
        const actions: string[] = [];
        let status: AIStatus = "ok";
        let confidence = 95; // Base confidence

        // 1. Point Completeness Check
        if (input.widthPoints.length < input.minPointsW || input.heightPoints.length < input.minPointsH) {
            issues.push("측정 포인트 부족");
            actions.push(`가로 ${input.minPointsW}포인트, 세로 ${input.minPointsH}포인트 측정을 완료해주세요.`);
            status = "critical";
            confidence = 100;
        }

        // 2. Deviation Logic (A-1)
        const wMax = Math.max(...input.widthPoints);
        const wMin = Math.min(...input.widthPoints);
        const hMax = Math.max(...input.heightPoints);
        const hMin = Math.min(...input.heightPoints);

        const wDiff = wMax - wMin;
        const hDiff = hMax - hMin;
        const maxDiff = Math.max(wDiff, hDiff);

        if (maxDiff >= 5 && maxDiff < 10) {
            if (status !== "critical") status = "warning";
            issues.push("벽면/바닥 수평 오차 감지 (5mm~10mm)");
            actions.push("실리콘 마감 가능성 확인");
            actions.push("추가 자재(몰딩 등) 필요 여부 체크");
        } else if (maxDiff >= 10) {
            status = "critical";
            issues.push("심각한 수직/수평 불량 감지 (10mm 이상)");
            actions.push("상/하부 및 좌/우 레벨기 측정 사진 필수 첨부");
            actions.push("고객에게 추가 시공비 발생 가능성 안내 필요");
            confidence = 98;
        }

        // 3. Category Specific Logic
        if (input.detail.includes("원슬라이딩")) {
            if (status === "critical") {
                actions.push("원슬라이딩은 수평 민감도가 높습니다. 바닥 레벨링 확인 필수.");
            }
        }

        // 4. Photo Requirements (A-2)
        const requiredPhotos = ["전체 전면샷"]; // Default
        if (maxDiff >= 10 || status === "critical") {
            requiredPhotos.push("상부 디테일", "하부 디테일", "레벨기 측정샷");
        } else if (input.detail.includes("원슬라이딩")) {
            requiredPhotos.push("하부 레일 위치");
        }

        // Message Generation
        let message = "AI 분석 결과: 정상";
        if (status === "warning") message = "AI 분석 결과: 주의 필요 (오차 감지)";
        if (status === "critical") message = "AI 분석 결과: 심각한 문제 감지 (조치 필수)";

        return {
            status,
            confidence,
            issues,
            actions,
            requiredPhotos,
            message
        };
    };

    const categorizePhoto = (file: File) => {
        // Mock Classification Logic
        const name = file.name.toLowerCase();
        if (name.includes("top") || name.includes("sang")) return "상부";
        if (name.includes("bot") || name.includes("ha")) return "하부";
        return "분류 미정";
    };

    return { analyze, categorizePhoto };
}
