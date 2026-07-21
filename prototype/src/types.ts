export interface StampLocation {
  id: number;
  name: string;
  title: string;
  description: string;
  address: string;
  coordinates: { x: number; y: number }; // Relative percentage coordinates for our custom interactive SVG map
  imgUrl: string;
  type: string;
  specialty: string;
  phone?: string;
  hours?: string;
  noStamp?: boolean;
}

export interface RewardItem {
  id: number;
  title: string;
  requirementCount: number;
  rewardName: string;
  iconType: 'postcard' | 'coffee' | 'bag';
}
