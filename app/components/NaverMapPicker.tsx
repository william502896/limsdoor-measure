"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, MapPin, Navigation, Search, Loader2, AlertTriangle, Check } from "lucide-react";

type NaverMapPickerProps = {
    onConfirm: (data: { address: string; lat: number; lng: number }) => void;
    onClose: () => void;
    initialAddress?: string;
};

type AddressCandidate = {
    roadAddress: string;
    jibunAddress: string;
    lat: number;
    lng: number;
    distance?: number;
};

declare global {
    interface Window {
        naver: any;
    }
}

export default function NaverMapPicker({ onConfirm, onClose, initialAddress = "" }: NaverMapPickerProps) {
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const mapDivRef = useRef<HTMLDivElement>(null);

    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<string>("");
    const [selectedLat, setSelectedLat] = useState<number | null>(null);
    const [selectedLng, setSelectedLng] = useState<number | null>(null);

    const [searchQuery, setSearchQuery] = useState(initialAddress);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<AddressCandidate[]>([]);
    const [showResults, setShowResults] = useState(false);

    const [gpsWarning, setGpsWarning] = useState<string>("");
    const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Load Naver Maps Script
    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_NCP_MAPS_KEY_ID;

        if (!clientId) {
            console.error("NEXT_PUBLIC_NCP_MAPS_KEY_ID is not set");
            return;
        }

        // Check if already loaded
        if (window.naver && window.naver.maps) {
            initializeMap();
            return;
        }

        const script = document.createElement("script");
        script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
        script.onload = () => {
            setIsMapLoaded(true);
            initializeMap();
        };
        script.onerror = () => {
            console.error("Failed to load Naver Maps script");
        };
        document.head.appendChild(script);

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    const initializeMap = () => {
        if (!mapDivRef.current || !window.naver) return;

        const defaultCenter = new window.naver.maps.LatLng(37.5665, 126.9780); // Seoul
        const mapOptions = {
            center: defaultCenter,
            zoom: 15,
            zoomControl: true,
            zoomControlOptions: {
                position: window.naver.maps.Position.TOP_RIGHT,
            },
        };

        mapRef.current = new window.naver.maps.Map(mapDivRef.current, mapOptions);

        // Map click event
        window.naver.maps.Event.addListener(mapRef.current, "click", (e: any) => {
            const lat = e.coord.y;
            const lng = e.coord.x;
            handleLocationSelect(lat, lng);
        });

        setIsMapLoaded(true);
    };

    const handleLocationSelect = async (lat: number, lng: number) => {
        // Update marker
        if (markerRef.current) {
            markerRef.current.setMap(null);
        }

        markerRef.current = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(lat, lng),
            map: mapRef.current,
        });

        // Get address from coordinates
        setIsLoadingAddress(true);
        setSelectedLat(lat);
        setSelectedLng(lng);

        try {
            const res = await fetch(`/api/naver/reverse-geocoding?lat=${lat}&lng=${lng}`);
            const data = await res.json();

            if (data.ok && data.address) {
                setSelectedAddress(data.address);
                checkDistanceWarning(lat, lng);
            } else {
                setSelectedAddress("주소를 찾을 수 없습니다");
            }
        } catch (error) {
            console.error("Reverse geocoding error:", error);
            setSelectedAddress("주소 조회 실패");
        } finally {
            setIsLoadingAddress(false);
        }
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("이 브라우저는 위치 서비스를 지원하지 않습니다.");
            return;
        }

        if (!window.naver?.maps) {
            alert("지도가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        setIsLoadingAddress(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                setGpsLocation({ lat, lng });

                // Move map center
                if (mapRef.current && window.naver?.maps) {
                    mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
                    mapRef.current.setZoom(17);
                }

                handleLocationSelect(lat, lng);
            },
            (error) => {
                setIsLoadingAddress(false);
                let message = "위치 정보를 가져올 수 없습니다.";
                if (error.code === 1) {
                    message = "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.";
                }
                alert(message);
            }
        );
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setShowResults(false);

        try {
            const res = await fetch(`/api/naver/geocoding?query=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();

            if (data.ok && data.addresses && data.addresses.length > 0) {
                setSearchResults(data.addresses);
                setShowResults(true);
            } else {
                alert("검색 결과가 없습니다. 다른 주소로 시도해보세요.");
                setSearchResults([]);
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            alert("주소 검색 중 오류가 발생했습니다.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectCandidate = (candidate: AddressCandidate) => {
        if (!window.naver?.maps) {
            alert("지도가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        const lat = candidate.lat;
        const lng = candidate.lng;

        // Move map
        if (mapRef.current) {
            mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
            mapRef.current.setZoom(17);
        }

        handleLocationSelect(lat, lng);
        setShowResults(false);
        setSearchQuery(candidate.roadAddress || candidate.jibunAddress);
    };

    const checkDistanceWarning = (lat: number, lng: number) => {
        if (!gpsLocation) return;

        const distance = calculateDistance(gpsLocation.lat, gpsLocation.lng, lat, lng);

        if (distance > 300) {
            setGpsWarning(`현재 위치에서 ${Math.round(distance)}m 떨어져 있습니다. 실측 위치가 맞는지 확인하세요.`);
        } else {
            setGpsWarning("");
        }
    };

    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lng2 - lng1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    const handleConfirm = () => {
        if (!selectedAddress || selectedLat === null || selectedLng === null) {
            alert("위치를 먼저 선택해주세요.");
            return;
        }

        onConfirm({
            address: selectedAddress,
            lat: selectedLat,
            lng: selectedLng,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <MapPin className="text-indigo-600" size={24} />
                        <h2 className="text-lg font-bold">지도에서 위치 선택</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b bg-slate-50">
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                            placeholder="주소를 입력하세요 (예: 서울시 강남구 테헤란로 123)"
                            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            검색
                        </button>
                        <button
                            onClick={handleCurrentLocation}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            title="현재 위치"
                        >
                            <Navigation size={18} />
                            현재위치
                        </button>
                    </div>

                    {/* Search Results */}
                    {showResults && searchResults.length > 0 && (
                        <div className="mt-2 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {searchResults.map((result, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectCandidate(result)}
                                    className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b last:border-0"
                                >
                                    <div className="font-bold text-sm">{result.roadAddress || result.jibunAddress}</div>
                                    {result.roadAddress && result.jibunAddress && (
                                        <div className="text-xs text-slate-500">{result.jibunAddress}</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Map Container */}
                <div className="flex-1 relative min-h-[400px]">
                    <div ref={mapDivRef} className="absolute inset-0"></div>

                    {!isMapLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                            <div className="text-center">
                                <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                                <p className="text-slate-600">지도 로딩 중...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected Info & Confirm */}
                <div className="p-4 border-t bg-slate-50">
                    {isLoadingAddress && (
                        <div className="flex items-center gap-2 text-indigo-600 mb-2">
                            <Loader2 className="animate-spin" size={18} />
                            <span className="text-sm">주소 조회 중...</span>
                        </div>
                    )}

                    {selectedAddress && !isLoadingAddress && (
                        <div className="mb-3">
                            <div className="flex items-start gap-2">
                                <Check className="text-green-600 mt-1" size={18} />
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800">{selectedAddress}</p>
                                    <p className="text-xs text-slate-500">
                                        위도: {selectedLat?.toFixed(6)}, 경도: {selectedLng?.toFixed(6)}
                                    </p>
                                </div>
                            </div>

                            {gpsWarning && (
                                <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                    <AlertTriangle className="text-amber-600 mt-0.5" size={16} />
                                    <p className="text-xs text-amber-700">{gpsWarning}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-100"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedAddress || selectedLat === null}
                            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                        >
                            주소 확정
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
