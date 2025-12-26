"use client";

import React, { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudSnow, Moon, Wind } from "lucide-react";

type WeatherData = {
    temp: number;
    code: number; // WMO Weather interpretation codes
};

export default function LiveWeather() {
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Seoul coordinates: 37.5665, 126.9780
                const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true");
                const data = await res.json();
                if (data.current_weather) {
                    setWeather({
                        temp: data.current_weather.temperature,
                        code: data.current_weather.weathercode
                    });
                }
            } catch (e) {
                console.error("Weather fetch failed", e);
            }
        };

        fetchWeather();
        // Refresh every 10 minutes
        const interval = setInterval(fetchWeather, 600000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (code: number) => {
        // Simple mapping for Open-Meteo WMO codes
        if (code === 0) return <Sun size={16} className="text-orange-500 animate-[spin_10s_linear_infinite]" />;
        if (code >= 1 && code <= 3) return <Cloud size={16} className="text-slate-500" />;
        if (code >= 51 && code <= 67) return <CloudRain size={16} className="text-blue-500" />;
        if (code >= 71 && code <= 77) return <CloudSnow size={16} className="text-sky-300" />;
        if (code >= 95) return <Wind size={16} className="text-indigo-500" />;
        return <Sun size={16} className="text-orange-400" />;
    };

    const handleClick = () => {
        window.open("https://weather.naver.com", "_blank");
    };

    if (!weather) return null;

    return (
        <button
            onClick={handleClick}
            className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm hover:bg-white hover:text-blue-600 transition border border-slate-200"
            title="현재 서울 날씨"
        >
            {getIcon(weather.code)}
            <span className="text-sm font-bold text-slate-700">
                {weather.temp}°C
            </span>
        </button>
    );
}
