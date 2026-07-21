import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Zap, CheckCircle, Info, Sparkles, AlertCircle } from 'lucide-react';
import { StampLocation } from '../types';

interface ScannerProps {
  locations: StampLocation[];
  activeScanLocationId: number | null;
  onClose: () => void;
  onStampCollected: (locId: number) => void;
  collectedIds: number[];
}

export default function Scanner({
  locations,
  activeScanLocationId,
  onClose,
  onStampCollected,
  collectedIds,
}: ScannerProps) {
  const [flashlight, setFlashlight] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stampLocations = locations.filter((l) => !l.noStamp);

  // Get current active location
  const activeLoc = stampLocations.find((l) => l.id === activeScanLocationId) || stampLocations[0];

  // Try to launch real camera stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: 'environment', // Request back camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        .then((stream) => {
          activeStream = stream;
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn('Real camera stream not available or permission denied:', err);
          setCameraBlocked(true);
        });
    } else {
      setCameraBlocked(true);
    }

    // Cleanup tracks on close
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle flashlight toggle
  const toggleFlashlight = async () => {
    setFlashlight((prev) => !prev);
    
    // Attempt real camera torch if browser supports it
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = track.getCapabilities() as any;
          if (capabilities && capabilities.torch) {
            await track.applyConstraints({
              advanced: [{ torch: !flashlight } as any],
            });
          }
        } catch (e) {
          // Standard browser restriction or no torch
        }
      }
    }
  };

  // Perform a simulated scan
  const handleSimulateScan = (locId: number) => {
    const loc = locations.find((l) => l.id === locId);
    if (!loc) return;

    if (collectedIds.includes(locId)) {
      setSuccessToast(`提醒：您之前已經收集過「${loc.name}」的印章囉！`);
      setTimeout(() => setSuccessToast(null), 3000);
      return;
    }

    // Trigger success feedback toast
    setSuccessToast(`集章成功！已收集 ${loc.name}`);
    
    // Play sound/vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Notify state manager to add the stamp
    onStampCollected(locId);

    // Automatically navigate back to map after showing toast
    setTimeout(() => {
      setSuccessToast(null);
      onClose();
    }, 2200);
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col justify-between overflow-hidden">
      {/* 1. MINT GREEN SUCCESS TOAST (Top overlay) */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-16 left-4 right-4 z-50 flex items-center gap-3 p-4 bg-[#ECFDF5] border border-[#10B981]/20 text-[#065F46] shadow-xl rounded-[24px]"
            style={{ borderRadius: '24px' }}
          >
            <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-white shrink-0">
              <CheckCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">集章成功！</p>
              <p className="text-xs text-[#047857] mt-0.5">{successToast}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. TOP NAV APP BAR */}
      <div className="relative h-16 px-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all"
          style={{ borderRadius: '24px' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-white tracking-wide">掃描集章條碼</span>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      {/* CAMERA VIEWPORT WITH BOX & GUIDELINE */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {cameraBlocked ? (
          /* Simulated camera canvas background (gorgeous tech layout) */
          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-gray-500 mb-4 animate-pulse">
              <Sparkles className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-sm text-gray-300 font-bold">虛擬相機已啟動</p>
            <p className="text-xs text-gray-500 max-w-[260px] leading-relaxed mt-2">
              偵測到目前處於網頁預覽環境。您可以使用下方「模擬測試面板」來完成集章體驗！
            </p>
          </div>
        ) : (
          /* Actual video element streaming the rear-camera feed */
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Ambient Darkened Mask Over Map */}
        <div className="absolute inset-0 pointer-events-none bg-black/40" />

        {/* 3. CENTERED BOUNDING BOX WITH ORANGE CORNERS & FLOATING SCANNING LINE */}
        <div className="absolute w-64 h-64 z-20 pointer-events-none flex items-center justify-center">
          {/* Scanning Box Corners */}
          {/* Top Left */}
          <div className="absolute left-0 top-0 w-8 h-8 border-t-4 border-l-4 border-[#FF8C00] rounded-tl-[16px]" />
          {/* Top Right */}
          <div className="absolute right-0 top-0 w-8 h-8 border-t-4 border-r-4 border-[#FF8C00] rounded-tr-[16px]" />
          {/* Bottom Left */}
          <div className="absolute left-0 bottom-0 w-8 h-8 border-b-4 border-l-4 border-[#FF8C00] rounded-bl-[16px]" />
          {/* Bottom Right */}
          <div className="absolute right-0 bottom-0 w-8 h-8 border-b-4 border-r-4 border-[#FF8C00] rounded-br-[16px]" />

          {/* Glowing Animated Laser Line */}
          <motion.div
            animate={{
              top: ['5%', '95%', '5%'],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute left-[3%] right-[3%] h-0.5 bg-gradient-to-r from-transparent via-[#FF8C00] to-transparent shadow-[0_0_12px_#FF8C00]"
          />

          {/* Subtext guiding focus */}
          <div className="absolute -bottom-10 whitespace-nowrap text-xs text-white bg-black/60 px-3 py-1.5 rounded-[12px] flex items-center gap-1.5 backdrop-blur-sm">
            <Info className="w-3.5 h-3.5 text-[#FF8C00]" />
            <span>請對準點位的 QR Code</span>
          </div>
        </div>
      </div>

      {/* 4. SIMULATION INTERFACE / FALLBACK CONTROL (Staged as a stylish sliding panel) */}
      <div className="relative z-30 px-6 pb-28 pt-4 bg-gradient-to-t from-black/90 via-black/80 to-transparent flex flex-col gap-4">
        {/* Helper info showing active target */}
        <div className="bg-white/10 rounded-[20px] p-3.5 border border-white/5 backdrop-blur-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">目標點位</span>
            <span className="text-sm font-extrabold text-white truncate block mt-0.5">{activeLoc.name}</span>
          </div>
          <button
            onClick={() => handleSimulateScan(activeLoc.id)}
            className="px-4 py-2 bg-[#FF8C00] hover:bg-[#E07B00] text-white text-xs font-bold rounded-[16px] transition-all flex items-center gap-1 shrink-0 shadow-[0_4px_12px_rgba(255,140,0,0.3)]"
            style={{ borderRadius: '16px' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>對焦掃描</span>
          </button>
        </div>

        {/* Collapsible Shortcut list to simulate other spots as well */}
        <div className="bg-black/40 rounded-[24px] p-3 border border-white/5">
          <p className="text-[10px] text-gray-400 font-bold px-2 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
            <span>開發測試快捷區：點擊下方按鈕直接完成集章</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {stampLocations.map((loc) => {
              const isCollected = collectedIds.includes(loc.id);
              return (
                <button
                  key={loc.id}
                  onClick={() => handleSimulateScan(loc.id)}
                  className={`px-2.5 py-1.5 rounded-[12px] text-[11px] font-bold text-left transition-colors truncate flex items-center justify-between ${
                    isCollected
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
                  }`}
                  style={{ borderRadius: '12px' }}
                >
                  <span className="truncate">{loc.name.replace('加蚋仔', '')}</span>
                  <span className="text-[9px] font-bold opacity-80 scale-90">
                    {isCollected ? '已集' : '集章'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Flashlight button (Half-transparent deep color circle) */}
        <div className="flex justify-center mt-2">
          <button
            onClick={toggleFlashlight}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              flashlight ? 'bg-white text-gray-900' : 'bg-black/60 text-white border border-white/10 hover:bg-black/80'
            }`}
            style={{ borderRadius: '28px' }}
            title="手電筒"
          >
            <Zap className={`w-6 h-6 ${flashlight ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
