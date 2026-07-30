import {
  Smartphone,
  Laptop,
  Headphones,
  Shirt,
  Footprints,
  WashingMachine,
  Tv,
  CookingPot,
  Backpack,
  Watch,
  Tag,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Mobiles: Smartphone,
  Laptops: Laptop,
  Audio: Headphones,
  Fashion: Shirt,
  Footwear: Footprints,
  Appliances: WashingMachine,
  Televisions: Tv,
  Kitchen: CookingPot,
  Bags: Backpack,
  Wearables: Watch,
};

export function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? Tag;
}
