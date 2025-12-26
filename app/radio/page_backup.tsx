"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { Home, Mic, Users, Settings, Volume2, MicOff, Signal, RefreshCw, LogOut, MessageSquare, Send, X } from 'lucide-react';
import { supabase, isStub } from '@/app/lib/supabase';
import { useSearchParams } from 'next/navigation';

interface RadioUser {
    id: string; // db id
    name: string;
    role: string;
    status: string; // db status (APPROVED etc)
    online_at?: string;
    is_speaking?: boolean;
    type?: 'member' | 'guest'; // specific for frontend
}

interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: number;
}

function RadioApp() {
    // URL Params (for invites)
    const searchParams = useSearchParams();

    // UI State
    const [isTalking, setIsTalking] = useState(false);
    const [statusText, setStatusText] = useState("대기 상태 (Standby)");
    const [volume, setVolume] = useState(100);
    const [isLoading, setIsLoading] = useState(false);

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Lobby State
    const [isLobby, setIsLobby] = useState(true);
    const [channelId, setChannelId] = useState("");
    const [nickname, setNickname] = useState("");

    // Connection Status
    const [connectionStatus, setConnectionStatus] = useState("DISCONNECTED");
    const [micPermissionState, setMicPermissionState] = useState<PermissionState | "unknown">("unknown");

    // Data State
    const [allUsers, setAllUsers] = useState<RadioUser[]>([]);
    const [onlinePresence, setOnlinePresence] = useState<Set<string>>(new Set());
    const [speakingUser, setSpeakingUser] = useState<string | null>(null);

    // Refs for Audio & Channel
    const channelRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);

    // My Identity
    const [myIdentity, setMyIdentity] = useState<{ id: string, name: string, role: string }>({ id: "", name: "", role: "guest" });

    // 0. Initial Mount
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.permissions) {
            navigator.permissions.query({ name: 'microphone' as any }).then(p => {
                setMicPermissionState(p.state);
                p.onchange = () => setMicPermissionState(p.state);
            });
        }
        const inviteChannel = searchParams.get('channel');
        if (inviteChannel) setChannelId(inviteChannel);

        const fetchDirectory = async () => {
            const { data } = await supabase.from('radio_users').select('*').eq('status', 'APPROVED');
            if (data) {
                setAllUsers(data as any);
                const storedId = localStorage.getItem('radio_user_id');
                if (storedId) {
                    const me = data.find((u: any) => u.id === storedId);
                    if (me) {
                        setMyIdentity({ id: me.id, name: me.name, role: me.role });
                        setNickname(me.name);
                    }
                }
            }
        };
        fetchDirectory();
    }, [searchParams]);

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isChatOpen]);

    // 1. Join Channel Action
    const joinChannel = async () => {
        if (!channelId.trim()) return alert("채널 이름을 입력해주세요.");
        if (!nickname.trim()) return alert("닉네임을 입력해주세요.");

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } else if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
        } catch (e) {
            console.error("AudioContext Init Failed", e);
        }

        let finalIdentity = { ...myIdentity };
        if (!finalIdentity.id) {
            finalIdentity = {
                id: "guest-" + Math.random().toString(36).substring(2, 10),
                name: nickname,
                role: "guest"
            };
            setMyIdentity(finalIdentity);
        } else {
            finalIdentity.name = nickname;
            setMyIdentity(finalIdentity);
        }

        setIsLobby(false);
        setIsLoading(true);
        // Reset Logic
        setMessages([]);
    };

    // 2. Realtime Connection
    useEffect(() => {
        if (isLobby || !myIdentity.id || !channelId) return;

        setConnectionStatus("CONNECTING");

        const channel = supabase.channel(`radio-${channelId}`, {
            config: {
                presence: {
                    key: myIdentity.id,
                },
            },
        });

        channelRef.current = channel;

        // Diagnostic: Check if we can even reach the server via HTTP (REST)
        const checkConnection = async () => {
            try {
                const { error } = await supabase.from('radio_users').select('id').limit(1);
                if (error) {
                    console.error("REST Check Failed:", error);
                    // Ignore RLS errors (42501) as that means server IS reachable
                    if (error.code === '42501' || error.code === 'PGRST103') {
                        console.log("Server is reachable (RLS active)");
                        return;
                    }

                    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING";
                    alert(`서버 연결 실패 (REST)\n\n에러: ${error.message}\n\n현재 설정된 URL:\n${url}\n\n(URL에 오타가 있거나, 서버가 일시정지 상태일 수 있습니다.)`);
                } else {
                    console.log("REST Check Passed. Server is active.");
                }
            } catch (e: any) {
                console.error("Network Error:", e);
                const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING";
                alert(`네트워크/통신 오류 (Failed to fetch)\n\n현재 앱이 접속 시도 중인 URL:\n${url}\n\n1. URL이 정확한지 확인하세요 (오타/공백).\n2. AdBlock이 켜져있다면 꺼주세요.\n3. 터미널을 껐다가 다시 켜보세요 (npm run dev 재시작).`);
            }
        };
        checkConnection();

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const onlineIds = new Set(Object.keys(state));
                setOnlinePresence(onlineIds);
            })
            // Voice Status
            .on('broadcast', { event: 'voice-status' }, (payload: any) => {
                const { user_id, status } = payload.payload;
                if (user_id !== myIdentity.id) {
                    if (status === 'talking') {
                        setSpeakingUser(user_id);
                        setStatusText("누군가 말하는 중...");
                    } else {
                        setSpeakingUser(null);
                        setStatusText("대기 상태 (Standby)");
                    }
                }
            })
            // Chat Message
            .on('broadcast', { event: 'chat-message' }, (payload: any) => {
                const msg = payload.payload as ChatMessage;
                setMessages(prev => [...prev, msg]);
            })
            // Audio Chunk
            .on('broadcast', { event: 'audio-chunk' }, async (payload: any) => {
                const { user_id, chunk } = payload.payload;
                if (user_id === myIdentity.id) return;

                try {
                    if (!audioContextRef.current) return;

                    const binaryString = window.atob(chunk);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
                    const source = audioContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;

                    const gainNode = audioContextRef.current.createGain();
                    gainNode.gain.value = volume / 100;
                    source.connect(gainNode);
                    gainNode.connect(audioContextRef.current.destination);

                    const now = audioContextRef.current.currentTime;
                    const startTime = Math.max(now, nextStartTimeRef.current);
                    source.start(startTime);
                    nextStartTimeRef.current = startTime + audioBuffer.duration;

                } catch (e) {
                    console.error("Audio Decode Error", e);
                }
            })
            .subscribe(async (status: string) => {
                setConnectionStatus(status);
                setIsLoading(false);
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: myIdentity.id,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            channel.unsubscribe();
            setOnlinePresence(new Set());
            setSpeakingUser(null);
        };
    }, [isLobby, myIdentity, channelId, volume]);

    // 3. PTT Logic
    const startRecording = async () => {
        if (speakingUser && speakingUser !== myIdentity.id) {
            alert("다른 사용자가 말하고 있습니다.");
            return;
        }

        try {
            if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("이 브라우저에서는 마이크를 사용할 수 없습니다. (HTTPS 필요)");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            channelRef.current?.send({
                type: 'broadcast',
                event: 'voice-status',
                payload: { user_id: myIdentity.id, status: 'talking' }
            });

            setIsTalking(true);
            setStatusText("송신 중...");

            mediaRecorder.ondataavailable = async (e) => {
                if (e.data.size > 0) {
                    const reader = new FileReader();
                    reader.readAsDataURL(e.data);
                    reader.onloadend = () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        channelRef.current?.send({
                            type: 'broadcast',
                            event: 'audio-chunk',
                            payload: { user_id: myIdentity.id, chunk: base64Audio }
                        });
                    };
                }
            };
            mediaRecorder.start(100);

        } catch (err) {
            console.error("Mic Access Error:", err);
            alert("마이크 사용 권한이 필요합니다.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        setIsTalking(false);
        setStatusText("대기 중");

        channelRef.current?.send({
            type: 'broadcast',
            event: 'voice-status',
            payload: { user_id: myIdentity.id, status: 'idle' }
        });
    };

    // Chat Logic
    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const msg: ChatMessage = {
            id: Date.now().toString(),
            userId: myIdentity.id,
            userName: myIdentity.name,
            text: inputText.trim(),
            timestamp: Date.now()
        };

        // Send Broadcast
        await channelRef.current?.send({
            type: 'broadcast',
            event: 'chat-message',
            payload: msg
        });

        // Add to local (Broadcast sometimes doesn't reflect to sender depending on config, but here reliable to append local for immediate feedback)
        setMessages(prev => [...prev, msg]);
        setInputText("");
    };

    // Helper: Leave & Invite
    const leaveChannel = () => {
        if (channelRef.current) channelRef.current.unsubscribe();
        setIsLobby(true);
        setConnectionStatus("DISCONNECTED");
    };

    const handleInvite = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('channel', channelId);
        const shareUrl = url.toString();

        if (navigator.share) {
            navigator.share({ title: `LIMSDOOR Radio - ${channelId}`, text: `${channelId} 채널 초대`, url: shareUrl }).catch(console.error);
        } else {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = shareUrl;
                textArea.style.position = "fixed"; textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus(); textArea.select();
                const successful = document.execCommand('copy');
                if (textArea.parentNode) textArea.parentNode.removeChild(textArea);
                if (successful) alert("초대 링크가 복사되었습니다!");
                else prompt("링크를 복사하세요:", shareUrl);
            } catch (err) { prompt("링크를 복사하세요:", shareUrl); }
        }
    };

    const getRenderedUsers = () => {
        const rendered = allUsers.map(u => ({ ...u, isOnline: onlinePresence.has(u.id), isSpeaking: speakingUser === u.id, type: 'member' }));
        onlinePresence.forEach(onlineId => {
            if (!allUsers.find(u => u.id === onlineId)) {
                rendered.push({
                    id: onlineId,
                    name: (onlineId === myIdentity.id) ? myIdentity.name : `손님 ${onlineId.slice(-4)}`,
                    role: 'guest',
                    status: 'online',
                    isOnline: true,
                    isSpeaking: speakingUser === onlineId,
                    type: 'guest'
                } as any);
            }
        });
        return rendered.filter(u => u.type === 'member' || u.isOnline).sort((a, b) => (Number(b.isOnline) - Number(a.isOnline)));
    };

    if (isLobby) {
        return (
            <div className="h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                <Signal size={64} className="text-indigo-500 mb-6" />
                <h1 className="text-3xl font-black text-white mb-2 tracking-widest">LIMSDOOR RADIO</h1>
                {isStub && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-xl mb-4 max-w-sm">
                        ⚠️ <b>서버 연결 불가</b><br />
                        .env.local 파일이 없거나 설정되지 않았습니다.<br />
                        다른 참가자와 통신할 수 없습니다.
                    </div>
                )}
                <div className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-4">
                    <div>
                        <label className="text-xs text-slate-500 font-bold ml-1 mb-2 block">채널 선택</label>
                        <div className="grid grid-cols-5 gap-2 mb-4">
                            {['1', '2', '3', '4', '5'].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setChannelId(`채널 ${num}`)}
                                    className={`aspect-square rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center
                                        ${channelId === `채널 ${num}`
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 ring-2 ring-indigo-400"
                                            : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <div className="text-center text-indigo-400 font-bold text-sm h-6">
                            {channelId ? `${channelId} 선택됨` : "채널을 선택하세요"}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold ml-1 mb-1 block">닉네임</label>
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="이름 입력" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition font-bold text-center" />
                    </div>
                    <button onClick={joinChannel} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-indigo-900/50 transition mt-2 active:scale-95">입장하기</button>

                    <div className="text-xs text-slate-500 text-left bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                        <b>🔍 문제 해결 가이드</b><br />
                        - <b>참가자 0명?</b> : 서버 연결이 안 된 상태입니다.<br />
                        - <b>초대 링크 오류?</b> : 상단 '서버 연결 불가' 메시지가 있는지 확인하세요.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden">
            {/* Stub Warning Overlay */}
            {isStub && (
                <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-xs font-bold p-1 text-center z-50">
                    오프라인 데모 모드 (서버 미연결)
                </div>
            )}

            <div className="h-16 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur z-50 pt-2 relative">
                <button onClick={leaveChannel} className="flex items-center gap-2 text-slate-400 hover:text-red-400 no-underline cursor-pointer">
                    <LogOut size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-black text-lg tracking-widest text-indigo-500">CH: {channelId}</span>
                    <span className={`text-[10px] font-bold ${connectionStatus === 'SUBSCRIBED' ? 'text-green-500' : 'text-orange-500'}`}>
                        {(() => {
                            switch (connectionStatus) {
                                case 'SUBSCRIBED': return '● 실시간 연결됨';
                                case 'TIMED_OUT': return '⚠ 연결 시간 초과 (프로젝트 일시정지됨?)';
                                case 'CHANNEL_ERROR': return '⚠ 채널 접속 오류';
                                case 'CLOSED': return '연결 종료됨';
                                case 'CONNECTING': return '연결 중...';
                                default: return connectionStatus;
                            }
                        })()}
                    </span>
                    {(connectionStatus === 'CHANNEL_ERROR') && (
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] text-red-300">서버 설정(SQL) 미적용됨</span>
                            <button
                                onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                                className="bg-red-600 hover:bg-red-700 text-[10px] px-3 py-1 rounded text-white mt-1 cursor-pointer shadow-lg z-50 animate-pulse"
                            >
                                ⚠ SQL 실행 필요 (클릭)
                            </button>
                        </div>
                    )}
                    {(connectionStatus === 'TIMED_OUT' || connectionStatus === 'CHANNEL_ERROR') && (
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-700 text-[10px] px-3 py-1 rounded text-white mt-1 animate-pulse cursor-pointer shadow-lg z-50"
                        >
                            ↻ 터치하여 재접속
                        </button>
                    )}

                </div>
                <div className="flex gap-4">
                    <button onClick={() => setIsChatOpen(true)} className="flex flex-col items-center text-slate-400 hover:text-white relative">
                        <MessageSquare size={20} />
                        {messages.length > 0 && !isChatOpen && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-slate-900"></span>
                        )}
                        <span className="text-[10px]">채팅</span>
                    </button>
                    <button onClick={handleInvite} className="flex flex-col items-center text-slate-400 hover:text-white">
                        <RefreshCw size={20} />
                        <span className="text-[10px]">초대</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative touch-none select-none">
                {isTalking && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-64 border-4 border-indigo-500/30 rounded-full animate-ping absolute"></div>
                        <div className="w-80 h-80 border-4 border-indigo-500/20 rounded-full animate-ping delay-75 absolute"></div>
                    </div>
                )}

                {speakingUser && speakingUser !== myIdentity.id && (
                    <div className="absolute top-24 flex flex-col items-center animate-bounce z-20">
                        <div className="w-20 h-20 rounded-full bg-green-500 border-4 border-slate-900 flex items-center justify-center text-3xl font-bold mb-2 shadow-xl text-white">
                            {(allUsers.find(u => u.id === speakingUser)?.name || "G").charAt(0)}
                        </div>
                        <div className="bg-slate-900/80 px-4 py-1 rounded-full backdrop-blur">
                            <span className="text-green-400 font-bold text-lg">
                                {allUsers.find(u => u.id === speakingUser)?.name || "누군가"}
                            </span>
                        </div>
                    </div>
                )}

                <div className={`mb-8 px-6 py-2 rounded-full font-bold text-lg flex items-center gap-3 transition-colors z-20
                    ${isTalking ? "bg-red-500 text-white animate-pulse" :
                        speakingUser ? "bg-green-600 text-white" : "bg-slate-800 text-slate-300"}`}>
                    <Signal size={18} />
                    {statusText}
                </div>

                <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                    className={`w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-100 transform active:scale-95 shadow-2xl z-20 outline-none select-none touch-none
                        ${isTalking
                            ? "bg-gradient-to-br from-red-500 to-red-700 shadow-red-900/50 scale-95 border-8 border-red-400"
                            : "bg-gradient-to-br from-indigo-600 to-slate-800 shadow-indigo-900/50 border-8 border-slate-700 hover:border-indigo-500"
                        }
                        ${speakingUser && speakingUser !== myIdentity.id ? "opacity-50 cursor-not-allowed grayscale" : ""}
                    `}
                    disabled={!!speakingUser && speakingUser !== myIdentity.id}
                >
                    {isTalking ? (
                        <>
                            <Mic size={64} className="text-white mb-2" />
                            <span className="text-xl font-black">TALKING</span>
                        </>
                    ) : (
                        <>
                            <div className="text-slate-400 text-xs font-bold mb-2 tracking-widest">HOLD TO TALK</div>
                            <MicOff size={48} className="text-slate-300 mb-2 opacity-50" />
                            <span className="text-2xl font-black text-white">PTT</span>
                        </>
                    )}
                </button>
            </div>

            <div className="bg-slate-950 border-t border-slate-800 p-6 z-10 safe-area-bottom">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-300 flex items-center gap-2">
                        <Users size={18} />
                        참가자 ({getRenderedUsers().filter(u => u.isOnline).length})
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Volume2 size={14} />
                        <input type="range" min="0" max="200" value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {getRenderedUsers().length > 0 ? getRenderedUsers().map(user => (
                        <div key={user.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border min-w-[150px] max-w-[200px] transition-all ${user.isSpeaking ? "bg-indigo-900/40 border-indigo-500 transform scale-105" : "bg-slate-900 border-slate-800 opacity-90"} ${!user.isOnline ? "opacity-40 grayscale" : ""}`}>
                            <div className="relative shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${user.isOnline ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-500"}`}>{user.name.charAt(0)}</div>
                                {user.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>}
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-sm font-bold text-white flex items-center gap-1 truncate">{user.name} {user.id === myIdentity.id && <span className="text-[10px] text-slate-400 shrink-0">(나)</span>}</div>
                                <div className="text-xs text-slate-500 font-mono truncate">{user.isSpeaking ? "말하는 중..." : user.role === 'guest' ? 'Guest' : user.role}</div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-slate-500 text-xs py-2">대기 중인 참가자가 없습니다.</div>
                    )}
                </div>
            </div>

            {/* CHAT DRAWER */}
            {isChatOpen && (
                <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                    <div className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800">
                        <span className="font-bold text-white flex items-center gap-2">
                            <MessageSquare size={20} className="text-indigo-500" />
                            채팅 ({messages.length})
                        </span>
                        <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white p-2">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.userId === myIdentity.id ? 'items-end' : 'items-start'}`}>
                                <div className="text-[10px] text-slate-500 mb-1 px-1">{msg.userName}</div>
                                <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm font-medium ${msg.userId === myIdentity.id ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="메시지를 입력하세요..."
                            className="flex-1 bg-slate-800 border-none rounded-full px-4 text-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <button onClick={sendMessage} className="p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 active:scale-95 transition">
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Ensure proper Suspense boundary for useSearchParams in Next.js App Router
export default function RadioPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-slate-900 text-white flex items-center justify-center">Loading Radio...</div>}>
            <RadioApp />
        </Suspense>
    );
}
