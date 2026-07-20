// [Claude.A8] Asset Manager - API Client
// Thin fetch wrapper around the FastAPI asset endpoints defined in
// contracts/API_CONTRACT.md. All network access to assets goes through here
// so retry/error handling and auth headers stay centralized.

import type { Asset, AssetSearchParams, PaginatedAssets, AssetFolder } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

class AssetApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AssetApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch {
      /* no-op: body wasn't JSON */
    }
    throw new AssetApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const assetApi = {
  // GET /api/assets
  async list(params: AssetSearchParams): Promise<PaginatedAssets> {
    const qs = buildQuery({
      folder: params.folderId,
      tags: params.tags,
      search: params.query,
      type: params.types,
      sort: params.sort,
      direction: params.direction,
      page: params.page,
      pageSize: params.pageSize,
      favoritedOnly: params.favoritedOnly,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    return request<PaginatedAssets>(`/assets${qs}`);
  },

  // GET /api/assets/{assetId}
  async get(assetId: string): Promise<Asset> {
    return request<Asset>(`/assets/${assetId}`);
  },

  // POST /api/assets
  async upload(
    file: File,
    metadata: { tags?: string[]; description?: string; folderId?: string | null },
    onProgress?: (pct: number) => void
  ): Promise<{ assetId: string; previewUrl: string }> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      form.append('metadata', JSON.stringify(metadata));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/assets`);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new AssetApiError(xhr.statusText, xhr.status));
        }
      };
      xhr.onerror = () => reject(new AssetApiError('Network error during upload', 0));
      xhr.send(form);
    });
  },

  // POST /api/assets/batch-upload
  async batchUpload(files: File[], folderId?: string | null): Promise<{ jobId: string }> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    if (folderId) form.append('folderId', folderId);
    return request<{ jobId: string }>('/assets/batch-upload', { method: 'POST', body: form });
  },

  // PUT /api/assets/{assetId}
  async update(
    assetId: string,
    patch: Partial<Pick<Asset, 'name' | 'description' | 'tags' | 'folderId' | 'collections'>>
  ): Promise<Asset> {
    return request<Asset>(`/assets/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  // DELETE /api/assets/{assetId}
  async remove(assetId: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/assets/${assetId}`, { method: 'DELETE' });
  },

  async removeMany(assetIds: string[]): Promise<{ deleted: string[] }> {
    return request<{ deleted: string[] }>('/assets/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ assetIds }),
    });
  },

  // GET /api/assets/search
  async search(query: string, filters: AssetSearchParams): Promise<PaginatedAssets> {
    const qs = buildQuery({ query, ...filters });
    return request<PaginatedAssets>(`/assets/search${qs}`);
  },

  // GET /api/assets/preview/{assetId}
  previewUrl(assetId: string, size: 200 | 400 | 1200 = 400): string {
    return `${BASE_URL}/assets/preview/${assetId}?size=${size}`;
  },

  // POST /api/assets/import-from-url
  async importFromUrl(url: string, metadata?: { tags?: string[]; folderId?: string | null }): Promise<{ assetId: string }> {
    return request<{ assetId: string }>('/assets/import-from-url', {
      method: 'POST',
      body: JSON.stringify({ url, metadata }),
    });
  },

  async listFolders(projectId: string): Promise<AssetFolder[]> {
    return request<AssetFolder[]>(`/assets/folders${buildQuery({ projectId })}`);
  },

  async createFolder(projectId: string, name: string, parentId: string | null): Promise<AssetFolder> {
    return request<AssetFolder>('/assets/folders', {
      method: 'POST',
      body: JSON.stringify({ projectId, name, parentId }),
    });
  },

  async renameFolder(folderId: string, name: string): Promise<AssetFolder> {
    return request<AssetFolder>(`/assets/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  async deleteFolder(folderId: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/assets/folders/${folderId}`, { method: 'DELETE' });
  },
};

export { AssetApiError };
