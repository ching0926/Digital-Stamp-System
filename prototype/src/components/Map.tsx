import React, { useState, useRef, useEffect } from 'react';
import { Compass, ZoomIn, ZoomOut, List, MapPin, Star, Leaf, Navigation, QrCode } from 'lucide-react';
import { StampLocation } from '../types';

interface MapProps {
  locations: StampLocation[];
  collectedIds: number[];
  onSelectLocation: (loc: StampLocation) => void;
  selectedLocationId: number | null;
  onOpenListSheet: () => void;
  onOpenScanner?: (locId: number | null) => void;
}

export default function Map({
  locations,
  collectedIds,
  onSelectLocation,
  selectedLocationId,
  onOpenListSheet,
  onOpenScanner,
}: MapProps) {
  const [zoom, setZoom] = useState<number>(1.1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: -40 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Center on a location smoothly
  const centerOnLocation = (loc: StampLocation, targetZoom = 1.4) => {
    if (!mapContainerRef.current) return;
    const containerWidth = mapContainerRef.current.clientWidth;
    const containerHeight = mapContainerRef.current.clientHeight;

    // The map canvas is 1000x1000.
    // Coordinates are out of 100 on each axis, so multiply by 10 to get canvas pixels.
    const mapX = loc.coordinates.x * 10;
    const mapY = loc.coordinates.y * 10;

    // We want the (mapX, mapY) to be at the center of the container.
    // In our style: top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
    // Which means (500, 500) of the canvas is initially centered.
    // So the offset from canvas center is (500 - mapX, 500 - mapY) * zoom.
    const offsetX = (500 - mapX) * targetZoom;
    // We adjust Y slightly upwards to leave room for the bottom sheet!
    const offsetY = (500 - mapY) * targetZoom - 60;

    setZoom(targetZoom);
    setPan({ x: offsetX, y: offsetY });
  };

  // When selectedLocationId changes externally, center map on it
  useEffect(() => {
    if (selectedLocationId !== null) {
      const loc = locations.find((l) => l.id === selectedLocationId);
      if (loc) {
        centerOnLocation(loc, 1.4);
      }
    }
  }, [selectedLocationId]);

  // Touch & Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Avoid dragging when clicking on interactive pins/buttons
    if ((e.target as HTMLElement).closest('.map-control') || (e.target as HTMLElement).closest('.map-pin')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    // Limit bounds to keep map reasonably centered
    setPan({
      x: Math.max(-450, Math.min(450, panStart.current.x + dx)),
      y: Math.max(-450, Math.min(450, panStart.current.y + dy)),
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.map-control') || (e.target as HTMLElement).closest('.map-pin')) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStart.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    setPan({
      x: Math.max(-450, Math.min(450, panStart.current.x + dx)),
      y: Math.max(-450, Math.min(450, panStart.current.y + dy)),
    });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2.0, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.7, prev - 0.2));
  };

  const handleResetLocation = () => {
    // Center map of South Wanhua
    setZoom(1.1);
    setPan({ x: 0, y: -40 });
  };

  return (
    <div
      id="map-viewport"
      ref={mapContainerRef}
      className="relative w-full h-full overflow-hidden select-none bg-[#F4F6F4]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUpOrLeave}
    >
      {/* MAP CANVAS GRID */}
      <div
        className="absolute w-[1000px] h-[1000px] left-1/2 top-1/2"
        style={{
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: 'center center',
        }}
      >
        {/* Beautiful Custom SVG Styled Map background */}
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full shadow-[0_10px_50px_rgba(0,0,0,0.05)] rounded-[48px] overflow-hidden"
          style={{ backgroundColor: '#EDF1EE' }}
        >
          {/* Grids / Textures */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8E4" strokeWidth="1" />
            </pattern>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0d2417" floodOpacity="0.06" />
            </filter>
          </defs>
          <rect width="1000" height="1000" fill="url(#grid)" />

          {/* XINDIAN RIVER (新店溪) - South & West border */}
          <path
            d="M -50 420 C 150 480, 200 680, 250 820 C 300 900, 480 980, 1050 1020 L 1050 1100 L -50 1100 Z"
            fill="#C2E2F7"
            stroke="#96CEF2"
            strokeWidth="4"
          />
          {/* River label */}
          <text x="120" y="600" fill="#60A2D1" fontSize="18" fontWeight="bold" fontFamily="sans-serif" transform="rotate(35, 120, 600)" opacity="0.6">
            新店溪
          </text>

          {/* GREEN SPACE: Youth Park (青年公園) */}
          <path
            d="M 680 550 C 720 520, 920 560, 960 620 C 980 720, 940 850, 840 880 C 740 900, 650 800, 660 700 C 660 620, 650 580, 680 550 Z"
            fill="#D2EDD5"
            stroke="#A3DBAB"
            strokeWidth="3"
          />
          {/* Egret Lake (鷺鷥湖) in Youth Park */}
          <path
            d="M 780 720 C 810 700, 850 710, 860 740 C 865 765, 830 790, 800 780 C 770 770, 760 740, 780 720 Z"
            fill="#A8DFF2"
            stroke="#80CCE6"
            strokeWidth="2"
          />
          <text x="800" y="755" fill="#1C658C" fontSize="11" fontFamily="sans-serif" className="pointer-events-none">
            鷺鷥湖
          </text>
          <text x="860" y="660" fill="#2E7D32" fontSize="16" fontWeight="bold" fontFamily="sans-serif" className="pointer-events-none opacity-80">
            青年公園
          </text>

          {/* OTHER MINOR GREEN SPACES (社區公園/校園) */}
          <rect x="180" y="240" width="100" height="80" rx="15" fill="#E2F2E4" stroke="#CBE6D0" strokeWidth="2" />
          <text x="210" y="285" fill="#52825A" fontSize="11" fontFamily="sans-serif" className="pointer-events-none">
            東園國小
          </text>
          <rect x="520" y="780" width="120" height="90" rx="20" fill="#E2F2E4" stroke="#CBE6D0" strokeWidth="2" />
          <text x="555" y="830" fill="#52825A" fontSize="11" fontFamily="sans-serif" className="pointer-events-none">
            華江高中
          </text>
          <rect x="420" y="180" width="140" height="70" rx="15" fill="#E2F2E4" stroke="#CBE6D0" strokeWidth="2" />
          <text x="465" y="220" fill="#52825A" fontSize="11" fontFamily="sans-serif" className="pointer-events-none">
            雙園國中
          </text>

          {/* MAIN STREETS AND ROADS (道路系統) */}
          {/* 西藏路 (Tibet Rd) - Horizontal at top */}
          <path d="M -50 150 L 1050 150" fill="none" stroke="#FFFFFF" strokeWidth="26" strokeLinecap="round" />
          <path d="M -50 150 L 1050 150" fill="none" stroke="#E9EBE9" strokeWidth="2" strokeDasharray="6 6" />
          
          {/* 萬大路 (Wanda Rd) - Main Diagonal from top down */}
          <path d="M 550 -50 C 480 300, 380 600, 260 1050" fill="none" stroke="#FFFFFF" strokeWidth="32" strokeLinecap="round" />
          <path d="M 550 -50 C 480 300, 380 600, 260 1050" fill="none" stroke="#E9EBE9" strokeWidth="2" strokeDasharray="8 8" />

          {/* 東園街 (Dongyuan St) - Historic winding street */}
          <path d="M 120 200 C 220 220, 320 380, 480 500 C 600 600, 720 750, 780 880" fill="none" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round" />
          
          {/* 青年路 (Youth Rd) - Surrounding park */}
          <path d="M 680 550 C 620 580, 560 650, 590 780 C 610 880, 680 940, 840 920" fill="none" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round" />

          {/* 興寧街 / 寶興街 */}
          <path d="M 100 350 L 500 350" fill="none" stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" />
          <path d="M 300 150 L 300 600" fill="none" stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" />

          {/* STREET NAME LABELS */}
          <text x="350" y="142" fill="#788F7E" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
            西藏路
          </text>
          <text x="470" y="270" fill="#788F7E" fontSize="12" fontWeight="bold" fontFamily="sans-serif" transform="rotate(-68, 470, 270)">
            萬大路
          </text>
          <text x="250" y="320" fill="#788F7E" fontSize="12" fontWeight="bold" fontFamily="sans-serif" transform="rotate(25, 250, 320)">
            東園街
          </text>
          <text x="635" y="880" fill="#788F7E" fontSize="12" fontWeight="bold" fontFamily="sans-serif" transform="rotate(-15, 635, 880)">
            青年路
          </text>

          {/* Stylized small decorative elements (Trees and Buildings) */}
          {/* Small green trees */}
          <g fill="#A3DBAB" className="opacity-60 pointer-events-none">
            <circle cx="150" cy="270" r="10" />
            <circle cx="165" cy="265" r="8" />
            <circle cx="740" cy="580" r="12" />
            <circle cx="760" cy="590" r="10" />
            <circle cx="880" cy="800" r="14" />
            <circle cx="895" cy="790" r="10" />
            <circle cx="580" cy="810" r="11" />
            <circle cx="480" cy="210" r="9" />
          </g>

          {/* Small grey buildings */}
          <g fill="#DBE1DC" stroke="#C5CBC6" strokeWidth="1" className="opacity-50 pointer-events-none">
            <rect x="230" y="420" width="30" height="40" rx="4" />
            <rect x="270" y="430" width="25" height="30" rx="4" />
            <rect x="380" y="290" width="40" height="35" rx="4" />
            <rect x="580" y="360" width="35" height="45" rx="4" />
            <rect x="640" y="380" width="30" height="30" rx="4" />
            <rect x="680" y="310" width="35" height="50" rx="4" />
            <rect x="360" y="650" width="45" height="40" rx="4" />
          </g>
        </svg>

        {/* INTERACTIVE MARKERS (PINS) Overlayed inside the scale-container */}
        {locations.map((loc) => {
          const isCollected = collectedIds.includes(loc.id);
          const isSelected = selectedLocationId === loc.id;
          
          return (
            <div
              key={loc.id}
              className="absolute map-pin transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{
                left: `${loc.coordinates.x}%`,
                top: `${loc.coordinates.y}%`,
              }}
              onClick={() => onSelectLocation(loc)}
            >
              {/* Pin ripple/pulse effect if selected */}
              {isSelected && (
                <div className="absolute inset-0 w-12 h-12 bg-[#FF8C00]/20 rounded-full animate-ping -left-[10px] -top-[10px]" />
              )}

              {/* Pin Card Layout */}
              <div className="flex flex-col items-center">
                {/* Pin Container */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform duration-300 ${
                    isSelected ? 'scale-110 ring-4 ring-[#FF8C00]/20' : 'hover:scale-105'
                  } ${
                    loc.noStamp
                      ? 'bg-white border-[#10B981] text-[#10B981]'
                      : isCollected
                        ? 'bg-[#FF8C00] border-white text-white'
                        : 'bg-white border-blue-400 text-blue-500'
                  }`}
                  style={{ borderRadius: '24px' }}
                >
                  {loc.noStamp ? (
                    <Leaf className="w-5 h-5 fill-current" />
                  ) : isCollected ? (
                    <Star className="w-5 h-5 fill-current" />
                  ) : (
                    <MapPin className="w-5 h-5 fill-current" />
                  )}
                </div>

                {/* Stamp Status text badge directly underneath (as requested for Collected) */}
                {!loc.noStamp && (
                  <div
                    className={`mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-tight shadow-[0_2px_8px_rgba(0,0,0,0.02)] border ${
                      isCollected
                        ? 'bg-orange-50 border-orange-200 text-[#FF8C00]'
                        : 'bg-blue-50 border-blue-200 text-blue-500'
                    }`}
                    style={{ borderRadius: '12px' }}
                  >
                    {isCollected ? '已收集' : '去集章'}
                  </div>
                )}

                {/* Location Title Label above/below pin */}
                <div
                  className={`absolute -bottom-8 whitespace-nowrap bg-gray-900/90 text-white text-[10px] px-2 py-1 rounded-[12px] pointer-events-none transition-opacity duration-300 ${
                    isSelected ? 'opacity-100' : 'opacity-0 md:opacity-40'
                  }`}
                >
                  {loc.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAP CONTROLS - FLOATING FABs (Right bottom) */}
      <div className="absolute right-4 bottom-5 flex flex-col gap-3 z-20 items-end">
        {/* Main Scan Stamp QR Button - High contrast, gorgeous orange circle, with subtle glowing animation */}
        <button
          onClick={() => onOpenScanner?.(null)}
          className="map-control w-14 h-14 bg-gradient-to-br from-[#FF8C00] to-[#FFA333] text-white rounded-full shadow-[0_8px_24px_rgba(255,140,0,0.4)] border-2 border-white flex items-center justify-center active:scale-95 transition-all hover:brightness-105"
          title="掃描集章"
          style={{ borderRadius: '28px' }}
        >
          <QrCode className="w-7 h-7" />
        </button>
      </div>

      {/* MAP CONTROLS - TOP RIGHT UTILITIES */}
      <div className="absolute right-4 top-[100px] flex flex-col gap-2.5 z-20">
        {/* Reset / Center Location */}
        <button
          onClick={handleResetLocation}
          className="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50"
          title="重設地圖中心"
          style={{ borderRadius: '22px' }}
        >
          <Compass className="w-5 h-5 text-[#FF8C00]" />
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50"
          title="放大"
          style={{ borderRadius: '22px' }}
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50"
          title="縮小"
          style={{ borderRadius: '22px' }}
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* STAMP LIST FAB (Left bottom) */}
      <div className="absolute left-4 bottom-5 z-20">
        <button
          onClick={onOpenListSheet}
          className="map-control w-14 h-14 bg-white text-gray-700 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-2 border-white flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50"
          title="點位清單"
          style={{ borderRadius: '28px' }}
        >
          <List className="w-7 h-7 text-[#FF8C00]" />
        </button>
      </div>
    </div>
  );
}
