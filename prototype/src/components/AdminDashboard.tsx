import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeCanvas } from "qrcode.react";
import {
  MapPin,
  Gift,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  LogIn,
  LogOut,
  Lock,
  User,
  Check,
  AlertTriangle,
  RefreshCw,
  Compass,
  Coffee,
  Briefcase,
  Layers,
  Sparkles,
  Menu,
  Calendar,
  QrCode,
  Download, Image as ImageIcon,
  Store,
} from "lucide-react";
import { StampLocation, RewardItem, Campaign } from "../types";

interface AdminDashboardProps {
  locations: StampLocation[];
  rewardItems: RewardItem[];
  onUpdateLocations: (locations: StampLocation[]) => void;
  onUpdateRewardItems: (rewards: RewardItem[]) => void;
}

const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    name: "2026 加蚋仔春日漫遊集章祭",
    description:
      "深入萬華南機場、東園街與聚德宮，探索加蚋仔百年人文故事與實體商圈集章。",
    startDate: "2026-03-01",
    endDate: "2026-06-30",
    status: "active",
    targetStampCount: 5,
    participantsCount: 1248,
    type: "district",
  },
  {
    id: 2,
    name: "2026 民生電氣市集",
    description:
      "結合音樂與美食的週末限定派對，探索市集各攤位完成集章，即可獲得限定周邊！",
    startDate: "2026-07-01",
    endDate: "2026-07-02",
    status: "draft",
    targetStampCount: 5,
    participantsCount: 0,
    type: "market",
    marketMapUrl: "https://images.unsplash.com/photo-1576085898323-218337e3e43c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    name: "2025 加蚋冬至暖心萬事興集章",
    description:
      "歲末感懷回饋，集滿四處景點章，即可在指定商家兌換冬至圓與手工暖手包。",
    startDate: "2025-12-01",
    endDate: "2025-12-31",
    status: "ended",
    targetStampCount: 4,
    participantsCount: 856,
    type: "district",
  },
];

export default function AdminDashboard({
  locations,
  rewardItems,
  onUpdateLocations,
  onUpdateRewardItems,
}: AdminDashboardProps) {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("admin_logged_in") === "true";
  });
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authMode, setAuthMode] = useState<"firebase" | "demo">("demo");

  // Multi-Campaign State
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const stored = localStorage.getItem("gana_campaigns");
      return stored ? JSON.parse(stored) : DEFAULT_CAMPAIGNS;
    } catch {
      return DEFAULT_CAMPAIGNS;
    }
  });
  const [activeCampaignId, setActiveCampaignId] = useState<number | null>(null);
  const activeCampaign = activeCampaignId
    ? campaigns.find((c) => c.id === activeCampaignId) || campaigns[0]
    : campaigns[0];

  // Tab State: 'home' | 'locations' | 'rewards' | 'qrcode'
  const [activeTab, setActiveTab] = useState<
    "home" | "locations" | "rewards" | "qrcode" | "market-map"
  >("home");

  // Mobile Hamburger State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);

  // Search & Filters
  const [locStampFilter, setLocStampFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  // CRUD Modals States
  const [editingLoc, setEditingLoc] = useState<StampLocation | null>(null);
  const [isAddLocOpen, setIsAddLocOpen] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [newLoc, setNewLoc] = useState<Omit<StampLocation, "id">>({
    name: "",
    title: "",
    description: "",
    address: "",
    coordinates: { x: 50, y: 50 },
    imgUrl:
      "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=800&q=80",
    type: "古蹟廟宇",
    specialty: "",
    phone: "",
    hours: "",
    noStamp: false,
  });

  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [isAddRewardOpen, setIsAddRewardOpen] = useState<boolean>(false);
  const [newReward, setNewReward] = useState<Omit<RewardItem, "id">>({
    title: "",
    requirementCount: 3,
    rewardName: "",
  });

  // Campaign Form Modal
  const [isAddCampaignOpen, setIsAddCampaignOpen] = useState<boolean>(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [newCampaign, setNewCampaign] = useState<
    Omit<Campaign, "id" | "participantsCount">
  >({
    name: "",
    description: "",
    startDate: "2026-08-01",
    endDate: "2026-10-31",
    status: "draft",
    targetStampCount: 6,
    type: "district",
  });

  // Success Notification banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Auth Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "demo") {
      if (email === "admin@gana.org.tw" && password === "gana2026") {
        setIsLoggedIn(true);
        localStorage.setItem("admin_logged_in", "true");
        setAuthError("");
        triggerToast("🎉 登入成功！歡迎進入管理員系統");
      } else {
        setAuthError("帳號或密碼錯誤。提示：admin@gana.org.tw / gana2026");
      }
    } else {
      if (email && password.length >= 6) {
        setIsLoggedIn(true);
        localStorage.setItem("admin_logged_in", "true");
        setAuthError("");
        triggerToast("🔥 Firebase Auth 登入成功！");
      } else {
        setAuthError("密碼需至少為 6 位數。");
      }
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("admin_logged_in");
    triggerToast("已安全登出商家後台");
  };

  // LOCATION CRUD
  const handleSaveLocEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoc) return;
    if (!editingLoc.name.trim() || !editingLoc.title.trim()) {
      triggerToast("請填寫完整欄位！");
      return;
    }
    const updated = locations.map((loc) =>
      loc.id === editingLoc.id ? editingLoc : loc,
    );
    onUpdateLocations(updated);
    setEditingLoc(null);
    triggerToast(`✨ 已成功更新${activeCampaign.type === "market" ? "攤位" : "景點"}：${editingLoc.name}`);
  };

  const handleAddLoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoc.name.trim() || !newLoc.title.trim()) {
      triggerToast(`請填寫${activeCampaign.type === "market" ? "攤位" : "景點"}名稱！`);
      return;
    }
    const nextId =
      locations.length > 0 ? Math.max(...locations.map((l) => l.id)) + 1 : 1;
    const added: StampLocation = { ...newLoc, id: nextId, campaignId: activeCampaign.id };
    onUpdateLocations([...locations, added]);
    setIsAddLocOpen(false);
    setNewLoc({
      name: "",
      title: "",
      description: "",
      address: "",
      coordinates: { x: 50, y: 50 },
      imgUrl:
        "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=800&q=80",
      type: "古蹟廟宇",
      specialty: "",
      phone: "",
      hours: "",
      noStamp: false,
    });
    triggerToast(`🎉 已成功新增集章點：${added.name}`);
  };

  const handleDeleteLoc = (id: number, name: string) => {
    setConfirmDialog({
      message: `確定要刪除「${name}」${activeCampaign.type === "market" ? "攤位" : "景點"}嗎？`,
      onConfirm: () => {
        onUpdateLocations(locations.filter((loc) => loc.id !== id));
        triggerToast(`🗑️ 已刪除${activeCampaign.type === "market" ? "攤位" : "景點"}：${name}`);
      },
    });
  };

  // REWARD CRUD
  const handleSaveRewardEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReward) return;
    if (!editingReward.title.trim() || !editingReward.rewardName.trim()) {
      triggerToast("請填寫完整資訊！");
      return;
    }
    onUpdateRewardItems(
      rewardItems.map((rew) =>
        rew.id === editingReward.id ? editingReward : rew,
      ),
    );
    setEditingReward(null);
    triggerToast(`✨ 已更新兌換門檻：${editingReward.title}`);
  };

  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReward.title.trim() || !newReward.rewardName.trim()) {
      triggerToast("請填寫完整獎項資訊！");
      return;
    }
    const nextId =
      rewardItems.length > 0
        ? Math.max(...rewardItems.map((r) => r.id)) + 1
        : 1;
    const added: RewardItem = { ...newReward, id: nextId, campaignId: activeCampaign.id };
    onUpdateRewardItems([...rewardItems, added]);
    setIsAddRewardOpen(false);
    setNewReward({ title: "", requirementCount: 3, rewardName: "" });
    triggerToast(`🎁 已新增獎項：${added.title}`);
  };

  const handleDeleteReward = (id: number, title: string) => {
    setConfirmDialog({
      message: `確定要刪除「${title}」獎項嗎？`,
      onConfirm: () => {
        onUpdateRewardItems(rewardItems.filter((rew) => rew.id !== id));
        triggerToast(`🗑️ 已刪除獎項：${title}`);
      },
    });
  };

  // CAMPAIGN CRUD
  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) {
      triggerToast("請填寫活動名稱！");
      return;
    }
    const nextId =
      campaigns.length > 0 ? Math.max(...campaigns.map((c) => c.id)) + 1 : 1;
    const added: Campaign = {
      ...newCampaign,
      id: nextId,
      participantsCount: 0,
    };
    const updated = [...campaigns, added];
    setCampaigns(updated);
    localStorage.setItem("gana_campaigns", JSON.stringify(updated));
    setIsAddCampaignOpen(false);
    setNewCampaign({
      name: "",
      description: "",
      startDate: "2026-08-01",
      endDate: "2026-10-31",
      status: "draft",
      targetStampCount: 6,
      type: "district",
    });
    triggerToast(`🎯 新增活動：${added.name}`);
  };

  const handleSaveCampaignEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    if (!editingCampaign.name.trim()) {
      triggerToast("請填寫活動名稱！");
      return;
    }
    const updated = campaigns.map((c) =>
      c.id === editingCampaign.id ? editingCampaign : c,
    );
    setCampaigns(updated);
    localStorage.setItem("gana_campaigns", JSON.stringify(updated));
    setEditingCampaign(null);
    triggerToast(`🎯 已更新活動：${editingCampaign.name}`);
  };

  const handleUpdateCampaignStatus = (
    id: number,
    status: "active" | "draft" | "ended",
  ) => {
    const updated = campaigns.map((c) => (c.id === id ? { ...c, status } : c));
    setCampaigns(updated);
    localStorage.setItem("gana_campaigns", JSON.stringify(updated));
    triggerToast("活動狀態已更新！");
  };

  const handleDeleteCampaign = (id: number, name: string) => {
    if (id === 1) {
      triggerToast("此為加蚋仔核心主題活動，不允許刪除。");
      return;
    }
    setConfirmDialog({
      message: `確定要移除「${name}」活動紀錄嗎？`,
      onConfirm: () => {
        const updated = campaigns.filter((c) => c.id !== id);
        setCampaigns(updated);
        localStorage.setItem("gana_campaigns", JSON.stringify(updated));
        if (activeCampaignId === id) {
          setActiveCampaignId(1);
        }
        triggerToast(`🗑️ 已移除活動：${name}`);
      },
    });
  };

  // Filter Locations list
  const filteredLocations = locations.filter((loc) => {
    const locCampaignId = loc.campaignId || 1;
    const matchesCampaign = locCampaignId === activeCampaign.id;
    const matchesStamp = locStampFilter === "all" ||
      (locStampFilter === "yes" && !loc.noStamp) ||
      (locStampFilter === "no" && loc.noStamp);
    return matchesCampaign && matchesStamp;
  });

  const filteredRewards = rewardItems.filter((rew) => {
    const rewCampaignId = rew.campaignId || 1;
    return rewCampaignId === activeCampaign.id;
  });

  // Filter Campaigns list
  const filteredCampaigns = campaigns.filter((camp) => {
    return campaignFilter === "all" || camp.status === campaignFilter;
  });

  // Unauthenticated Login view
  if (!isLoggedIn) {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden p-8 flex flex-col gap-6 relative mx-auto my-8">
        <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-emerald-500 to-teal-600" />

        <div className="text-center flex flex-col items-center gap-2 mt-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
            <Lock className="w-6 h-6 stroke-[2]" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">
            集章活動平台・管理員系統
          </h2>
          <p className="text-xs text-gray-500 max-w-xs">
            配置集章活動、多活動管理與追蹤遊客分析數據。
          </p>
        </div>

        {authError && (
          <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-xs text-red-600">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600">
              登入驗證模式
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
              <button
                type="button"
                onClick={() => setAuthMode("demo")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  authMode === "demo"
                    ? "bg-white text-emerald-600 shadow-sm border border-gray-100"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                快速 Demo 模式
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("firebase")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  authMode === "firebase"
                    ? "bg-white text-emerald-600 shadow-sm border border-gray-100"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Firebase Auth
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-600">
              管理員電子信箱
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  authMode === "demo" ? "admin@gana.org.tw" : "請輸入管理員信箱"
                }
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-gray-700 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-600">安全密碼</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === "demo" ? "gana2026" : "請輸入密碼"}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-gray-700 placeholder:text-gray-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 text-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>驗證登入管理後台</span>
          </button>
        </form>

        {authMode === "demo" && (
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/30 text-[11px] text-emerald-800 leading-relaxed">
            <span className="font-bold block text-emerald-900 mb-0.5">
              💡 快速測試帳號：
            </span>
            <strong>帳號：</strong>
            <code className="bg-white px-1.5 py-0.5 rounded border">
              admin@gana.org.tw
            </code>
            <br />
            <strong>密碼：</strong>
            <code className="bg-white px-1.5 py-0.5 rounded border">
              gana2026
            </code>
          </div>
        )}
      </div>
    );
  }

  const allLocTypes = ["古蹟廟宇", "文史空間", "特色商家"];

  return (
    <div className="w-full flex flex-col md:flex-row bg-white md:rounded-3xl shadow-xl border-x-0 border-y md:border border-gray-100 overflow-hidden h-[100dvh] md:h-[820px] relative font-sans">
      {/* Datalists for custom inputs */}
      <datalist id="location-types">
        {allLocTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </datalist>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div key="toast"
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="absolute top-4 left-1/2 z-50 px-5 py-3 bg-gray-900 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2.5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* MOBILE HAMBURGER NAVIGATION DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-72 h-full bg-white text-gray-800 p-6 flex flex-col justify-between shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex flex-col gap-6 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="w-6 h-6 text-emerald-600" />
                      <span className="font-extrabold text-base">
                        加蚋商圈管理後台
                      </span>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Home Button */}
                  <button
                    onClick={() => {
                      setActiveTab("home");
                      setActiveCampaignId(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                      activeTab === "home"
                        ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                        : "text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700"
                    }`}
                  >
                    <Compass className={`w-4 h-4 ${activeTab === "home" ? "text-emerald-500" : ""}`} />
                    <span>總覽首頁 (切換活動)</span>
                  </button>
                </div>

                {/* Sidebar Navigation Options */}
                <div className="flex-1 flex flex-col gap-2 mt-6 overflow-y-auto pr-1 custom-scrollbar">
                  {/* Sub-menu Tabs */}
                  {activeCampaignId && (
                    <div className="flex flex-col gap-1.5 pl-1">
                      <button
                        onClick={() => {
                          setActiveTab("locations");
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                          activeTab === "locations"
                            ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                            : "text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700"
                        }`}
                      >
                        <MapPin className={`w-4 h-4 ${activeTab === "locations" ? "text-emerald-500" : ""}`} />
                        <span>{activeCampaign?.type === "market" ? "攤位管理" : "景點管理"}</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("rewards");
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                          activeTab === "rewards"
                            ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                            : "text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700"
                        }`}
                      >
                        <Gift className={`w-4 h-4 ${activeTab === "rewards" ? "text-emerald-500" : ""}`} />
                        <span>兌換獎項設定</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("qrcode");
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                          activeTab === "qrcode"
                            ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                            : "text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700"
                        }`}
                      >
                        <QrCode className={`w-4 h-4 ${activeTab === "qrcode" ? "text-emerald-500" : ""}`} />
                        <span>下載QR code</span>
                      </button>

                      {activeCampaign?.type === "market" && (
                        <button
                          onClick={() => {
                            setActiveTab("market-map");
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === "market-map"
                              ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                              : "text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700"
                          }`}
                        >
                          <ImageIcon className={`w-4 h-4 ${activeTab === "market-map" ? "text-emerald-500" : ""}`} />
                          <span>上傳市集地圖</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT SIDE WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
        {/* TOP STATUS BAR (Welcome User & Logout) */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center shrink-0 shadow-sm gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {activeTab !== "home" && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-1.5 bg-gray-100 hover:bg-emerald-50 rounded-lg text-gray-600 hover:text-emerald-600 transition-colors mr-1 shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {activeTab === "home" ? (
              <span className="font-bold text-gray-700 text-sm truncate">
                揪里嗨集章系統後台
              </span>
            ) : (
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-gray-700 text-sm hidden sm:inline shrink-0">
                  您現在管理的活動為：
                </span>
                <span className="text-emerald-700 font-extrabold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 truncate">
                  {activeCampaign ? activeCampaign.name : "未選擇活動"}
                </span>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              title="使用者選單"
              className="w-9 h-9 bg-gray-100 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm border border-gray-200 hover:border-emerald-200"
            >
              <User className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {isProfileMenuOpen && (
                <div key="profile-menu-wrapper">
                  {/* Backdrop for closing */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden flex flex-col"
                  >
                    <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        登入帳號
                      </span>
                      <span className="block text-sm font-bold text-gray-800 break-all">
                        {email || "admin@gana.org.tw"}
                      </span>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        安全登出
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* CAMPAIGN LEFT SIDEBAR NAVIGATION */}
          {activeTab !== "home" && activeCampaignId && (
            <div className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col shrink-0 p-4 gap-2 overflow-y-auto custom-scrollbar shadow-[2px_0_10px_rgba(0,0,0,0.01)]">
              <button
                onClick={() => {
                  setActiveTab("home");
                  setActiveCampaignId(null);
                }}
                className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors mb-1"
              >
                <Compass className="w-4 h-4 text-emerald-500" />
                返回總覽
              </button>

              <div className="h-px bg-gray-100 w-full my-2 shrink-0" />

              <span className="text-[10px] font-bold text-gray-400 px-2 uppercase tracking-wider mb-1 mt-1 shrink-0">
                活動管理選單
              </span>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setActiveTab("locations")}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === "locations"
                      ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                      : "text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700"
                  }`}
                >
                  <MapPin
                    className={`w-4 h-4 ${activeTab === "locations" ? "text-emerald-500" : ""}`}
                  />
                  {activeCampaign?.type === "market" ? "攤位管理" : "景點管理"}
                </button>
                <button
                  onClick={() => setActiveTab("rewards")}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === "rewards"
                      ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                      : "text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700"
                  }`}
                >
                  <Gift
                    className={`w-4 h-4 ${activeTab === "rewards" ? "text-emerald-500" : ""}`}
                  />
                  兌換獎項設定
                </button>
                <button
                  onClick={() => setActiveTab("qrcode")}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === "qrcode"
                      ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                      : "text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700"
                  }`}
                >
                  <QrCode
                    className={`w-4 h-4 ${activeTab === "qrcode" ? "text-emerald-500" : ""}`}
                  />
                  下載QR code
                </button>
                {activeCampaign?.type === "market" && (
                  <button
                    onClick={() => setActiveTab("market-map")}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeTab === "market-map"
                        ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                        : "text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700"
                    }`}
                  >
                    <ImageIcon
                      className={`w-4 h-4 ${activeTab === "market-map" ? "text-emerald-500" : ""}`}
                    />
                    上傳市集地圖
                  </button>
                )}
              </div>
            </div>
          )}

          {/* WORKSPACE MAIN SCROLLABLE CANVAS */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* TAB 1: LOCATIONS MANAGEMENT */}
            {activeTab === "locations" && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800 tracking-tight">
                      {"📍 " + (activeCampaign.type === "market" ? "攤位管理" : "景點管理")}
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      目前活動：{activeCampaign.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddLocOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>{`新增${activeCampaign.type === "market" ? "攤位" : "景點"}`}</span>
                  </button>
                </div>

                {/* FILTERS */}
                <div className="flex flex-row gap-2 shrink-0 overflow-x-auto custom-scrollbar pb-1">
                  <button
                    onClick={() => setLocStampFilter("all")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      locStampFilter === "all"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setLocStampFilter("yes")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      locStampFilter === "yes"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    實體集章點
                  </button>
                  <button
                    onClick={() => setLocStampFilter("no")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      locStampFilter === "no"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    純導覽點 (無集章)
                  </button>
                </div>

                {/* LOCATIONS LIST GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLocations.map((loc) => (
                    <div
                      key={loc.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all group"
                    >
                      <div className={`h-28 relative overflow-hidden shrink-0 flex items-center justify-center ${!loc.imgUrl && activeCampaign.type === 'market' ? 'bg-orange-50' : 'bg-gray-100'}`}>
                        {loc.imgUrl ? (
                          <img
                            src={loc.imgUrl}
                            alt={loc.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-orange-50 text-[#FF8C00] flex items-center justify-center">
                            <Store className="w-8 h-8 opacity-60" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          {activeCampaign.type !== 'market' && (
                            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-extrabold rounded-lg">
                              {loc.type}
                            </span>
                          )}
                          {loc.noStamp ? (
                            <span className="px-2 py-0.5 bg-gray-600/80 backdrop-blur-md text-white text-[9px] font-extrabold rounded-lg">
                              導覽點
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-500/90 backdrop-blur-md text-white text-[9px] font-extrabold rounded-lg flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              掃碼集章
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-extrabold text-sm text-gray-800">
                              {loc.name}
                            </h3>
                            <span className="text-[10px] font-mono text-gray-400">
                              ID: {loc.id}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-emerald-600">
                            {loc.title}
                          </p>
                          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                            {loc.description}
                          </p>
                        </div>

                        <div className="border-t border-gray-50 pt-2.5 flex justify-between items-center">
                          {activeCampaign.type !== 'market' && (
                            <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                              📍 {loc.address}
                            </span>
                          )}

                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => setEditingLoc(loc)}
                              className="p-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 text-gray-500 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLoc(loc.id, loc.name)}
                              className="p-1.5 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: REWARDS CONFIGURATION */}
            {activeTab === "rewards" && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800 tracking-tight">
                      🎁 兌換獎項設定
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      設置集章門檻、與特約店舖禮物兌換。
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddRewardOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>新增獎項</span>
                  </button>
                </div>

                {/* REWARDS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRewards.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      此活動尚未設定任何兌換獎項
                    </div>
                  ) : null}
                  {filteredRewards.map((rew) => (
                    <div
                      key={rew.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between gap-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                          <Gift className="w-4 h-4" />
                        </div>

                        <div className="flex-1 flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="px-2 py-0.5 bg-orange-50 border border-orange-100 text-orange-700 text-[9px] font-extrabold rounded-lg">
                              集滿 {rew.requirementCount} 枚章兌換
                            </span>
                            <span className="text-[9px] font-mono text-gray-400">
                              ID: {rew.id}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-xs text-gray-800">
                            {rew.title}
                          </h4>
                          <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-2 rounded-xl mt-1.5">
                            🎁 禮物：<strong>{rew.rewardName}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-50 pt-2 flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingReward(rew)}
                          className="p-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 text-gray-500 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReward(rew.id, rew.title)}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: HOME (MULTI-CAMPAIGN OVERVIEW) */}
            {activeTab === "home" && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-3">
                  <div>
                    <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                      <Compass className="w-5 h-5 text-emerald-600" />
                      集章活動總覽
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      新增或啟動不同季節、商圈商協專屬主題的集章活動。點擊活動即可管理其內容。
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddCampaignOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>建立新活動</span>
                  </button>
                </div>

                {/* CAMPAIGNS FILTER */}
                <div className="flex flex-row gap-2 shrink-0 overflow-x-auto custom-scrollbar pb-1 mt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setCampaignFilter('all'); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      campaignFilter === 'all'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCampaignFilter('active'); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      campaignFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    啟用中
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCampaignFilter('draft'); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      campaignFilter === 'draft'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    草稿
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCampaignFilter('ended'); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      campaignFilter === 'ended'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    已封存
                  </button>
                </div>

                {/* CAMPAIGNS LIST (TABLE FORMAT) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                          <th className="p-4 w-16 text-center">ID</th>
                          <th className="p-4 w-1/3">活動名稱</th>
                          <th className="p-4 w-24">活動類別</th>
                          <th className="p-4 min-w-[160px]">活動時間</th>
                          <th className="p-4 w-32">活動狀態</th>
                          <th className="p-4 w-32">管理活動</th>
                          <th className="p-4 w-16 text-center">編輯</th>
                          <th className="p-4 w-16 text-center">刪除</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                        {filteredCampaigns.map((camp) => (
                          <tr
                            key={camp.id}
                            onClick={() => {
                              setActiveCampaignId(camp.id);
                              setActiveTab("locations");
                            }}
                            className={`group transition-colors cursor-pointer ${
                              activeCampaignId === camp.id
                                ? "bg-emerald-50/50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <td className="p-4 text-center text-gray-400 font-mono text-xs">
                              #{camp.id}
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-gray-800 group-hover:text-emerald-700 transition-colors line-clamp-2">
                                {camp.name}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                {camp.type === "market" ? "市集" : "商圈"}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span className="whitespace-nowrap">
                                  {camp.startDate} ~ {camp.endDate}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <select
                                value={camp.status}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  handleUpdateCampaignStatus(
                                    camp.id,
                                    e.target.value as
                                      "active" | "draft" | "ended",
                                  );
                                }}
                                className={`text-[11px] font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer ${
                                  camp.status === "active"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : camp.status === "draft"
                                      ? "bg-gray-100 border-gray-200 text-gray-600"
                                      : "bg-red-50 border-red-100 text-red-600"
                                }`}
                              >
                                <option value="active">啟用中</option>
                                <option value="draft">草稿</option>
                                <option value="ended">已封存</option>
                              </select>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCampaignId(camp.id);
                                  setActiveTab("locations");
                                }}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
                              >
                                管理活動 ➔
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCampaign(camp);
                                }}
                                className="p-2 inline-flex justify-center items-center bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-400 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCampaign(camp.id, camp.name);
                                }}
                                className="p-2 inline-flex justify-center items-center bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DOWNLOAD QR CODE */}
            {activeTab === "qrcode" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-extrabold text-gray-800 tracking-tight">
                    🔲 下載QR code
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    下載可列印的QR code供民眾掃描集章。
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.filter((loc) => (loc.campaignId || 1) === activeCampaign.id).map((loc) => {
                    const qrUrl = `${window.location.origin}/scan/${activeCampaign.id}/${loc.id}`;

                    return (
                      <div
                        key={loc.id}
                        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-4"
                      >
                        <div className="text-center">
                          <h4 className="text-sm font-black text-gray-800">
                            {loc.name}
                          </h4>
                          {activeCampaign.type !== 'market' && (
                            <span className="text-[10px] text-gray-500">
                              {loc.type}
                            </span>
                          )}
                        </div>

                        {loc.noStamp ? (
                          <div className="flex-1 flex flex-col items-center justify-center gap-3 w-full h-[184px] bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4">
                            <span className="text-xs text-gray-500 font-bold">
                              非集章點位
                            </span>
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  message: `是否開啟此${activeCampaign.type === "market" ? "攤位" : "景點"}為集章點位？`,
                                  onConfirm: () => {
                                    const updated = locations.map((l) =>
                                      l.id === loc.id
                                        ? { ...l, noStamp: false }
                                        : l,
                                    );
                                    onUpdateLocations(updated);
                                    triggerToast(
                                      `✨ 已開啟 ${loc.name} 為集章點位`,
                                    );
                                  },
                                });
                              }}
                              className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              開啟為集章點位
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                              <QRCodeCanvas
                                id={`qr-${loc.id}`}
                                value={qrUrl}
                                size={160}
                                level={"H"}
                                includeMargin={true}
                              />
                            </div>

                            <div className="flex gap-2 w-full">
                              <button
                                onClick={() => {
                                  const canvas = document.getElementById(
                                    `qr-${loc.id}`,
                                  ) as HTMLCanvasElement;
                                  if (canvas) {
                                    const pngUrl = canvas
                                      .toDataURL("image/png")
                                      .replace(
                                        "image/png",
                                        "image/octet-stream",
                                      );
                                    let downloadLink =
                                      document.createElement("a");
                                    downloadLink.href = pngUrl;
                                    downloadLink.download = `qrcode-${activeCampaign.id}-${loc.id}.png`;
                                    document.body.appendChild(downloadLink);
                                    downloadLink.click();
                                    document.body.removeChild(downloadLink);
                                  }
                                }}
                                className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                下載圖片
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmDialog({
                                    message: `是否關閉此${activeCampaign.type === "market" ? "攤位" : "景點"}的集章功能？`,
                                    onConfirm: () => {
                                      const updated = locations.map((l) =>
                                        l.id === loc.id
                                          ? { ...l, noStamp: true }
                                          : l,
                                      );
                                      onUpdateLocations(updated);
                                      triggerToast(
                                        `已關閉 ${loc.name} 集章功能`,
                                      );
                                    },
                                  });
                                }}
                                className="px-3 py-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                title="關閉集章功能"
                              >
                                關閉
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "market-map" && activeCampaign?.type === "market" && (
              <div className="flex flex-col gap-6 animate-fade-in h-full">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-emerald-600" />
                      市集平面圖上傳
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-1">
                      上傳圖片作為市集地圖，更新後即時生效於前台。
                    </p>
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col items-center justify-center gap-6">
                  {activeCampaign.marketMapUrl ? (
                    <div className="w-full max-w-2xl aspect-video rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden relative group flex items-center justify-center bg-gray-50">
                      <img
                        src={activeCampaign.marketMapUrl}
                        alt="Market Map Preview"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="flex items-center gap-2 px-5 py-3 bg-white text-gray-800 rounded-xl font-bold text-sm shadow-xl cursor-pointer hover:bg-gray-50 transition-colors">
                          <ImageIcon className="w-5 h-5" />
                          更換圖片
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    const updated = campaigns.map((c) =>
                                      c.id === activeCampaign.id
                                        ? { ...c, marketMapUrl: event.target.result as string }
                                        : c
                                    );
                                    setCampaigns(updated);
                                    localStorage.setItem("gana_campaigns", JSON.stringify(updated));
                                    triggerToast("市集地圖已更新！");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="w-full max-w-2xl aspect-video rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/80 transition-colors flex flex-col items-center justify-center gap-4 cursor-pointer text-emerald-600">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Plus className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <span className="font-bold text-lg block mb-1">點擊上傳平面圖</span>
                        <span className="text-xs text-emerald-600/70">支援 JPG, PNG 格式</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                const updated = campaigns.map((c) =>
                                  c.id === activeCampaign.id
                                    ? { ...c, marketMapUrl: event.target.result as string }
                                    : c
                                );
                                setCampaigns(updated);
                                localStorage.setItem("gana_campaigns", JSON.stringify(updated));
                                triggerToast("市集地圖已更新！");
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- MODALS & FORMS ----------------- */}

      {/* 1. ADD LOCATION MODAL */}
      <AnimatePresence>
        {isAddLocOpen && (
          <div key="add-loc" className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col max-h-[90%]"
            >
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
                <h3 className="font-extrabold text-xs text-gray-800">
                  {"📍 " + (activeCampaign.type === "market" ? "新增市集攤位" : "新增集章景點")}
                </h3>
                <button
                  onClick={() => setIsAddLocOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form
                onSubmit={handleAddLoc}
                className="flex-1 overflow-y-auto p-5 flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    {activeCampaign.type === 'market' ? '攤位名稱：' : '景點名稱：'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={activeCampaign.type === 'market' ? '如：民生電氣' : '如：六張犁古道'}
                    value={newLoc.name}
                    onChange={(e) =>
                      setNewLoc({ ...newLoc, name: e.target.value })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    小標：
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：山林秘境通道"
                    value={newLoc.title}
                    onChange={(e) =>
                      setNewLoc({ ...newLoc, title: e.target.value })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {activeCampaign.type !== 'market' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      地址：
                    </label>
                    <input
                      type="text"
                      placeholder="台北市萬華區東園街..."
                      value={newLoc.address}
                      onChange={(e) =>
                        setNewLoc({ ...newLoc, address: e.target.value })
                      }
                      className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                {activeCampaign.type !== 'market' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500">
                        開放時間：
                      </label>
                      <input
                        type="text"
                        placeholder="如：週一至週五 09:00-18:00"
                        value={newLoc.hours || ""}
                        onChange={(e) =>
                          setNewLoc({ ...newLoc, hours: e.target.value })
                        }
                        className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500">
                        聯絡電話：
                      </label>
                      <input
                        type="text"
                        placeholder="如：02-2345-6789"
                        value={newLoc.phone || ""}
                        onChange={(e) =>
                          setNewLoc({ ...newLoc, phone: e.target.value })
                        }
                        className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    {activeCampaign.type === 'market' ? '攤位簡介：' : '探索此地：'}
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder={activeCampaign.type === 'market' ? '請輸入關於攤位的簡介...' : '請輸入關於景點的沿革歷史與趣味文化故事...'}
                    value={newLoc.description}
                    onChange={(e) =>
                      setNewLoc({ ...newLoc, description: e.target.value })
                    }
                    className="border border-gray-200 p-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                {activeCampaign.type !== 'market' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      私房亮點：
                    </label>
                    <textarea
                      rows={2}
                      placeholder={activeCampaign.type === "market" ? "請輸入攤位的特別之處或小知識..." : "請輸入景點的特別之處或小知識..."}
                      value={newLoc.specialty || ""}
                      onChange={(e) =>
                        setNewLoc({ ...newLoc, specialty: e.target.value })
                      }
                      className="border border-gray-200 p-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none resize-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeCampaign.type !== 'market' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500">
                        {activeCampaign.type === "market" ? "攤位類型 *" : "景點類型 *"}
                      </label>
                      <input
                        list="location-types"
                        value={newLoc.type}
                        onChange={(e) =>
                          setNewLoc({ ...newLoc, type: e.target.value })
                        }
                        placeholder="選擇或輸入新類型"
                        className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      集章屬性 *
                    </label>
                    <select
                      value={newLoc.noStamp ? "no" : "yes"}
                      onChange={(e) =>
                        setNewLoc({
                          ...newLoc,
                          noStamp: e.target.value === "no",
                        })
                      }
                      className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="yes">實體集章點</option>
                      <option value="no">純導覽點 (無集章)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    圖片
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      placeholder="圖片網址或上傳圖片"
                      value={newLoc.imgUrl || ""}
                      onChange={(e) =>
                        setNewLoc({ ...newLoc, imgUrl: e.target.value })
                      }
                      className="flex-1 border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                    <label className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-gray-200">
                      上傳圖片
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setNewLoc({
                                  ...newLoc,
                                  imgUrl: event.target.result as string,
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className={`mt-2 w-full h-32 rounded-xl overflow-hidden border border-gray-200 relative ${!newLoc.imgUrl && activeCampaign.type === 'market' ? 'bg-orange-50' : 'bg-gray-100'}`}>
                    {newLoc.imgUrl ? (
                      <img
                        src={newLoc.imgUrl}
                        alt="預覽"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#FF8C00]">
                        <Store className="w-10 h-10 opacity-50" />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all mt-2 cursor-pointer"
                >
                  發佈並同步前台地圖
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DIALOG */}
      <AnimatePresence>
        {confirmDialog && (
          <div key="confirm" className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col p-6 items-center text-center gap-4"
            >
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-gray-800 text-sm mt-2">
                {confirmDialog.message}
              </h3>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl text-xs transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                >
                  確定
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. EDIT LOCATION MODAL */}
      <AnimatePresence>
        {editingLoc && (
          <div key="edit-loc" className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col max-h-[90%]"
            >
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
                <h3 className="font-extrabold text-xs text-gray-800">
                  {"📍 編輯" + (activeCampaign.type === "market" ? "攤位" : "景點") + " (ID: " + editingLoc.id + ")"}
                </h3>
                <button
                  onClick={() => setEditingLoc(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form
                onSubmit={handleSaveLocEdit}
                className="flex-1 overflow-y-auto p-5 flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    {activeCampaign.type === 'market' ? '攤位名稱：' : '景點名稱：'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLoc.name}
                    onChange={(e) =>
                      setEditingLoc({ ...editingLoc, name: e.target.value })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    小標：
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLoc.title}
                    onChange={(e) =>
                      setEditingLoc({ ...editingLoc, title: e.target.value })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {activeCampaign.type !== 'market' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      地址：
                    </label>
                    <input
                      type="text"
                      value={editingLoc.address}
                      onChange={(e) =>
                        setEditingLoc({ ...editingLoc, address: e.target.value })
                      }
                      className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                {activeCampaign.type !== 'market' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500">
                        開放時間：
                      </label>
                      <input
                        type="text"
                        value={editingLoc.hours || ""}
                        onChange={(e) =>
                          setEditingLoc({ ...editingLoc, hours: e.target.value })
                        }
                        className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500">
                        聯絡電話：
                      </label>
                      <input
                        type="text"
                        value={editingLoc.phone || ""}
                        onChange={(e) =>
                          setEditingLoc({ ...editingLoc, phone: e.target.value })
                        }
                        className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    {activeCampaign.type === 'market' ? '攤位簡介：' : '探索此地：'}
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={editingLoc.description}
                    onChange={(e) =>
                      setEditingLoc({
                        ...editingLoc,
                        description: e.target.value,
                      })
                    }
                    className="border border-gray-200 p-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                {activeCampaign.type !== 'market' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      私房亮點：
                    </label>
                    <textarea
                      rows={2}
                      value={editingLoc.specialty || ""}
                      onChange={(e) =>
                        setEditingLoc({
                          ...editingLoc,
                          specialty: e.target.value,
                        })
                      }
                      className="border border-gray-200 p-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none resize-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeCampaign.type !== 'market' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500">
                        {activeCampaign.type === "market" ? "攤位類型 *" : "景點類型 *"}
                      </label>
                      <input
                        list="location-types"
                        value={editingLoc.type}
                        onChange={(e) =>
                          setEditingLoc({ ...editingLoc, type: e.target.value })
                        }
                        placeholder="選擇或輸入新類型"
                        className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      集章屬性 *
                    </label>
                    <select
                      value={editingLoc.noStamp ? "no" : "yes"}
                      onChange={(e) =>
                        setEditingLoc({
                          ...editingLoc,
                          noStamp: e.target.value === "no",
                        })
                      }
                      className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="yes">實體集章點</option>
                      <option value="no">純導覽點 (無集章)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    圖片
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      placeholder="圖片網址或上傳圖片"
                      value={editingLoc.imgUrl || ""}
                      onChange={(e) =>
                        setEditingLoc({ ...editingLoc, imgUrl: e.target.value })
                      }
                      className="flex-1 border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                    <label className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-gray-200">
                      上傳圖片
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setEditingLoc({
                                  ...editingLoc,
                                  imgUrl: event.target.result as string,
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className={`mt-2 w-full h-32 rounded-xl overflow-hidden border border-gray-200 relative ${!editingLoc.imgUrl && activeCampaign.type === 'market' ? 'bg-orange-50' : 'bg-gray-100'}`}>
                    {editingLoc.imgUrl ? (
                      <img
                        src={editingLoc.imgUrl}
                        alt={editingLoc.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#FF8C00]">
                        <Store className="w-10 h-10 opacity-50" />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all mt-2 cursor-pointer"
                >
                  {"儲存" + (activeCampaign.type === "market" ? "攤位" : "景點") + "更新"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. ADD REWARD MODAL */}
      <AnimatePresence>
        {isAddRewardOpen && (
          <div key="add-reward" className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col"
            >
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-extrabold text-xs text-gray-800">
                  🎁 新增集章兌換獎項
                </h3>
                <button
                  onClick={() => setIsAddRewardOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form
                onSubmit={handleAddReward}
                className="p-5 flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    獎項門檻標題 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：加蚋仔半程漫步獎"
                    value={newReward.title}
                    onChange={(e) =>
                      setNewReward({ ...newReward, title: e.target.value })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    所需章數 *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="15"
                    value={newReward.requirementCount}
                    onChange={(e) =>
                      setNewReward({
                        ...newReward,
                        requirementCount: Number(e.target.value),
                      })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    實體贈品兌換內容 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：商圈合作手工精品黑咖啡一杯"
                    value={newReward.rewardName}
                    onChange={(e) =>
                      setNewReward({ ...newReward, rewardName: e.target.value })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all mt-2 cursor-pointer"
                >
                  發佈新兌換獎項
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. EDIT REWARD MODAL */}
      <AnimatePresence>
        {editingReward && (
          <div key="edit-reward" className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col"
            >
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-extrabold text-xs text-gray-800">
                  🎁 編輯獎項 (ID: {editingReward.id})
                </h3>
                <button
                  onClick={() => setEditingReward(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form
                onSubmit={handleSaveRewardEdit}
                className="p-5 flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    獎項門檻標題 *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingReward.title}
                    onChange={(e) =>
                      setEditingReward({
                        ...editingReward,
                        title: e.target.value,
                      })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    所需章數 *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="15"
                    value={editingReward.requirementCount}
                    onChange={(e) =>
                      setEditingReward({
                        ...editingReward,
                        requirementCount: Number(e.target.value),
                      })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    實體贈品兌換內容 *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingReward.rewardName}
                    onChange={(e) =>
                      setEditingReward({
                        ...editingReward,
                        rewardName: e.target.value,
                      })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all mt-2 cursor-pointer"
                >
                  確認修改並更新
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. ADD CAMPAIGN MODAL */}
      <AnimatePresence>
        {isAddCampaignOpen && (
          <div key="add-campaign" className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col"
            >
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-extrabold text-xs text-gray-800">
                  🎯 建立新商圈集章活動
                </h3>
                <button
                  onClick={() => setIsAddCampaignOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form
                onSubmit={handleAddCampaign}
                className="p-5 flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    活動名稱 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：2026 加蚋仔冬日溫情集章"
                    value={newCampaign.name}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, name: e.target.value })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    活動類別 *
                  </label>
                  <select
                    value={newCampaign.type}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        type: e.target.value as "district" | "market",
                      })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:outline-none"
                  >
                    <option value="district">商圈</option>
                    <option value="market">市集</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      開始日期
                    </label>
                    <input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          startDate: e.target.value,
                        })
                      }
                      className="border border-gray-200 px-2.5 py-1.5 text-xs rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      結束日期
                    </label>
                    <input
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          endDate: e.target.value,
                        })
                      }
                      className="border border-gray-200 px-2.5 py-1.5 text-xs rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    初始狀態 *
                  </label>
                  <select
                    value={newCampaign.status}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        status: e.target.value as "draft" | "active",
                      })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:outline-none"
                  >
                    <option value="draft">📁 籌備草稿 (Draft)</option>
                    <option value="active">🟢 直接啟動 (Active)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all mt-2 cursor-pointer"
                >
                  發佈並建立新活動
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. EDIT CAMPAIGN MODAL */}
      <AnimatePresence>
        {editingCampaign && (
          <div key="edit-campaign" className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col"
            >
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-extrabold text-xs text-gray-800">
                  🎯 編輯活動 (ID: {editingCampaign.id})
                </h3>
                <button
                  onClick={() => setEditingCampaign(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form
                onSubmit={handleSaveCampaignEdit}
                className="p-5 flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    活動名稱 *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCampaign.name}
                    onChange={(e) =>
                      setEditingCampaign({
                        ...editingCampaign,
                        name: e.target.value,
                      })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    活動類別 *
                  </label>
                  <select
                    value={editingCampaign.type}
                    onChange={(e) =>
                      setEditingCampaign({
                        ...editingCampaign,
                        type: e.target.value as "district" | "market",
                      })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:outline-none"
                  >
                    <option value="district">商圈</option>
                    <option value="market">市集</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      開始日期
                    </label>
                    <input
                      type="date"
                      value={editingCampaign.startDate}
                      onChange={(e) =>
                        setEditingCampaign({
                          ...editingCampaign,
                          startDate: e.target.value,
                        })
                      }
                      className="border border-gray-200 px-2.5 py-1.5 text-xs rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500">
                      結束日期
                    </label>
                    <input
                      type="date"
                      value={editingCampaign.endDate}
                      onChange={(e) =>
                        setEditingCampaign({
                          ...editingCampaign,
                          endDate: e.target.value,
                        })
                      }
                      className="border border-gray-200 px-2.5 py-1.5 text-xs rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">
                    狀態 *
                  </label>
                  <select
                    value={editingCampaign.status}
                    onChange={(e) =>
                      setEditingCampaign({
                        ...editingCampaign,
                        status: e.target.value as "draft" | "active" | "ended",
                      })
                    }
                    className="border border-gray-200 px-3 py-2 text-xs rounded-xl focus:outline-none"
                  >
                    <option value="draft">📁 草稿 (Draft)</option>
                    <option value="active">🟢 啟用中 (Active)</option>
                    <option value="ended">🔴 已封存 (Ended)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all mt-2 cursor-pointer"
                >
                  確認修改並更新
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
