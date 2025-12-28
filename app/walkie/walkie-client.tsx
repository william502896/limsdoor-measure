"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";

type Props = { roomId: string; displayName: string };

type PeerInfo = { peerId: string; name?: string; connected: boolean };

const ICE_SERVERS: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

// Persistent ID helper
function makeId() {
    const KEY = "walkie_device_id_v1";
    try {
        const saved = localStorage.getItem(KEY);
        if (saved) return saved;

        // @ts-ignore
        const newId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem(KEY, newId);
        return newId;
    } catch {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}

export default function WalkieTalkie({ roomId, displayName }: Props) {
    const supabase = useMemo(() => createSupabaseBrowser(), []);
    const myId = useMemo(() => makeId(), []);
    const channelName = useMemo(() => `walkie:${roomId}`, [roomId]);

    const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting");
    const [errorMsg, setErrorMsg] = useState("");
    const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
    const [talking, setTalking] = useState(false);

    // Audio State
    const [micGranted, setMicGranted] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [volume, setVolume] = useState(0); // For VU Meter
    const [showSettings, setShowSettings] = useState(false);

    // Devices
    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedMicId, setSelectedMicId] = useState<string>("");
    const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>("");

    // Refs
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pcMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const remoteAudioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const volumeIntervalRef = useRef<any>(null);

    // --- Audio Logic ---

    // VU Meter Logic
    const startVolumeMeter = (stream: MediaStream) => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            src.connect(analyser);
            analyserRef.current = analyser;

            if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            volumeIntervalRef.current = setInterval(() => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                setVolume(avg); // 0-255
            }, 100);
        } catch (e) {
            console.warn("Volume meter init error:", e);
        }
    };

    // Safe Mic Init
    const initMic = async (deviceId?: string) => {
        try {
            // Stop previous tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }

            const constraints: MediaStreamConstraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    deviceId: deviceId ? { exact: deviceId } : undefined
                },
                video: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            stream.getAudioTracks().forEach((t) => (t.enabled = false)); // Mute initially (PTT)

            setMicGranted(true);
            startVolumeMeter(stream);

            // Refresh device list after permission
            refreshDevices();

            // Update existing connections with new track
            pcMapRef.current.forEach((pc) => {
                const senders = pc.getSenders();
                const audioSender = senders.find(s => s.track?.kind === 'audio');
                if (audioSender) {
                    audioSender.replaceTrack(stream.getAudioTracks()[0]);
                } else {
                    pc.addTrack(stream.getAudioTracks()[0], stream);
                }
            });

            return true;
        } catch (e) {
            console.warn("Mic init failed:", e);
            setMicGranted(false);
            return false;
        }
    };

    const refreshDevices = async () => {
        try {
            const devs = await navigator.mediaDevices.enumerateDevices();
            setInputDevices(devs.filter(d => d.kind === 'audioinput'));
            setOutputDevices(devs.filter(d => d.kind === 'audiooutput'));
        } catch { }
    };

    // Push-to-Talk Logic
    const applyTalkState = (isTalking: boolean) => {
        const stream = localStreamRef.current;
        if (!stream) return;
        stream.getAudioTracks().forEach((t) => (t.enabled = isTalking));
    };


    // --- Output Handling ---
    const ensureRemoteAudioEl = (peerId: string) => {
        let el = remoteAudioElsRef.current.get(peerId);
        if (!el) {
            el = document.createElement("audio");
            el.autoplay = true;
            // @ts-ignore
            el.playsInline = true;
            document.body.appendChild(el);

            // Apply selected speaker if possible
            if (selectedSpeakerId && (el as any).setSinkId) {
                (el as any).setSinkId(selectedSpeakerId).catch(() => { });
            }

            remoteAudioElsRef.current.set(peerId, el);
        }
        return el;
    };

    const destroyRemoteAudioEl = (peerId: string) => {
        const el = remoteAudioElsRef.current.get(peerId);
        if (el) {
            try {
                el.srcObject = null;
                el.remove();
            } catch { }
            remoteAudioElsRef.current.delete(peerId);
        }
    };

    // Change Speaker
    const handleSpeakerChange = async (deviceId: string) => {
        setSelectedSpeakerId(deviceId);
        // Update all existing elements
        for (const el of remoteAudioElsRef.current.values()) {
            if ((el as any).setSinkId) {
                try { await (el as any).setSinkId(deviceId); } catch (e) { console.error(e) }
            }
        }
    };

    // Change Mic
    const handleMicChange = (deviceId: string) => {
        setSelectedMicId(deviceId);
        initMic(deviceId);
    };


    // Unlock Mobile Audio
    const enableAudio = () => {
        remoteAudioElsRef.current.forEach(el => {
            el.play().catch(() => { });
        });
        setAudioEnabled(true);
    };


    // --- WebRTC Logic (Signaling) ---
    const setPeerConnected = (peerId: string, connected: boolean, name?: string) => {
        setPeers((prev) => ({
            ...prev,
            [peerId]: { peerId, connected, name: name ?? prev[peerId]?.name },
        }));
    };

    const removePeer = (peerId: string) => {
        setPeers((prev) => {
            const c = { ...prev };
            delete c[peerId];
            return c;
        });
        destroyRemoteAudioEl(peerId);
    };

    const shouldInitiate = (remoteId: string) => myId < remoteId;

    const createPeerConnection = async (remoteId: string) => {
        const existing = pcMapRef.current.get(remoteId);
        if (existing) return existing;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        const local = localStreamRef.current;
        if (local) local.getTracks().forEach((track) => pc.addTrack(track, local));

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                channelRef.current?.send({ type: "broadcast", event: "ice", payload: { from: myId, to: remoteId, candidate: ev.candidate } });
            }
        };

        pc.onconnectionstatechange = () => {
            const st = pc.connectionState;
            if (st === "connected") setPeerConnected(remoteId, true);
            if (st === "failed" || st === "closed") setPeerConnected(remoteId, false);
        };

        pc.ontrack = (ev) => {
            const audioEl = ensureRemoteAudioEl(remoteId);
            audioEl.srcObject = ev.streams[0];
            audioEl.play().catch(e => {
                console.warn("Autoplay blocked:", e);
                setAudioEnabled(false);
            });
            setPeerConnected(remoteId, true);
        };

        pcMapRef.current.set(remoteId, pc);
        return pc;
    };

    const closePeerConnection = (remoteId: string) => {
        const pc = pcMapRef.current.get(remoteId);
        if (pc) { try { pc.close(); } catch { } pcMapRef.current.delete(remoteId); }
        destroyRemoteAudioEl(remoteId);
        removePeer(remoteId);
    };

    const makeOfferTo = async (remoteId: string) => {
        const pc = await createPeerConnection(remoteId);
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        channelRef.current?.send({ type: "broadcast", event: "offer", payload: { from: myId, fromName: displayName, to: remoteId, sdp: offer } });
    };

    // --- Init Effect ---
    useEffect(() => {
        let alive = true;

        const start = async () => {
            setStatus("connecting");
            setErrorMsg("");
            await initMic(); // Default mic

            try {
                const ch = supabase.channel(channelName, { config: { presence: { key: myId }, broadcast: { self: false } } });
                channelRef.current = ch;

                // Presence
                ch.on("presence", { event: "sync" }, () => {
                    const state = ch.presenceState();
                    setPeers(prev => {
                        const next: any = {};
                        Object.keys(state).forEach(k => {
                            if (k === myId) return;
                            next[k] = { peerId: k, connected: prev[k]?.connected ?? false, name: (state[k] as any[])[0]?.name };
                        });
                        return next;
                    });
                });

                ch.on("presence", { event: "join" }, async ({ key, newPresences }) => {
                    if (!alive || key === myId) return;
                    setPeerConnected(String(key), false, (newPresences[0] as any)?.name);
                    if (shouldInitiate(String(key))) await makeOfferTo(String(key));
                });

                ch.on("presence", { event: "leave" }, ({ key }) => closePeerConnection(String(key)));

                // Signaling
                ch.on("broadcast", { event: "offer" }, async ({ payload }) => {
                    if (payload.to !== myId) return;
                    const pc = await createPeerConnection(payload.from);
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    ch.send({ type: "broadcast", event: "answer", payload: { from: myId, to: payload.from, sdp: answer } });
                });

                ch.on("broadcast", { event: "answer" }, async ({ payload }) => {
                    if (payload.to !== myId) return;
                    const pc = pcMapRef.current.get(payload.from);
                    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                });

                ch.on("broadcast", { event: "ice" }, async ({ payload }) => {
                    if (payload.to !== myId) return;
                    const pc = pcMapRef.current.get(payload.from);
                    if (pc) pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => { });
                });

                ch.subscribe(async (st) => {
                    if (st === "SUBSCRIBED") {
                        await ch.track({ name: displayName, joinedAt: new Date().toISOString() });
                        const state = ch.presenceState();
                        Object.keys(state).forEach(async k => { if (k !== myId && shouldInitiate(k)) await makeOfferTo(k) });
                        setStatus("ready");
                    }
                });

            } catch (e: any) {
                setStatus("error");
                setErrorMsg(e?.message);
            }
        };

        start();
        return () => {
            alive = false;
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
            if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
            if (audioContextRef.current) audioContextRef.current.close().catch(() => { });
            pcMapRef.current.forEach(pc => pc.close());
            channelRef.current?.unsubscribe();
        };
    }, [channelName, displayName, myId]); // eslint-disable-line

    useEffect(() => applyTalkState(talking), [talking]);

    const onlineCount = Object.keys(peers).length;
    const connectedCount = Object.values(peers).filter((p) => p.connected).length;
    const canTalk = status === "ready" && micGranted;

    return (
        <div style={{ maxWidth: 720, margin: "0 auto", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 16 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>무전기</div>
                    <div style={{ opacity: 0.75, marginTop: 4 }}>
                        <b>{displayName}</b> <span style={{ fontSize: 12 }}>({roomId})</span>
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div onClick={() => setShowSettings(!showSettings)} style={{ cursor: "pointer", fontSize: 12, textDecoration: "underline", marginBottom: 4 }}>
                        ⚙️ {showSettings ? "설정 닫기" : "오디오 설정"}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>온라인 {onlineCount}명</div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div style={{ marginTop: 12, padding: 12, background: "#f5f5f5", borderRadius: 8, fontSize: 13 }}>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>마이크 선택</label>
                        <select
                            style={{ width: "100%", padding: 6 }}
                            value={selectedMicId}
                            onChange={e => handleMicChange(e.target.value)}
                        >
                            {inputDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 4)}`}</option>
                            ))}
                        </select>
                        {/* VU Meter */}
                        <div style={{ marginTop: 6, height: 6, background: "#ddd", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(volume, 100)}%`, background: "#4caf50", transition: "width 0.1s" }} />
                        </div>
                        <div style={{ fontSize: 10, textAlign: 'right', color: '#666' }}>마이크 볼륨 테스트</div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>스피커 선택 (지원 시)</label>
                        <select
                            style={{ width: "100%", padding: 6 }}
                            value={selectedSpeakerId}
                            onChange={e => handleSpeakerChange(e.target.value)}
                            disabled={outputDevices.length === 0}
                        >
                            {outputDevices.length === 0 && <option>기본 스피커 (변경 불가)</option>}
                            {outputDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 4)}`}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Error Box */}
            {status === "error" && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#ffebee", color: "#c62828", fontSize: 13 }}>
                    <b>오류:</b> {errorMsg}
                </div>
            )}

            {/* Audio Unlock Button */}
            {!audioEnabled && status === "ready" && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                    <button
                        onClick={enableAudio}
                        style={{ padding: "8px 16px", background: "#ef6c00", color: "#fff", border: "none", borderRadius: 999, fontWeight: 800, fontSize: 13 }}
                    >
                        🔊 소리 켜기 (터치)
                    </button>
                </div>
            )}

            {/* Talk Button */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
                <button
                    disabled={!canTalk}
                    onMouseDown={() => canTalk && setTalking(true)}
                    onMouseUp={() => canTalk && setTalking(false)}
                    onMouseLeave={() => canTalk && setTalking(false)}
                    onTouchStart={(e) => { e.preventDefault(); canTalk && setTalking(true); }}
                    onTouchEnd={(e) => { e.preventDefault(); canTalk && setTalking(false); }}
                    style={{
                        width: 220,
                        height: 220,
                        borderRadius: 999,
                        border: "none",
                        cursor: !canTalk ? "not-allowed" : "pointer",
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#fff",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                        background: !canTalk ? "#999" : talking ? "#d32f2f" : "#111",
                        transform: talking ? "scale(0.98)" : "scale(1)",
                        userSelect: "none",
                        touchAction: "none",
                        position: "relative"
                    }}
                >
                    {!micGranted && status === "ready" ? "듣기 전용" : talking ? "말하는 중" : "누르고 말하기"}

                    {!micGranted && (
                        <div style={{ position: "absolute", bottom: 40, width: "100%", fontSize: 11, opacity: 0.8 }}>
                            마이크 권한 필요
                        </div>
                    )}
                </button>
            </div>

            {/* Peers List */}
            <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>접속자 ({onlineCount})</div>
                {onlineCount === 0 ? (
                    <div style={{ opacity: 0.7, fontSize: 13 }}>대기 중...</div>
                ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                        {Object.values(peers).map((p) => (
                            <div key={p.peerId} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, border: "1px solid #eee" }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{p.name || "익명"}</div>
                                    <div style={{ opacity: 0.6, fontSize: 11 }}>{p.connected ? "연결됨" : "연결 중..."}</div>
                                </div>
                                <div style={{ width: 8, height: 8, borderRadius: 99, background: p.connected ? "#4caf50" : "#ffc107", alignSelf: "center" }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
