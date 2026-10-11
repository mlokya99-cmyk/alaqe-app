import { User, Chat, Message } from '../types';

const BASE_URL = '/v1';

function getToken(): string | null {
  return localStorage.getItem('alaqe_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'مەلۇمات ئېلىشتا مەغلۇبىيەت كۆرۈلدى');
  }

  return data;
}

export const api = {
  auth: {
    sendCode: (phone: string) =>
      request<{ success: boolean; dev_code?: string; message: string }>('/auth/send_code', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),

    verifyCode: (data: { phone: string; code: string; display_name?: string; username?: string }) =>
      request<{ success: boolean; token: string; user: User }>('/auth/verify_code', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    quickLogin: (user_id?: number, username?: string) =>
      request<{ success: boolean; token: string; user: User }>('/auth/quick_login', {
        method: 'POST',
        body: JSON.stringify({ user_id, username }),
      }),

    getDemoUsers: () =>
      request<{ success: boolean; users: User[] }>('/auth/demo_users'),
  },

  users: {
    getMe: () =>
      request<{ success: boolean; user: User }>('/users/me'),

    updateProfile: (data: Partial<User>) =>
      request<{ success: boolean; user: User }>('/users/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    search: (q: string) =>
      request<{ success: boolean; users: User[] }>(`/users/search?q=${encodeURIComponent(q)}`),

    get: (id: number) =>
      request<{ success: boolean; user: User }>(`/users/${id}`),
  },

  chats: {
    list: () =>
      request<{ success: boolean; chats: Chat[] }>('/chats'),

    create: (data: { type: 'dm' | 'group' | 'channel'; target_user_id?: number; title?: string; member_ids?: number[] }) =>
      request<{ success: boolean; chat_id: number; is_existing?: boolean }>('/chats', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (id: number) =>
      request<{ success: boolean; chat: Chat & { members: (User & { role: string })[] } }>(`/chats/${id}`),

    getMessages: (id: number, limit = 50) =>
      request<{ success: boolean; messages: Message[] }>(`/chats/${id}/messages?limit=${limit}`),

    sendMessage: (chatId: number, data: Partial<Message>) =>
      request<{ success: boolean; message: Message }>(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    markRead: (chatId: number, up_to_msg_id?: string) =>
      request<{ success: boolean }>(`/chats/${chatId}/read`, {
        method: 'POST',
        body: JSON.stringify({ up_to_msg_id }),
      }),

    deleteMessage: (msgId: string) =>
      request<{ success: boolean; message: string }>(`/chats/messages/${msgId}`, {
        method: 'DELETE',
      }),
  },

  media: {
    upload: async (file: File | Blob, filename?: string) => {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file, filename || (file instanceof File ? file.name : 'audio.webm'));

      const res = await fetch(`${BASE_URL}/media/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ھۆججەت يۈكلەش مەغلۇپ بولدى');
      }
      return data as { success: boolean; media: { id: number; url: string; file_name: string; file_size: number; mime_type: string } };
    },
  },
};
