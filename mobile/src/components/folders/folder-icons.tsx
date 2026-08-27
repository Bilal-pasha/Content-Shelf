import {
  Folder,
  Leaf,
  ChefHat,
  UtensilsCrossed,
  Dumbbell,
  Music,
  Cpu,
  Clapperboard,
  Plane,
  Gamepad2,
  BookOpen,
  ShoppingBag,
  Bookmark,
  Heart,
  Star,
  Briefcase,
  Camera,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * Folders store an icon *key* (a stable string), never a component. The
 * server's auto-assign map (folder-defaults.ts) emits these same keys, so
 * keep the two in sync when adding entries.
 */
export const FOLDER_ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  leaf: Leaf,
  'chef-hat': ChefHat,
  utensils: UtensilsCrossed,
  dumbbell: Dumbbell,
  music: Music,
  cpu: Cpu,
  clapperboard: Clapperboard,
  plane: Plane,
  gamepad: Gamepad2,
  book: BookOpen,
  'shopping-bag': ShoppingBag,
  bookmark: Bookmark,
  heart: Heart,
  star: Star,
  briefcase: Briefcase,
  camera: Camera,
  sparkles: Sparkles,
};

/** Keys offered in the icon picker (folder-management screen). */
export const ICON_OPTIONS: string[] = Object.keys(FOLDER_ICONS);

/** Palette offered in the color picker. */
export const COLOR_OPTIONS: string[] = [
  '#6B7280',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#22C55E',
  '#10B981',
  '#0EA5E9',
  '#3B82F6',
  '#8B5CF6',
  '#A855F7',
  '#EC4899',
];

export function FolderIcon({
  icon,
  color,
  size = 20,
  strokeWidth = 2,
}: {
  icon: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Cmp = FOLDER_ICONS[icon] ?? Folder;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
