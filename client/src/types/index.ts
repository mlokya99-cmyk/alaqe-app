export interface User {
  id: number;
  phone: string;
  username: string | null;
  display_name: string;
  avatar_url: string;
  bio?: string;
  last_seen?: string;
  is_online?: boolean;
}

export interface Chat {
  id: number;
  type: 'dm' | 'group' | 'channel';
  title: string;
  avatar_url: string;
  owner_id?: number;
  role?: string;
  is_online?: boolean;
  other_user?: User;
  member_count?: number;
  latest_message?: Message | null;
  unread_count: number;
  last_activity: string;
}

export interface Message {
  id: string;
  msg_id: string;
  chat_id: number;
  sender_id: number;
  sender: {
    id: number;
    display_name: string;
    username: string;
    avatar_url: string;
  };
  type: 'text' | 'image' | 'voice' | 'file';
  body: string;
  media_url?: string;
  file_name?: string;
  file_size?: number;
  voice_duration?: number;
  reply_to?: string;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  edited_at?: string;
}

export interface SocketEvent {
  event: string;
  data: any;
}
