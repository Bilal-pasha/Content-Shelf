import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { httpPrivate } from '../axiosConfig';
import { API_ENDPOINTS } from '@/utils/api.endpoints';
import type {
  ApiFolderResponse,
  ApiSuggestionResponse,
  CreateFolderRequest,
  Folder,
  FolderSuggestion,
  UpdateFolderRequest,
} from './folders.types';

export const foldersService = {
  async list(): Promise<Folder[]> {
    const { data } = await httpPrivate.get<ApiFolderResponse>(
      API_ENDPOINTS.FOLDERS,
    );
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to fetch folders');
    }
    return data.data;
  },

  async create(payload: CreateFolderRequest): Promise<Folder> {
    const { data } = await httpPrivate.post<ApiFolderResponse>(
      API_ENDPOINTS.FOLDERS,
      payload,
    );
    return data.data as Folder;
  },

  async update(id: string, payload: UpdateFolderRequest): Promise<Folder> {
    const { data } = await httpPrivate.patch<ApiFolderResponse>(
      `${API_ENDPOINTS.FOLDERS}/${id}`,
      payload,
    );
    return data.data as Folder;
  },

  async remove(id: string): Promise<void> {
    await httpPrivate.delete(`${API_ENDPOINTS.FOLDERS}/${id}`);
  },

  async suggest(url: string): Promise<FolderSuggestion> {
    const { data } = await httpPrivate.get<ApiSuggestionResponse>(
      `${API_ENDPOINTS.LINKS_SUGGEST}?url=${encodeURIComponent(url)}`,
    );
    return data.data;
  },
};

export const FOLDERS_QUERY_KEY = ['folders'] as const;

export function useFolders(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEY,
    queryFn: foldersService.list,
    enabled: options?.enabled ?? true,
  });
}

/** Best-effort suggestion for the share sheet; failure resolves to empty. */
export function useFolderSuggestion(url: string, enabled: boolean) {
  return useQuery({
    queryKey: ['folder-suggestion', url],
    queryFn: async (): Promise<FolderSuggestion> => {
      try {
        return await foldersService.suggest(url);
      } catch {
        return { category: null, folderId: null, folderName: null };
      }
    },
    enabled: enabled && url.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: foldersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEY });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateFolderRequest & { id: string }) =>
      foldersService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEY });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foldersService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}
