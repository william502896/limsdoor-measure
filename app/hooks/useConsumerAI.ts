"use client";

import { useState, useMemo } from "react";

export type InstallStatus = "possible" | "warning" | "impossible";

export interface AIAnalysis {
    status: InstallStatus;
    reason: string;
    solution: string;
    confidence: number;
}

export interface Recommendation {
    id: string;
    title: string; // e.g. "Value Pick"
    description: string;
    reason: string;
    priceRange: string;
    config: {
        doorType: string;
        design: string;
        glass: string;
    };
}

interface AIInput {
    isPlaced: boolean;
    isCalibrated: boolean; // Scale confirmed?
    doorType: string;
}

export function useConsumerAI() {

    // B-1: Installability Logic
    const analyze = (input: AIInput): AIAnalysis => {
        // Rule 1: Calibration (Critical)
        if (!input.isCalibrated) {
            return {
                status: "impossible",
                reason: "거리/크기 기준이 아직 설정되지 않았습니다.",
                solution: "먼저 벽면 측정(Calibration)을 완료해주세요.",
                confidence: 100
            };
        }

        // Rule 2: Placement
        if (!input.isPlaced) {
            return {
                status: "warning",
                reason: "가상 도어가 아직 배치되지 않았습니다.",
                solution: "화면을 터치하여 도어를 바닥에 배치해보세요.",
                confidence: 90
            };
        }

        // Rule 3: Door Specific (Mock)
        // In real app, we would analyze the image or AR frame collision.
        // For now, assume OK if placed & calibrated.
        return {
            status: "possible",
            reason: "설치 공간이 충분해 보입니다.",
            solution: "지금 바로 견적을 저장하거나 상담을 요청해보세요.",
            confidence: 95
        };
    };

    // B-2: Recommendation Engine
    const getRecommendations = (doorType: string): Recommendation[] => {
        // Mock Logic based on Door Type
        if (doorType.includes("원슬라이딩")) {
            return [
                {
                    id: "rec-1", title: "가성비 추천",
                    description: "슬림 화이트 + 투명유리",
                    reason: "가장 깔끔하고 넓어 보이는 기본 조합입니다.",
                    priceRange: "80만~",
                    config: { doorType, design: "화이트", glass: "투명 강화" }
                },
                {
                    id: "rec-2", title: "인기 밸런스",
                    description: "브론즈 프레임 + 브론즈강화",
                    reason: "은은한 고급스러움으로 가장 많이 선택받는 조합입니다.",
                    priceRange: "95만~",
                    config: { doorType, design: "브론즈", glass: "브론즈 강화" }
                },
                {
                    id: "rec-3", title: "프리미엄",
                    description: "골드/샴페인 + 샤틴유리",
                    reason: "프라이버시 보호와 호텔 같은 분위기를 연출합니다.",
                    priceRange: "110만~",
                    config: { doorType, design: "골드", glass: "브론즈 샤틴" }
                }
            ];
        } else {
            // Default (3-Interlocking etc)
            return [
                {
                    id: "rec-1", title: "가성비 추천",
                    description: "일반형 + 망입유리",
                    reason: "안전하고 무난한 국민 중문 스타일입니다.",
                    priceRange: "70만~",
                    config: { doorType, design: "그레이", glass: "망입 유리" }
                },
                {
                    id: "rec-2", title: "인기 밸런스",
                    description: "초슬림 + 아쿠아유리",
                    reason: "개방감과 디자인을 모두 잡은 베스트셀러.",
                    priceRange: "90만~",
                    config: { doorType, design: "블랙", glass: "아쿠아 유리" }
                },
                {
                    id: "rec-3", title: "프리미엄",
                    description: "자동문 업그레이드",
                    reason: "손대지 않고 열리는편리함의 끝판왕.",
                    priceRange: "140만~",
                    config: { doorType: "자동문", design: "화이트", glass: "투명 강화" }
                }
            ];
        }
    };

    // B-3: Consultation (Summarizer)
    const createConsultationRequest = (input: AIInput, userContact?: string) => {
        return {
            type: "CONSULT_REQUEST",
            doorType: input.doorType,
            status: "PENDING",
            userContact: userContact || "미입력",
            requestedAt: new Date().toISOString()
        };
    };

    // B-4: Style Matcher via Vision AI
    const matchStyle = async (imageUrl: string) => {
        const response = await fetch("/api/ai/style-match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                images: { image_urls: [imageUrl] }
            })
        });
        if (!response.ok) {
            throw new Error("Style Match Failed");
        }
        return await response.json();
    };

    return { analyze, getRecommendations, createConsultationRequest, matchStyle };
}
