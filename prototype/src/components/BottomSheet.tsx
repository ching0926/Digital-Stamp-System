import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Navigation, QrCode, CheckCircle2, MapPin, Clock, Phone, Sparkles } from 'lucide-react';
import { StampLocation } from '../types';

interface DetailBottomSheetProps {
  location: StampLocation | null;
  onClose: () => void;
  isCollected: boolean;
  onStartScanning: (locId: number) => void;
}

export function DetailBottomSheet({
  location,
  onClose,
  isCollected,
  onStartScanning,
}: DetailBottomSheetProps) {
  if (!location) return null;

  const [showNavToast, setShowNavToast] = React.useState(false);
  const [heightState, setHeightState] = React.useState<'half' | 'full'>('half');

  React.useEffect(() => {
    if (location) {
      setHeightState('half');
    }
  }, [location]);

  React.useEffect(() => {
    if (showNavToast) {
      const timer = setTimeout(() => {
        setShowNavToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showNavToast]);

  return (
    <AnimatePresence>
      <div className="absolute inset-x-0 top-0 bottom-20 z-40 pointer-events-none">
        {/* Semi-transparent backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/30 pointer-events-auto"
        />

        {/* Sliding Bottom Sheet */}
        <motion.div
          initial={{ y: '100%', height: '50%' }}
          animate={{ y: 0, height: heightState === 'half' ? '50%' : '85%' }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.1, bottom: 0.5 }}
          onDragEnd={(event, info) => {
            const swipeThreshold = 50;
            if (info.offset.y < -swipeThreshold) {
              setHeightState('full');
            } else if (info.offset.y > swipeThreshold) {
              if (heightState === 'full') {
                setHeightState('half');
              } else {
                onClose();
              }
            }
          }}
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col pointer-events-auto z-50"
          style={{ borderRadius: '24px 24px 0 0' }}
        >
          {/* Simulated In-app Navigation Banner Popup */}
          <AnimatePresence>
            {showNavToast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-12 left-4 right-4 z-50 bg-gray-950/95 text-white p-3.5 rounded-[20px] shadow-lg flex items-center gap-3 border border-white/10"
              >
                <div className="w-8 h-8 rounded-full bg-[#FF8C00] flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4 text-white fill-white animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-extrabold text-[#FF8C00]">GPS 導航引導已啟動</p>
                  <p className="text-[10px] text-gray-200 mt-0.5 truncate leading-tight">規劃至 {location.name}...</p>
                </div>
                <button
                  onClick={() => setShowNavToast(false)}
                  className="text-[10px] bg-white/10 px-2.5 py-1 rounded-[8px] hover:bg-white/20 transition-all font-bold"
                >
                  好
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decorative Drag Handle */}
          <div 
            onClick={() => setHeightState(heightState === 'half' ? 'full' : 'half')}
            className="w-full flex justify-center py-3 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors shrink-0"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors z-20"
            style={{ borderRadius: '24px' }}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 pb-24">
            {/* Top Full-bleed Image */}
            <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
              <img
                src={location.imgUrl}
                alt={location.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {/* Type tag on image */}
              <div className="absolute left-4 bottom-4 bg-[#FF8C00] text-white text-xs font-bold px-3 py-1.5 rounded-[12px] shadow-sm">
                {location.type}
              </div>
            </div>

            {/* Title & Navigation Row */}
            <div className="p-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">{location.name}</h2>
                  <p className="text-sm font-semibold text-[#FF8C00] mt-1 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>{location.title}</span>
                  </p>
                </div>
                
                {/* Navigation Button */}
                <button
                  onClick={() => {
                    setShowNavToast(true);
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-orange-50 hover:bg-orange-100 text-[#FF8C00] transition-colors rounded-[24px]"
                  style={{ borderRadius: '24px' }}
                  title="導航"
                >
                  <Navigation className="w-5 h-5" />
                  <span className="text-[10px] font-bold mt-1">導航</span>
                </button>
              </div>

              {/* Address, Phone, Hours */}
              <div className="mt-5 space-y-2.5 text-xs text-gray-600 border-t border-b border-gray-100 py-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{location.address}</span>
                </div>
                {location.hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>開放時間：{location.hours}</span>
                  </div>
                )}
                {location.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>聯絡電話：{location.phone}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-5">
                <h3 className="text-sm font-bold text-gray-800">探索此地</h3>
                <p className="text-xs text-gray-600 leading-relaxed mt-2 bg-gray-50 p-4 rounded-[24px]">
                  {location.description}
                </p>
              </div>

              {/* Local Specialty */}
              <div className="mt-4">
                <h3 className="text-sm font-bold text-gray-800">私房亮點</h3>
                <p className="text-xs text-gray-600 leading-relaxed mt-2 bg-orange-50/50 p-4 rounded-[24px] border border-orange-100/40">
                  {location.specialty}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Fixed Action Button CTA */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
            {location.noStamp ? (
              <div className="w-full h-14 bg-orange-50/50 text-[#FF8C00] font-bold rounded-[24px] flex items-center justify-center gap-2 border border-orange-100/55 text-xs">
                <span>此景點無須集章，歡迎前往探索！</span>
              </div>
            ) : isCollected ? (
              <div className="w-full h-14 bg-emerald-50 text-emerald-700 font-bold rounded-[24px] flex items-center justify-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>已成功集章！</span>
              </div>
            ) : (
              <button
                onClick={() => onStartScanning(location.id)}
                className="w-full h-14 bg-[#FF8C00] hover:bg-[#E07B00] active:scale-98 text-white font-bold rounded-[24px] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,140,0,0.25)] transition-all pointer-events-auto"
                style={{ borderRadius: '24px' }}
              >
                <QrCode className="w-5 h-5" />
                <span>掃碼集章</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface ListBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  locations: StampLocation[];
  collectedIds: number[];
  onSelectLocation: (loc: StampLocation) => void;
}

export function ListBottomSheet({
  isOpen,
  onClose,
  locations,
  collectedIds,
  onSelectLocation,
}: ListBottomSheetProps) {
  if (!isOpen) return null;

  const [heightState, setHeightState] = React.useState<'half' | 'full'>('half');

  React.useEffect(() => {
    if (isOpen) {
      setHeightState('half');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      <div className="absolute inset-x-0 top-0 bottom-20 z-40 pointer-events-none">
        {/* Semi-transparent backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/20 pointer-events-auto"
        />

        {/* Sliding Bottom Sheet */}
        <motion.div
          initial={{ y: '100%', height: '50%' }}
          animate={{ y: 0, height: heightState === 'half' ? '50%' : '80%' }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 230 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.1, bottom: 0.5 }}
          onDragEnd={(event, info) => {
            const swipeThreshold = 50;
            if (info.offset.y < -swipeThreshold) {
              setHeightState('full');
            } else if (info.offset.y > swipeThreshold) {
              if (heightState === 'full') {
                setHeightState('half');
              } else {
                onClose();
              }
            }
          }}
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col pointer-events-auto z-50"
          style={{ borderRadius: '24px 24px 0 0' }}
        >
          {/* Decorative Drag Handle */}
          <div 
            onClick={() => setHeightState(heightState === 'half' ? 'full' : 'half')}
            className="w-full flex justify-center py-3 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors shrink-0"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Header Row */}
          <div className="px-6 py-4 flex justify-between items-center border-b border-gray-50">
            <h2 className="text-base font-bold text-gray-900">加蚋仔點位清單 ({collectedIds.length}/{locations.filter((l) => !l.noStamp).length})</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0"
              style={{ borderRadius: '16px' }}
              title="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {locations.map((loc) => {
              const isCollected = collectedIds.includes(loc.id);
              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    onSelectLocation(loc);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-orange-50/40 rounded-[24px] cursor-pointer transition-all border border-gray-100 hover:border-orange-100/60 active:scale-99"
                  style={{ borderRadius: '24px' }}
                >
                  <div className="flex items-center gap-3">
                    {/* Tiny visual card thumbnail */}
                    <div className="w-11 h-11 rounded-[16px] overflow-hidden bg-gray-200 shrink-0">
                      <img
                        src={loc.imgUrl}
                        alt={loc.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-gray-900 truncate">{loc.name}</h3>
                      <p className="text-[10px] text-[#FF8C00] font-medium mt-0.5 truncate">{loc.title}</p>
                    </div>
                  </div>

                  {/* Status label as requested (Green "Collected" or Gray "Not visited") */}
                  {!loc.noStamp ? (
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                        isCollected
                          ? 'text-[#10B981] bg-emerald-50'
                          : 'text-gray-400 bg-gray-100'
                      }`}
                      style={{ borderRadius: '12px' }}
                    >
                      {isCollected ? '已收集' : '去集章'}
                    </span>
                  ) : (
                    <div className="w-[60px]" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
