
import { useState, useRef, useCallback } from "react";

export type RecorderStatus = "idle" | "recording" | "paused" | "processing" | "analyzing";

export function useAudioRecorder() {
    const [status, setStatus] = useState<RecorderStatus>("idle");
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setStatus("recording");
        } catch (error) {
            console.error("Failed to start recording:", error);
            alert("마이크 권한이 필요합니다.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            setStatus("processing");
        }
    }, []);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.pause();
            setStatus("paused");
        }
    }, []);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
            mediaRecorderRef.current.resume();
            setStatus("recording");
        }
    }, []);

    const reset = useCallback(() => {
        setAudioBlob(null);
        setStatus("idle");
        chunksRef.current = [];
    }, []);

    return {
        status,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        reset,
        audioBlob,
        setRecStatus: setStatus, // Allow manual status override (e.g. for mock analysis)
    };
}
