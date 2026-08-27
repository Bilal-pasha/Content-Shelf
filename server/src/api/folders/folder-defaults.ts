/**
 * Default icon + color for an auto-created folder. The share flow never asks
 * the user to pick these — they're derived from the auto-detected category
 * (primary signal) or a keyword scan of the folder name (fallback), and the
 * user can change them later in the folder-management screen.
 *
 * Icon keys must exist in the mobile `folder-icons` registry.
 */

export const CATEGORY_FOLDER_DEFAULTS: Record<
  string,
  { icon: string; color: string }
> = {
  nature: { icon: 'leaf', color: '#22C55E' },
  cooking: { icon: 'chef-hat', color: '#F97316' },
  food: { icon: 'utensils', color: '#EF4444' },
  sports: { icon: 'dumbbell', color: '#3B82F6' },
  music: { icon: 'music', color: '#A855F7' },
  tech: { icon: 'cpu', color: '#0EA5E9' },
  entertainment: { icon: 'clapperboard', color: '#EC4899' },
  other: { icon: 'folder', color: '#6B7280' },
};

const KEYWORD_RULES: { re: RegExp; icon: string; color: string }[] = [
  {
    re: /gym|workout|fitness|exercise|running?/i,
    icon: 'dumbbell',
    color: '#3B82F6',
  },
  { re: /recipe|kitchen|bak(e|ing)|cook/i, icon: 'chef-hat', color: '#F97316' },
  { re: /travel|trip|vacation|flight/i, icon: 'plane', color: '#0EA5E9' },
  { re: /movie|show|film|series|tv/i, icon: 'clapperboard', color: '#EC4899' },
  { re: /song|music|playlist|beat/i, icon: 'music', color: '#A855F7' },
  { re: /garden|plant|nature|hike|outdoor/i, icon: 'leaf', color: '#22C55E' },
  { re: /code|dev|programming|software/i, icon: 'cpu', color: '#0EA5E9' },
  { re: /game|gaming|gamer/i, icon: 'gamepad', color: '#8B5CF6' },
  { re: /study|learn|course|school|book/i, icon: 'book', color: '#F59E0B' },
  { re: /gift|shop|buy|deal/i, icon: 'shopping-bag', color: '#10B981' },
];

const DEFAULT = { icon: 'folder', color: '#6B7280' };

export function defaultsForFolder(
  name: string,
  category?: string | null,
): { icon: string; color: string } {
  if (category && CATEGORY_FOLDER_DEFAULTS[category]) {
    return CATEGORY_FOLDER_DEFAULTS[category];
  }
  const lower = name.trim().toLowerCase();
  if (CATEGORY_FOLDER_DEFAULTS[lower]) return CATEGORY_FOLDER_DEFAULTS[lower];
  for (const rule of KEYWORD_RULES) {
    if (rule.re.test(lower)) return { icon: rule.icon, color: rule.color };
  }
  return DEFAULT;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
