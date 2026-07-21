import React from 'react';
import { motion } from 'motion/react';
import { Star, MapPin, CheckCircle2, Sparkles } from 'lucide-react';
import { StampLocation } from '../types';

interface StampCardProps {
  locations: StampLocation[];
  collectedIds: number[];
  onSelectAndNavigate: (loc: StampLocation) => void;
}

export default function StampCard({
  locations,
  collectedIds,
  onSelectAndNavigate,
}: StampCardProps) {
  const stampLocations = locations.filter((loc) => !loc.noStamp);
  const totalCount = stampLocations.length;
  const collectedCount = collectedIds.length;
  const percentage = Math.round((collectedCount / totalCount) * 100);
  const isAllCompleted = collectedCount === totalCount;

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* 1. PROGRESS SUMMARY CARD */}
      <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">集章進度</span>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              {percentage}% <span className="text-sm font-bold text-gray-500">已完成</span>
            </h2>
          </div>
          <div className="bg-orange-50 text-[#FF8C00] font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-orange-100/50">
            <CheckCircle2 className="w-4 h-4" />
            <span>{collectedCount} / {totalCount} 站點</span>
          </div>
        </div>

        {/* Custom Linear Progress Bar (Bright Orange) */}
        <div className="mt-4 w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA333]"
          />
        </div>

        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
          {collectedCount === 0 ? (
            <span> 精彩的旅程要開始囉！一起出發收集今天的快樂吧 ✨</span>
          ) : isAllCompleted ? (
            <span> 恭喜🎉 已完成全部 {totalCount} 個點位收集 ，快去「獎項兌換」領獎！下次再一起去其他地方探險吧 ✨</span>
          ) : (
            <span> 衝啊！你已經成功收集了 {collectedCount} 點！繼續前進，再一下下就集滿囉 🚀</span>
          )}
        </p>
      </div>

      {/* 2. TASK GRID SYSTEM (3x2 網格佈局) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-gray-800">電子集章卡</h3>
          <span className="text-[10px] font-bold text-[#FF8C00] bg-orange-50 px-2 py-0.5 rounded-[8px]">
            點擊卡片看地圖
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Slots 1 to 6: Stamp locations */}
          {stampLocations.map((loc, index) => {
            const isCollected = collectedIds.includes(loc.id);

            return (
              <motion.div
                key={loc.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectAndNavigate(loc)}
                className={`flex flex-col items-center justify-between p-3 aspect-square rounded-[24px] border transition-all text-center cursor-pointer ${
                  isCollected
                    ? 'bg-white border-[#FF8C00] shadow-[0_4px_16px_rgba(255,140,0,0.06)]'
                    : 'bg-gray-50/50 border-gray-100'
                }`}
                style={{ borderRadius: '24px' }}
              >
                {/* Visual slot state index */}
                <span className={`text-[9px] font-extrabold ${isCollected ? 'text-[#FF8C00]' : 'text-gray-400'}`}>
                  0{index + 1}
                </span>

                {/* Stamp Icon Container */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isCollected
                      ? 'bg-[#FF8C00] text-white shadow-md shadow-[#FF8C00]/15'
                      : 'border border-dashed border-gray-300 text-gray-300 bg-white'
                  }`}
                  style={{ borderRadius: '24px' }}
                >
                  {isCollected ? (
                    <Star className="w-6 h-6 fill-current animate-pulse" />
                  ) : (
                    <MapPin className="w-5 h-5 fill-current" />
                  )}
                </div>

                {/* Label name */}
                <span
                  className={`text-[10px] font-extrabold tracking-tight truncate w-full ${
                    isCollected ? 'text-gray-900 font-extrabold' : 'text-gray-400'
                  }`}
                >
                  {loc.name.replace('加蚋仔', '')}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 3. FOOTER INFO */}
      <div className="bg-gradient-to-br from-gray-50 to-orange-50/20 p-5 rounded-[24px] border border-gray-100/80 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100/50">
            <Sparkles className="w-4 h-4 text-[#FF8C00] fill-[#FF8C00]/10" />
          </div>
          <div>
            <h3 className="font-extrabold text-[12px] text-gray-800 tracking-tight">如何搜集印章？</h3>
            <p className="text-[9px] text-gray-400 font-medium">簡單三步驟，輕鬆解鎖好禮</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 relative">
          {/* Timeline Connector Line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-gray-200/60" />

          {/* Step 1 */}
          <div className="flex items-start gap-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-[#FF8C00]">1</span>
            </div>
            <div className="bg-white p-3 rounded-[16px] border border-gray-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex-1">
              <p className="text-[11px] font-bold text-gray-800">尋找點位</p>
              <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                點擊「集章卡」或「探索地圖」上的景點圖示。
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-[#FF8C00]">2</span>
            </div>
            <div className="bg-white p-3 rounded-[16px] border border-gray-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex-1">
              <p className="text-[11px] font-bold text-gray-800">導航出發</p>
              <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                畫面跳出小卡後，點擊右側的「導航」前往現場。
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-[#FF8C00]">3</span>
            </div>
            <div className="bg-white p-3 rounded-[16px] border border-gray-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex-1">
              <p className="text-[11px] font-bold text-gray-800">掃碼集章</p>
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                抵達現場後，點擊地圖上的「掃碼集章」或右下角「QR CODE」開啟相機，掃描現場條碼即可成功集章！
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
