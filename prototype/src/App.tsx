import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Map as MapIcon, Gift, Wifi, Battery, Navigation, QrCode } from 'lucide-react';

import { STAMP_LOCATIONS, REWARD_ITEMS } from './data';
import { StampLocation } from './types';

// Component imports
import Map from './components/Map';
import StampCard from './components/StampCard';
import RewardsList from './components/RewardsList';
import Scanner from './components/Scanner';
import { DetailBottomSheet, ListBottomSheet } from './components/BottomSheet';

export default function App() {
  // STATE MANAGEMENT
  // Starts with 2 collected stamps (Yang Sheng Temple and Youth Park Egret Lake) to fulfill the specification "2/5 Stamps" (40% completion)
  const [collectedIds, setCollectedIds] = useState<number[]>([1, 3]);
  const [claimedIds, setClaimedIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'card' | 'rewards'>('map');
  const [selectedLocation, setSelectedLocation] = useState<StampLocation | null>(null);
  const [isListSheetOpen, setIsListSheetOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [activeScanLocationId, setActiveScanLocationId] = useState<number | null>(null);

  // HANDLERS
  const handleSelectLocation = (loc: StampLocation) => {
    setSelectedLocation(loc);
  };

  const handleOpenScanner = (locId: number | null) => {
    setActiveScanLocationId(locId);
    setIsScannerOpen(true);
  };

  const handleStampCollected = (locId: number) => {
    if (!collectedIds.includes(locId)) {
      setCollectedIds((prev) => [...prev, locId]);
    }
  };

  const handleClaimReward = (rewardId: number) => {
    if (!claimedIds.includes(rewardId)) {
      setClaimedIds((prev) => [...prev, rewardId]);
    }
  };

  // Allows clicking on StampCard slots to center on map
  const handleSelectAndNavigateToMap = (loc: StampLocation) => {
    setSelectedLocation(loc);
    setActiveTab('map');
  };

  // Render Page Content based on tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'map':
        return (
          <Map
            locations={STAMP_LOCATIONS}
            collectedIds={collectedIds}
            onSelectLocation={handleSelectLocation}
            selectedLocationId={selectedLocation?.id || null}
            onOpenListSheet={() => setIsListSheetOpen(true)}
            onOpenScanner={handleOpenScanner}
          />
        );
      case 'card':
        return (
          <StampCard
            locations={STAMP_LOCATIONS}
            collectedIds={collectedIds}
            onSelectAndNavigate={handleSelectAndNavigateToMap}
          />
        );
      case 'rewards':
        return (
          <RewardsList
            locations={STAMP_LOCATIONS}
            rewardItems={REWARD_ITEMS}
            collectedIds={collectedIds}
            claimedIds={claimedIds}
            onClaimReward={handleClaimReward}
          />
        );
      default:
        return null;
    }
  };

  // Overall Adventure progress stats
  const totalCount = STAMP_LOCATIONS.filter((loc) => !loc.noStamp).length;
  const collectedCount = collectedIds.length;
  const progressPercent = Math.round((collectedCount / totalCount) * 100);

  return (
    <div className="relative min-h-screen w-full bg-[#F0F2F5] flex items-center justify-center p-0 sm:p-4 md:p-8 font-sans overflow-hidden select-none">
      
      {/* DECORATIVE BACKGROUND BLUR BLOBS */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#FF8C00]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-12 left-24 w-72 h-72 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 bg-[#FF8C00]/4 rounded-full blur-3xl pointer-events-none" />

      {/* HORIZONTAL FLEXBOX CONTAINER FOR DESKTOP VIEWS */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-10 relative z-10 w-full max-w-6xl">
        
        {/* PHONE FRAME LAYOUT: Seamlessly becomes full-bleed on mobile devices */}
        <div
          id="phone-wrapper"
          className="w-full h-screen sm:max-w-[390px] sm:h-[820px] bg-white rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col border-[8px] border-white ring-1 ring-black/5 shrink-0"
          style={{
            borderRadius: '48px',
          }}
        >
          {/* SIMULATED PHONE STATUS BAR (Battery, Clock, Wifi, Camera Notch) */}
          <div className="h-9 bg-white/95 backdrop-blur-sm px-8 flex items-center justify-between shrink-0 select-none z-30 border-b border-gray-50/50">
            <span className="text-xs font-bold text-gray-800">15:14</span>
            
            {/* Simulated Dynamic Camera Island / Dynamic Island Cutout */}
            <div className="w-24 h-4 bg-black rounded-full absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full absolute right-3" />
            </div>

            <div className="flex items-center gap-1.5 text-gray-800">
              <Wifi className="w-3.5 h-3.5 text-gray-800" />
              <span className="text-[9px] font-bold tracking-tight">5G</span>
              <Battery className="w-4 h-4 text-gray-800" />
            </div>
          </div>

          {/* FLOATING PROGRESS OVERLAY CARD (Top of Map Screen ONLY) */}
          {activeTab === 'map' && (
            <div className="absolute top-13 left-4 right-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-[24px] shadow-sm border border-black/5 flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-gray-800">加蚋仔商圈冒險進度</span>
                <span className="text-xs font-bold text-[#FF8C00]">{collectedCount}/{totalCount} 已收集</span>
              </div>

              {/* Micro Linear Progress bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA333] transition-all duration-800 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* MAIN ROUTER CANVAS WITH ROUTE TRANSITION EFFECTS */}
          <div className="flex-1 flex flex-col relative overflow-hidden bg-[#FAFBFB]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="flex-1 flex flex-col overflow-hidden h-full"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* BOTTOM GLOBAL NAVIGATION BAR */}
          {/* Active color is #FF8C00, no background fill, keeping clean and flat */}
          <div className="h-20 bg-white border-t border-gray-100 flex items-center justify-around px-4 pb-2 shrink-0 z-30 select-none">
            {/* 1. STAMP CARD TAB */}
            <button
              onClick={() => setActiveTab('card')}
              className={`flex flex-col items-center gap-1 py-1 px-4 transition-all duration-300 ${
                activeTab === 'card' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Award className="w-5 h-5 stroke-[2.5]" />
              <span className="text-[10px] font-extrabold tracking-tight">集章卡</span>
            </button>

            {/* 2. EXPLORE MAP TAB */}
            <button
              onClick={() => setActiveTab('map')}
              className={`flex flex-col items-center gap-1 py-1 px-4 transition-all duration-300 ${
                activeTab === 'map' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <MapIcon className="w-5 h-5 stroke-[2.5]" />
              <span className="text-[10px] font-extrabold tracking-tight">探索地圖</span>
            </button>

            {/* 3. REWARDS REDEEM TAB */}
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex flex-col items-center gap-1 py-1 px-4 transition-all duration-300 ${
                activeTab === 'rewards' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Gift className="w-5 h-5 stroke-[2.5]" />
              <span className="text-[10px] font-extrabold tracking-tight">獎項兌換</span>
            </button>
          </div>

          {/* SLIDING DETAIL DRAWER (Map bottom sheet) */}
          <DetailBottomSheet
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            isCollected={selectedLocation ? collectedIds.includes(selectedLocation.id) : false}
            onStartScanning={(locId) => handleOpenScanner(locId)}
          />

          {/* SLIDING STAMP LOCATIONS LIST DRAWER */}
          <ListBottomSheet
            isOpen={isListSheetOpen}
            onClose={() => setIsListSheetOpen(false)}
            locations={STAMP_LOCATIONS}
            collectedIds={collectedIds}
            onSelectLocation={handleSelectLocation}
          />

          {/* FULL CAMERA / VIEWPORT SCANNER SCREEN OVERLAY */}
          <AnimatePresence>
            {isScannerOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex flex-col"
              >
                <Scanner
                  locations={STAMP_LOCATIONS}
                  activeScanLocationId={activeScanLocationId}
                  onClose={() => {
                    setIsScannerOpen(false);
                    setActiveScanLocationId(null);
                  }}
                  onStampCollected={handleStampCollected}
                  collectedIds={collectedIds}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
