import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, List, QrCode, Compass } from 'lucide-react';
import { StampLocation } from '../types';

interface MarketMapProps {
  locations: StampLocation[];
  collectedIds: number[];
  marketMapUrl: string;
  onOpenListSheet: () => void;
  onOpenScanner?: (locId: number | null) => void;
}

export default function MarketMap({
  locations,
  collectedIds,
  marketMapUrl,
  onOpenListSheet,
  onOpenScanner,
}: MarketMapProps) {
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.map-control')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: panStart.current.x + dx,
      y: panStart.current.y + dy,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.map-control')) return;
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
      x: panStart.current.x + dx,
      y: panStart.current.y + dy,
    });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(5.0, prev + 0.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev - 0.5));
  };

  const handleResetLocation = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      id="map-viewport"
      ref={mapContainerRef}
      className="relative w-full h-full overflow-hidden select-none bg-gray-100"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUpOrLeave}
    >
      {/* STATIC MAP IMAGE CONTAINER */}
      <div
        className="absolute left-1/2 top-1/2 w-full h-full flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: 'center center',
        }}
      >
        {marketMapUrl ? (
          <img
            src={marketMapUrl}
            alt="市集平面圖"
            className="w-full h-full object-contain pointer-events-auto"
            draggable={false}
          />
        ) : (
          <div className="text-gray-400 font-bold">市集平面圖尚未上傳</div>
        )}
      </div>

      {/* MAP CONTROLS - FLOATING FABs (Right bottom) */}
      <div className="absolute right-4 bottom-5 flex flex-col gap-3 z-20 items-end">
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
        <button
          onClick={handleResetLocation}
          className="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50"
          title="重設地圖中心"
          style={{ borderRadius: '22px' }}
        >
          <Compass className="w-5 h-5 text-[#FF8C00]" />
        </button>

        <button
          onClick={handleZoomIn}
          className="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50"
          title="放大"
          style={{ borderRadius: '22px' }}
        >
          <ZoomIn className="w-5 h-5" />
        </button>

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
