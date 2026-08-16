// 加蚋仔商圈種子資料，由前端原型 src/data.ts 遷移而來。
// geo 為 GPS 地理圍籬用的「概略」座標，
// 上線前務必以實地量測校正（目前為依地址推估的近似值）。

export interface SeedStation {
  name: string
  title: string
  description: string
  address: string
  geo: { lat: number; lng: number }
  imgUrl: string
  type: string
  specialty: string
  phone?: string
  hours?: string
  order: number
  noStamp?: boolean
}

export interface SeedReward {
  title: string
  requirementCount: number
  rewardName: string
  iconType: 'postcard' | 'coffee' | 'bag'
  stock: number
  perUserLimit: number
}

export const KALADZIAH_STATIONS: SeedStation[] = [
  {
    name: '加蚋仔楊聖廟',
    title: '楊聖公古廟信仰',
    description:
      '加蚋仔在地的核心信仰中心，主祀楊聖公（楊府爺），見證加蚋仔開拓歷史。廟宇中保存了精美的木雕、石刻與傳統磚造建築，蘊藏著百餘年來地方仕紳與居民的生活記憶。',
    address: '台北市萬華區東園街201號',
    geo: { lat: 25.0264, lng: 121.4988 },
    imgUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=800&q=80',
    type: '古蹟廟宇',
    specialty: '每年十月楊聖公聖誕，是加蚋仔地區最盛大的無形文化慶典。',
    phone: '02-2307-1234',
    hours: '每日 06:00 - 21:00',
    order: 1,
  },
  {
    name: '茉莉花文史工坊',
    title: '香花歲月的縮影',
    description:
      '日治時期至光復初期，加蚋仔曾是北台灣最著名的茉莉花產地，供應香片茶葉薰香使用。此工坊由在地青年共同發起，保存老屋、展示茉莉花栽種歷史，並推廣在地文化與手作香包。',
    address: '台北市萬華區東園街28-2號',
    geo: { lat: 25.0288, lng: 121.5006 },
    imgUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80',
    type: '文史空間',
    specialty: '工坊提供有機茉莉花茶品茗、在地文創產品，以及茉莉花香片手作 DIY 體驗。',
    phone: '02-2303-5678',
    hours: '週二至週日 11:00 - 18:00 (週一公休)',
    order: 2,
  },
  {
    name: '青年公園鷺鷥湖',
    title: '都市綠肺與飛行場遺址',
    description:
      '青年公園在日治時期曾是「南機場飛行場」，後改建為高爾夫球場，如今是南萬華面積最大的都會綠地。園區內的「鷺鷥湖」生態極為豐富，柳樹低垂，常有小白鷺、夜鷺在此棲息。',
    address: '台北市萬華區水源路199號',
    geo: { lat: 25.0219, lng: 121.5033 },
    imgUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
    type: '生態休閒',
    specialty: '漫步鷺鷥湖畔，能欣賞湖光倒影與水鳥翱翔。公園內還有全台唯一的溫室花卉區與太空城堡沙坑。',
    phone: '02-2303-2451',
    hours: '全天開放',
    order: 3,
  },
  {
    name: '傳統豆芽菜工坊',
    title: '餐桌背後的隱形推手',
    description:
      '加蚋仔因地下水質清澈甜美，自古以來便發展出龐大的豆芽菜產業，最高峰時曾供應大台北地區近八成的需求。至今，在胡氏與翁氏家族等古法工坊中，依然能看見數十年如一日的培育與洗滌工藝。',
    address: '台北市萬華區萬大路322巷90號',
    geo: { lat: 25.0206, lng: 121.5011 },
    imgUrl: 'https://images.unsplash.com/photo-1515023115689-589c33041d3c?auto=format&fit=crop&w=800&q=80',
    type: '傳統產業',
    specialty: '清晨的洗菜場景是加蚋仔的經典日常。這裡生長出的豆芽菜不含漂白劑，清脆甘甜。',
    phone: '02-2332-9900',
    hours: '清晨 05:00 - 中午 12:00',
    order: 4,
  },
  {
    name: '加蚋仔廣照宮',
    title: '東園聚落守護神',
    description:
      '廣照宮建於清咸豐年間，主祀「飛天大聖」，是加蚋仔東園街聚落的保護神。廟宇精緻的彩繪與石雕神龍活現，與楊聖公廟並列為加蚋仔地區最具歷史底蘊的兩座古老宮廟。',
    address: '台北市萬華區長泰街144號',
    geo: { lat: 25.0251, lng: 121.4997 },
    imgUrl: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&w=800&q=80',
    type: '古蹟廟宇',
    specialty: '廟前牌樓是當地著名地標，常是在地長者閒話家常、囡仔下棋玩耍的溫馨社區據點。',
    phone: '02-2305-6789',
    hours: '每日 05:30 - 21:30',
    order: 5,
  },
  {
    name: '東園街歷史街區',
    title: '南萬華第一老街',
    description:
      '東園街是加蚋仔地區最早興起的商業街，昔日繁華一時。街區保留了部分日治時期的紅磚洋樓，以及眾多傳承三代的老字號餅舖、中藥行、鐘錶店，散發著濃厚的老台北人情味。',
    address: '台北市萬華區東園街中段',
    geo: { lat: 25.0272, lng: 121.4996 },
    imgUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80',
    type: '文史空間',
    specialty: '沿街可探訪傳承數十年的傳統糕餅舖，品嚐在地古早味肉包與傳統點心。',
    phone: '02-2303-1212',
    hours: '全天開放',
    order: 6,
  },
  {
    name: '萬華故事館',
    title: '南萬華文史記憶空間',
    description:
      '位於青年公園一隅的萬華故事館，展示了萬華區從凱達格蘭族、清代漢人開墾、日治時期、光復初期到現代的珍貴歷史照片與文物。常設展包含加蚋仔三寶（茉莉花、豆芽菜、麻竹筍）歷史。',
    address: '台北市萬華區青年路65號 (青年公園內)',
    geo: { lat: 25.0227, lng: 121.5024 },
    imgUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    type: '文化場館',
    specialty: '館內收藏了大量古老地圖，以及復刻的加蚋仔傳統農具與日治時期東園街街景模型。',
    phone: '02-2303-1235',
    hours: '週二至週日 09:00 - 17:00 (週一公休)',
    order: 7,
    noStamp: true,
  },
  {
    name: '東園市場',
    title: '在地生活的煙火氣',
    description:
      '東園市場是加蚋仔居民日常生活不可或缺的傳統公有市場。這裡匯聚了數十個經營超過半世紀的老攤位，從新鮮的在地農產品、傳統熟食，到香氣四溢的古早味油飯與米粉湯，傳遞著濃濃的在地人情味。',
    address: '台北市萬華區東園街154號',
    geo: { lat: 25.0269, lng: 121.4999 },
    imgUrl: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80',
    type: '在地生活',
    specialty: '早上是熱鬧的傳統菜市場，周邊也有許多傳承兩代以上的老字號早餐與點心攤。',
    phone: '02-2305-4321',
    hours: '每日 06:00 - 13:00 (週一公休)',
    order: 8,
    noStamp: true,
  },
  {
    name: '青年公園溫室花卉區',
    title: '四季繽紛的玻璃溫室',
    description:
      '青年公園內頗具規模的植物展示溫室，全年展出各類應時花卉與觀葉植物。溫室內規劃了仙人掌區、熱帶植物區及蕨類植物區，綠意盎然，是許多市民前來散步、攝影與親近自然的秘密花園。',
    address: '台北市萬華區水源路199號 (青年公園內)',
    geo: { lat: 25.0213, lng: 121.5039 },
    imgUrl: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80',
    type: '生態休閒',
    specialty: '溫室外圍常舉辦季節性花卉展覽，室內採光極佳，十分適合靜心漫步或拍下優美照片。',
    phone: '02-2303-2451',
    hours: '每日 08:30 - 16:30',
    order: 9,
    noStamp: true,
  },
  {
    name: '加蚋文史彩繪牆',
    title: '筆尖下的庄頭記憶',
    description:
      '這面彩繪牆由萬華在地藝術家與社區居民合力創作，將加蚋仔過去著名的「加蚋仔三寶」——茉莉花海、茂密竹林、豆芽菜培育場，以及百年的迎神慶典，以生動活潑的插畫風格繪製於社區小巷牆面。',
    address: '台北市萬華區東園街66巷口',
    geo: { lat: 25.0279, lng: 121.4991 },
    imgUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    type: '文史空間',
    specialty: '彩繪牆栩栩如生地重現了日治時期茉莉花採收的景象，是極佳的打卡與戶外文史解說點。',
    order: 10,
    noStamp: true,
  },
]

export const KALADZIAH_REWARDS: SeedReward[] = [
  {
    title: '新手探索好禮',
    requirementCount: 1,
    rewardName: '加蚋仔文創明信片一套 (3張)',
    iconType: 'postcard',
    stock: -1,
    perUserLimit: 1,
  },
  {
    title: '半程漫遊達人',
    requirementCount: 3,
    rewardName: '在地合作手作咖啡大杯兌換券',
    iconType: 'coffee',
    stock: 200,
    perUserLimit: 1,
  },
  {
    title: '加蚋全境守護者',
    requirementCount: 6,
    rewardName: '加蚋仔復古帆布提袋 + 在地茉莉花青草茶包組',
    iconType: 'bag',
    stock: 100,
    perUserLimit: 1,
  },
]
