// 後台 API 統一的回傳格式。ObjectId 一律轉字串，敏感欄位（qrSecret）不外流。
// 前端 stores/admin.ts 的型別以此為準。

// 這裡刻意用結構化的鬆散型別：Mongoose document 的 InferSchemaType 不含 _id，
// 直接標註反而要到處 as，故以最小必要欄位描述輸入。
type Doc = Record<string, any>

export function campaignDto(c: Doc) {
  return {
    id: c._id.toString(),
    title: c.title,
    description: c.description ?? '',
    startAt: c.startAt,
    endAt: c.endAt,
    theme: c.theme ?? '',
    type: c.type ?? 'district',
    targetStampCount: c.targetStampCount ?? 0,
    marketMapUrl: c.marketMapUrl ?? '',
    status: c.status,
  }
}

export function stationDto(s: Doc) {
  return {
    id: s._id.toString(),
    campaignId: s.campaignId.toString(),
    name: s.name,
    title: s.title ?? '',
    description: s.description ?? '',
    address: s.address ?? '',
    geo: { lat: s.geo?.lat ?? 0, lng: s.geo?.lng ?? 0 },
    mapCoord: { x: s.mapCoord?.x ?? 50, y: s.mapCoord?.y ?? 50 },
    imgUrl: s.imgUrl ?? '',
    type: s.type ?? '',
    specialty: s.specialty ?? '',
    phone: s.phone ?? '',
    hours: s.hours ?? '',
    order: s.order ?? 0,
    noStamp: s.noStamp ?? false,
  }
}

export function rewardDto(r: Doc) {
  return {
    id: r._id.toString(),
    campaignId: r.campaignId.toString(),
    title: r.title,
    requirementCount: r.requirementCount,
    rewardName: r.rewardName,
    iconType: r.iconType ?? 'postcard',
    stock: r.stock ?? -1,
    perUserLimit: r.perUserLimit ?? 1,
  }
}
