import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Coffee, FileText, Ticket, CheckCircle2, Award, X, Sparkles, AlertTriangle } from 'lucide-react';
import { StampLocation, RewardItem } from '../types';

interface RewardsListProps {
  locations: StampLocation[];
  rewardItems: RewardItem[];
  collectedIds: number[];
  claimedIds: number[];
  onClaimReward: (rewardId: number) => void;
}

export default function RewardsList({
  locations,
  rewardItems,
  collectedIds,
  claimedIds,
  onClaimReward,
}: RewardsListProps) {
  const [activeTicket, setActiveTicket] = useState<RewardItem | null>(null);
  const [showConfirmVerify, setShowConfirmVerify] = useState<boolean>(false);

  const stampLocations = locations.filter((loc) => !loc.noStamp);
  const totalLocations = stampLocations.length;
  const collectedCount = collectedIds.length;
  const percentage = Math.round((collectedCount / totalLocations) * 100);

  // Helper to get matching icons
  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'postcard':
        return <FileText className="w-6 h-6 text-[#FF8C00]" />;
      case 'coffee':
        return <Coffee className="w-6 h-6 text-[#FF8C00]" />;
      case 'bag':
        return <Gift className="w-6 h-6 text-[#FF8C00]" />;
      default:
        return <Ticket className="w-6 h-6 text-[#FF8C00]" />;
    }
  };

  const handleClaim = (reward: RewardItem) => {
    setActiveTicket(reward);
    setShowConfirmVerify(false);
  };

  const handleViewTicket = (reward: RewardItem) => {
    setActiveTicket(reward);
    setShowConfirmVerify(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* 1. PROGRESS BAR SUMMARY FOR CONSISTENCY */}
      <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">解鎖獎勵</span>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              {percentage}% <span className="text-sm font-bold text-gray-500">已達成</span>
            </h2>
          </div>
          <div className="bg-orange-50 text-[#FF8C00] font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-orange-100/50">
            <Award className="w-4 h-4 fill-current" />
            <span>已集 {collectedCount} 章</span>
          </div>
        </div>

        {/* Custom Linear Progress Bar */}
        <div className="mt-4 w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA333]"
          />
        </div>

        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
          目前已解鎖了 {rewardItems.filter((r) => collectedCount >= r.requirementCount).length} 項專屬獎勵！
        </p>
      </div>

      {/* 2. REWARDS LIST ITEMS */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-800 px-1">達標兌換好禮</h3>

        <div className="space-y-3.5">
          {rewardItems.map((reward) => {
            const isUnlocked = collectedCount >= reward.requirementCount;
            const isClaimed = claimedIds.includes(reward.id);

            return (
              <div
                key={reward.id}
                className={`bg-white p-4 rounded-[24px] border transition-all flex flex-col gap-4 ${
                  isClaimed
                    ? 'border-gray-100 opacity-75'
                    : isUnlocked
                    ? 'border-[#FF8C00] shadow-[0_4px_16px_rgba(255,140,0,0.04)]'
                    : 'border-gray-100'
                }`}
                style={{ borderRadius: '24px' }}
              >
                {/* Reward Header */}
                <div className="flex items-start gap-3">
                  {/* Reward icon background circle */}
                  <div className="w-12 h-12 rounded-[18px] bg-orange-50 flex items-center justify-center shrink-0">
                    {getRewardIcon(reward.iconType)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        集滿 {reward.requirementCount} 章
                      </span>
                      {isUnlocked && !isClaimed && (
                        <span className="text-[10px] font-bold text-[#FF8C00] bg-orange-50 px-2 py-0.5 rounded-full animate-pulse">
                          可兌換
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-gray-800 mt-1.5 truncate">{reward.title}</h4>
                    <p className="text-[11px] font-semibold text-gray-500 truncate mt-0.5">{reward.rewardName}</p>
                  </div>
                </div>

                {/* Reward Action Section */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                  <span className="text-[10px] text-gray-400 font-bold">
                    解鎖進度：{Math.min(collectedCount, reward.requirementCount)} / {reward.requirementCount}
                  </span>

                  {/* Dynamic CTA States */}
                  {!isUnlocked ? (
                    <span className="text-xs font-bold text-gray-400 px-3 py-1 bg-gray-100 rounded-full">
                      未達成
                    </span>
                  ) : isClaimed ? (
                    <button
                      onClick={() => handleViewTicket(reward)}
                      className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs rounded-full flex items-center gap-1 transition-all"
                      style={{ borderRadius: '24px' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>查看票券</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClaim(reward)}
                      className="px-4 py-1.5 bg-[#FF8C00] hover:bg-[#E07B00] text-white font-bold text-xs rounded-full shadow-[0_2px_8px_rgba(255,140,0,0.15)] transition-all transform active:scale-95"
                      style={{ borderRadius: '24px' }}
                    >
                      點此兌換
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DIGITAL TICKET / COUPON MODAL POPUP */}
      <AnimatePresence>
        {activeTicket && (() => {
          const isTicketClaimed = claimedIds.includes(activeTicket.id);
          return (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/50">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col relative"
                style={{ borderRadius: '32px' }}
              >
                {/* Header colored banner */}
                <div className="bg-gradient-to-r from-[#FF8C00] to-[#FFA333] p-6 text-white text-center relative">
                  <button
                    onClick={() => setActiveTicket(null)}
                    className="absolute right-4 top-4 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors z-20"
                    style={{ borderRadius: '24px' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Ticket className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest text-white/90">
                    加蚋仔合作夥伴專屬兌換券
                  </span>
                  <h3 className="text-base font-extrabold mt-2.5">{activeTicket.rewardName}</h3>
                </div>

                {/* Coupon body with simulated rip cut/tear lines */}
                <div className="relative py-6 px-6 bg-white flex flex-col items-center">
                  {/* Visual half-circle cutouts on left and right borders of coupon */}
                  <div className="absolute -left-3 top-0 w-6 h-6 bg-black/50 rounded-full" />
                  <div className="absolute -right-3 top-0 w-6 h-6 bg-black/50 rounded-full" />
                  
                  {/* Dashed Tear line */}
                  <div className="absolute left-4 right-4 top-2 border-t-2 border-dashed border-gray-100" />

                  {/* Ticket Details */}
                  <div className="w-full text-center space-y-4 mt-2">
                    <div className="bg-gray-50 rounded-[20px] p-4 text-left space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-400">兌換項目</p>
                      <p className="text-xs font-bold text-gray-800">{activeTicket.title}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-2">使用規則</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        本券限於加蚋仔商圈指定合作文創店家、咖啡館、或者是加蚋文史工作室服務台兌換，一人限兌一組。
                      </p>
                    </div>

                    {isTicketClaimed ? (
                      /* REDEEMED / CLAIMED STATE */
                      <div className="relative py-5 px-6 flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 rounded-[24px] bg-emerald-50/20 my-1 overflow-hidden w-full">
                        <div className="absolute rotate-12 border-4 border-emerald-500 text-emerald-500 font-extrabold text-2xl px-4 py-1 rounded-lg uppercase tracking-wider opacity-15 select-none pointer-events-none scale-125">
                          已核銷
                        </div>
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 animate-bounce" />
                        <span className="text-xs font-extrabold text-emerald-800">核銷完成！</span>
                        <span className="text-[10px] text-gray-500 mt-1 font-semibold">本兌換券已由工作人員點選核銷</span>
                        <span className="text-[8px] text-gray-400 mt-2 font-mono">
                          KAKAH-VERIFIED-{activeTicket.id}-OK
                        </span>
                      </div>
                    ) : showConfirmVerify ? (
                      /* CONFIRMATION STATE FOR STAFF */
                      <div className="p-4 border-2 border-dashed border-amber-200 rounded-[24px] bg-amber-50/20 my-1 flex flex-col items-center w-full">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2 animate-pulse" />
                        <h4 className="text-xs font-extrabold text-amber-800">工作人員請確認</h4>
                        <p className="text-[10px] text-gray-600 text-center leading-relaxed mt-1.5 px-1">
                          請確認已在現場核對並提供實體獎項或商品。點擊下方按鈕進行核銷，核銷後此券即作廢。
                        </p>
                        
                        <div className="flex gap-2 w-full mt-3.5">
                          <button
                            onClick={() => setShowConfirmVerify(false)}
                            className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded-full transition-all"
                            style={{ borderRadius: '20px' }}
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              onClaimReward(activeTicket.id);
                              setShowConfirmVerify(false);
                            }}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-full shadow-md transition-all active:scale-95"
                            style={{ borderRadius: '20px' }}
                          >
                            確認核銷
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* STAFF REDEEM BUTTON (DEFAULT STATE) */
                      <div className="py-2.5 px-1 flex flex-col items-center gap-2.5 w-full">
                        <button
                          onClick={() => setShowConfirmVerify(true)}
                          className="w-full py-3 bg-gradient-to-r from-[#FF8C00] to-[#FFA333] hover:from-[#E07B00] hover:to-[#E09200] text-white text-xs font-extrabold rounded-[20px] shadow-[0_4px_12px_rgba(255,140,0,0.2)] transition-all active:scale-95 flex items-center justify-center gap-2"
                          style={{ borderRadius: '20px' }}
                        >
                          工作人員點選核銷
                        </button>
                        
                        <div className="text-[9.5px] text-gray-500 text-center leading-relaxed max-w-[240px]">
                          <span className="font-semibold text-gray-400 block mb-0.5">【商家 / 工作人員核銷專用】</span>
                          兌換時請交由現場店員點擊上述按鈕進行核銷，請勿自行點擊。
                        </div>
                      </div>
                    )}
                  </div>
                </div>


              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
