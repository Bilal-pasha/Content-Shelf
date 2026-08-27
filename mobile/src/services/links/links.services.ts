import { useQuery } from '@tanstack/react-query';
import { httpPrivate } from '../axiosConfig';
import { API_ENDPOINTS } from '@/utils/api.endpoints';
import type {
  SavedLink,
  CreateLinkRequest,
  ApiLinkResponse,
  LinkSource,
  LinkCategory,
} from './links.types';

export const linksService = {
  async create(payload: CreateLinkRequest): Promise<ApiLinkResponse> {
    const { data } = await httpPrivate.post<ApiLinkResponse>(
      API_ENDPOINTS.LINKS,
      payload,
    );
    return data;
  },

  async list(opts?: {
    search?: string;
    source?: LinkSource;
    category?: string;
    folderId?: string;
  }): Promise<SavedLink[]> {
    const params = new URLSearchParams();
    if (opts?.search) params.set('search', opts.search);
    if (opts?.source) params.set('source', opts.source);
    if (opts?.category) params.set('category', opts.category);
    if (opts?.folderId) params.set('folderId', opts.folderId);
    const qs = params.toString();
    const url = qs ? `${API_ENDPOINTS.LINKS_LIST}?${qs}` : API_ENDPOINTS.LINKS_LIST;
    const { data } = await httpPrivate.get<ApiLinkResponse>(url);
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to fetch links');
    }
    return data.data as SavedLink[];
  },

  async searchSemantic(query: string, limit?: number): Promise<SavedLink[]> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set('limit', String(limit));
    const { data } = await httpPrivate.get<ApiLinkResponse>(
      `${API_ENDPOINTS.LINKS_SEARCH}?${params.toString()}`,
    );
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to search links');
    }
    return data.data as SavedLink[];
  },
};

export function useLinks(opts?: {
  search?: string;
  source?: LinkSource;
  category?: LinkCategory | '';
  folderId?: string;
}) {
  return useQuery({
    queryKey: [
      'links',
      opts?.search ?? '',
      opts?.source ?? '',
      opts?.category ?? '',
      opts?.folderId ?? '',
    ],
    queryFn: () => linksService.list(opts),
  });
}

export function useSemanticSearch(query: string) {
  return useQuery({
    queryKey: ['links', 'search', query],
    queryFn: () => linksService.searchSemantic(query),
    enabled: query.trim().length > 0,
  });
}
