"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Check, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import {
    VoiceRecorder,
    transcribeAudio,
    parseMeasurementFromText,
    validateMeasurement,
    generateVoiceFeedback,
    speakFeedback,
    isRecordingSupported,
    ParsedMeasurement,
    RecordingState,
} from "@/app/lib/voiceMeasurement";

type VoiceInputProps = {
    onApplyMeasurement: (data: ParsedMeasurement) => void;
    currentDoorType?: string; // For determining required measurement points
    currentMeasurementCounts?: { width: number; height: number }; // Current filled points
};

export default function VoiceInput({ onApplyMeasurement, currentDoorType = "", currentMeasurementCounts }: VoiceInputProps) {
    const [state, setState] = useState<RecordingState>("idle");
    const [transcript, setTranscript] = useState<string>("");
    const [parsedData, setParsedData] = useState<ParsedMeasurement | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [showTranscript, setShowTranscript] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState<string>("");
    const [sequentialMode, setSequentialMode] = useState(false);
    const [measurementIndex, setMeasurementIndex] = useState(0); // Track which measurement we're on
    const [measurementType, setMeasurementType] = useState<"width" | "height">("width"); // Which dimension

    const recorderRef = useRef<VoiceRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoStopRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate required measurements based on door type
    const requiredMeasurements = {
        width: currentDoorType.includes("원슬라이딩") ? 3 : 3,
        height: currentDoorType.includes("원슬라이딩") ? 5 : 3
    };

    const totalMeasurements = requiredMeasurements.width + requiredMeasurements.height;
    const currentCount = (currentMeasurementCounts?.width || 0) + (currentMeasurementCounts?.height || 0);
    const remainingMeasurements = totalMeasurements - currentCount;

    useEffect(() => {
        if (!isRecordingSupported()) {
            setErrorMessage("이 브라우저는 음성 녹음을 지원하지 않습니다.");
        }
    }, []);

    const startRecording = async () => {
        try {
            setErrorMessage("");
            setState("recording");
            setRecordingTime(0);
            setTranscript("");
            setParsedData(null);

            recorderRef.current = new VoiceRecorder();
            await recorderRef.current.startRecording();

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

            // Auto-stop after 8 seconds
            autoStopRef.current = setTimeout(() => {
                stopRecording();
            }, 8000);

        } catch (error: any) {
            setState("error");
            setErrorMessage(
                error.message.includes("denied")
                    ? "마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요."
                    : error.message || "녹음 시작 실패"
            );
            cleanup();
        }
    };

    const stopRecording = async () => {
        if (!recorderRef.current) return;

        cleanup();

        try {
            setState("processing");
            const audioBlob = await recorderRef.current.stopRecording();

            // Upload and transcribe
            const { text } = await transcribeAudio(audioBlob);
            setTranscript(text);

            // Parse measurement data
            const parsed = parseMeasurementFromText(text);
            setParsedData(parsed);

            // Validate
            const validation = validateMeasurement(parsed);
            setWarnings(validation.warnings);
            setNeedsConfirmation(validation.needsConfirmation);
            setConfirmationMessage(validation.confirmationMessage || "");

            if (validation.needsConfirmation) {
                setState("error");
                setErrorMessage(validation.confirmationMessage || "데이터를 확인해주세요.");
                // Speak confirmation message
                speakFeedback(validation.confirmationMessage || "");
            } else {
                setState("success");
                setShowTranscript(true);
                // Speak feedback
                const feedback = generateVoiceFeedback(parsed);
                speakFeedback(feedback);
            }

        } catch (error: any) {
            setState("error");
            setErrorMessage(error.message || "음성 인식 실패");
        }
    };

    const cleanup = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (autoStopRef.current) {
            clearTimeout(autoStopRef.current);
            autoStopRef.current = null;
        }
    };

    const handleApply = () => {
        if (parsedData) {
            onApplyMeasurement(parsedData);

            if (sequentialMode && remainingMeasurements > 1) {
                // Prepare for next measurement
                setState("idle");
                setTranscript("");
                setParsedData(null);
                setWarnings([]);

                // Voice guidance for next measurement
                const nextCount = currentCount + 1;
                const nextMessage = `${nextCount}번 측정 완료. ${nextCount + 1}번 측정을 진행하세요.`;
                speakFeedback(nextMessage);
            } else {
                // All done
                setState("idle");
                setTranscript("");
                setParsedData(null);
                setSequentialMode(false);
                setMeasurementIndex(0);

                if (sequentialMode) {
                    speakFeedback("모든 측정이 완료되었습니다.");
                }
            }
        }
    };

    const reset = () => {
        setState("idle");
        setTranscript("");
        setParsedData(null);
        setErrorMessage("");
        setRecordingTime(0);
    };

    if (!isRecordingSupported()) {
        return (
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-center text-slate-600">
                음성 입력 기능은 이 브라우저에서 지원되지 않습니다.
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Mic size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">🎤️ 음성 실측 입력</h3>
                        <p className="text-xs text-slate-500">
                            {sequentialMode
                                ? `${currentCount + 1}번 측정 (잔여: ${remainingMeasurements}개)`
                                : "가로/세로, 문종류, 유리 등을 말씀하세요"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Sequential Mode Toggle */}
                    {totalMeasurements > 1 && (
                        <button
                            onClick={() => {
                                setSequentialMode(!sequentialMode);
                                if (!sequentialMode) {
                                    setMeasurementIndex(0);
                                    speakFeedback("순차 측정 모드. 1번 측정을 시작하세요.");
                                }
                            }}
                            className={`px-2 py-1 rounded text-xs font-bold transition ${sequentialMode
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                }`}
                            title="순차 측정 모드"
                        >
                            {sequentialMode ? "순차 ON" : "모든 항목"}
                        </button>
                    )}

                    {state !== "idle" && state !== "recording" && (
                        <button
                            onClick={reset}
                            className="p-2 hover:bg-indigo-100 rounded-lg text-indigo-600 transition"
                            title="초기화"
                        >
                            <RefreshCw size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Record Button */}
            {(state === "idle" || state === "recording") && (
                <button
                    onClick={state === "idle" ? startRecording : stopRecording}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg ${state === "recording"
                        ? "bg-red-500 hover:bg-red-600 animate-pulse"
                        : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                >
                    {state === "recording" ? (
                        <span className="flex items-center justify-center gap-2">
                            <MicOff size={20} />
                            녹음 중지 ({recordingTime}초)
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <Mic size={20} />
                            녹음 시작
                        </span>
                    )}
                </button>
            )}

            {/* Processing State */}
            {state === "processing" && (
                <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-3"></div>
                    <p className="text-indigo-600 font-bold">음성 인식 중...</p>
                </div>
            )}

            {/* Success State */}
            {state === "success" && parsedData && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                        <Check size={20} />
                        <span className="font-bold">인식 완료</span>
                    </div>

                    {/* Parsed Data Preview */}
                    <div className="bg-white rounded-lg p-3 space-y-2 border border-green-200">
                        <div className="text-xs font-bold text-slate-600 mb-2">📝 인식된 정보:</div>
                        {parsedData.widthMm && (
                            <div className="text-sm"><span className="font-bold">가로:</span> {parsedData.widthMm}mm</div>
                        )}
                        {parsedData.heightMm && (
                            <div className="text-sm"><span className="font-bold">세로:</span> {parsedData.heightMm}mm</div>
                        )}
                        {parsedData.doorCategory && (
                            <div className="text-sm"><span className="font-bold">문종류:</span> {parsedData.doorCategory}</div>
                        )}
                        {parsedData.doorType && (
                            <div className="text-sm"><span className="font-bold">세부:</span> {parsedData.doorType}</div>
                        )}
                        {parsedData.glassType && (
                            <div className="text-sm"><span className="font-bold">유리:</span> {parsedData.glassType}</div>
                        )}
                        {parsedData.openDirection && (
                            <div className="text-sm"><span className="font-bold">열림방향:</span> {parsedData.openDirection}</div>
                        )}
                        {parsedData.installLocation && (
                            <div className="text-sm"><span className="font-bold">위치:</span> {parsedData.installLocation}</div>
                        )}
                        {parsedData.memoAdd && (
                            <div className="text-xs text-slate-500 mt-2 pt-2 border-t">{parsedData.memoAdd}</div>
                        )}
                        {/* Validation Warnings */}
                        {warnings.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                                {warnings.map((warn, idx) => (
                                    <div key={idx} className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                        <AlertTriangle size={12} />
                                        {warn}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Transcript Toggle */}
                    <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="w-full text-xs text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1"
                    >
                        {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {showTranscript ? "원문 숨기기" : "원문 보기"}
                    </button>

                    {showTranscript && transcript && (
                        <div className="bg-slate-100 rounded-lg p-3 text-xs text-slate-700 border">
                            {transcript}
                        </div>
                    )}

                    {/* Apply Button */}
                    <button
                        onClick={handleApply}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-lg"
                    >
                        ✅ 폼에 적용하기
                    </button>
                </div>
            )}

            {/* Error State */}
            {state === "error" && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle size={20} />
                        <span className="font-bold">오류 발생</span>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700 border border-red-200">
                        {errorMessage}
                    </div>
                    <button
                        onClick={reset}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition"
                    >
                        다시 시도
                    </button>
                </div>
            )}

            {/* Helper Text */}
            <div className="text-[10px] text-slate-500 text-center pt-2 border-t border-indigo-100">
                예시: "가로 1230에 세로 2300, 자동문 3연동, 투명 유리, 현관"
            </div>
        </div>
    );
}
