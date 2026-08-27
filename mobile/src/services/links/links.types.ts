export type LinkSource = 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube' | 'linkedin' | 'other';

export type LinkCategory =
  | 'nature'
  | 'cooking'
  | 'food'
  | 'sports'
  | 'music'
  | 'tech'
  | 'entertainment'
  | 'other';

export interface SavedLink {
  id: string;
  url: string;
  source: LinkSource;
  title: string | null;
  category: string | null;
  folderId: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface CreateLinkRequest {
  url: string;
  source?: LinkSource;
  title?: string;
  category?: LinkCategory;
  thumbnailUrl?: string;
  /** File under an existing folder. Takes precedence over folderName. */
  folderId?: string;
  /** File under a folder by name — matched case-insensitively, created if missing. */
  folderName?: string;
}

export interface ApiLinkResponse {
  success: boolean;
  message: string;
  data: SavedLink | SavedLink[];
}
