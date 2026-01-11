
import React from 'react';

type Props = {
    yaw: number; setYaw: (v: number) => void;
    pitch: number; setPitch: (v: number) => void;
    roll: number; setRoll: (v: number) => void;
    scale: number; setScale: (v: number) => void;
    onReset: () => void;
    onPreset: (type: 'front' | 'side-left' | 'side-right') => void;
};

export default function RotationControls({ yaw, setYaw, pitch, setPitch, roll, setRoll, scale, setScale, onReset, onPreset }: Props) {

    const Slider = ({ label, val, min, max, set }: { label: string, val: number, min: number, max: number, set: (v: number) => void }) => (
        <div className="flex items-center gap-2 text-xs mb-1">
            <span className="w-8 text-slate-500 font-bold">{label}</span>
            <input
                type="range" min={min} max={max} step={1} value={val}
                onChange={e => set(Number(e.target.value))}
                className="flex-1 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
            <span className="w-6 text-right text-slate-700">{val}°</span>
        </div>
    );

    return (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 mt-2">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-900">3D 방향 조정</h3>
                <div className="flex gap-1">
                    <button onClick={() => onPreset('front')} className="px-2 py-0.5 text-[10px] bg-slate-100 rounded border border-slate-300">정면</button>
                    <button onClick={() => onPreset('side-left')} className="px-2 py-0.5 text-[10px] bg-slate-100 rounded border border-slate-300">측면L</button>
                    <button onClick={() => onPreset('side-right')} className="px-2 py-0.5 text-[10px] bg-slate-100 rounded border border-slate-300">측면R</button>
                    <button onClick={onReset} className="px-2 py-0.5 text-[10px] text-red-500 bg-red-50 rounded border border-red-200">초기화</button>
                </div>
            </div>

            <Slider label="좌우" val={yaw} min={-60} max={60} set={setYaw} />
            <Slider label="상하" val={pitch} min={-60} max={60} set={setPitch} />
            <Slider label="회전" val={roll} min={-45} max={45} set={setRoll} />

            <div className="flex items-center gap-2 text-xs mt-2 border-t border-slate-100 pt-2">
                <span className="w-8 text-slate-500 font-bold">크기</span>
                <input
                    type="range" min={0.5} max={2.0} step={0.05} value={scale}
                    onChange={e => setScale(Number(e.target.value))}
                    className="flex-1 h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="w-6 text-right text-slate-700">{Math.round(scale * 100)}%</span>
            </div>
        </div>
    );
}
