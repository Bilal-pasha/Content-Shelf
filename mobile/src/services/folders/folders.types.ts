export interface Folder {
  id: string;
  name: string;
  /** lucide icon key — resolve via the folder-icons registry. */
  icon: string;
  /** #RRGGBB */
  color: string;
  linkCount: number;
  createdAt: string;
}

export interface CreateFolderRequest {
  name: string;
  icon?: string;
  color?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  icon?: string;
  color?: string;
}

/** Response of GET /links/suggest?url= — drives the share sheet preselection. */
export interface FolderSuggestion {
  category: string | null;
  folderId: string | null;
  folderName: string | null;
}

export interface ApiFolderResponse {
  success: boolean;
  message: string;
  data: Folder | Folder[];
}

export interface ApiSuggestionResponse {
  success: boolean;
  message: string;
  data: FolderSuggestion;
}
