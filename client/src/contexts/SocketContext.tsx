import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Message } from '../types';
import { isSupabaseConfigured, supabase } from '../services/supabase';

interface TypingInfo {
  userId: number;
  displayName: string;
  timestamp: number;
}

interface SocketContextType {
  isConnected: boolean;
  onlineUsers: Set<number>;
  typingMap: { [chatId: number]: TypingInfo[] };
  sendMessage: (chatId: number, body: string, extra?: Partial<Message>) => void;
  sendTyping: (chatId: number, state?: 'typing' | 'stopped') => void;
  markRead: (chatId: number, upToMsgId?: string) => void;
  onNewMessage: (cb: (msg: Message) => void) => () => void;
  onMessageRead: (cb: (data: { chat_id: number; user_id: number; up_to_msg_id?: string }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingMap, setTypingMap] = useState<{ [chatId: number]: TypingInfo[] }>({});

  const wsRef = useRef<WebSocket | null>(null);
  const supabaseChannelRef = useRef<any>(null);
  const messageListeners = useRef<Set<(msg: Message) => void>>(new Set());
  const readListeners = useRef<Set<(data: any) => void>>(new Set());

  // Connection Handler (Dual Mode: Supabase Realtime OR Local WebSocket)
  useEffect(() => {
    if (!token || !user) {
      if (wsRef.current) wsRef.current.close();
      if (supabaseChannelRef.current) supabaseChannelRef.current.unsubscribe();
      return;
    }

    if (isSupabaseConfigured && supabase) {
      console.log('⚡ Connecting via Supabase Realtime channel...');
      const channel = supabase.channel('alaqe-realtime-room', {
        config: { broadcast: { self: false } },
      });

      supabaseChannelRef.current = channel;

      // 1. Listen for new messages inserted in Supabase
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            const row = payload.new as any;
            // Fetch sender info if needed
            let sender = {
              id: row.sender_id,
              display_name: 'ئىشلەتكۈچى',
              username: '',
              avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${row.sender_id}`,
            };

            try {
              const { data: u } = await supabase!
                .from('users')
                .select('id, display_name, username, avatar_url')
                .eq('id', row.sender_id)
                .single();
              if (u) sender = u;
            } catch {}

            const formattedMsg: Message = {
              id: row.msg_id || row.id.toString(),
              msg_id: row.msg_id || row.id.toString(),
              chat_id: row.chat_id,
              sender_id: row.sender_id,
              sender,
              type: row.type || 'text',
              body: row.body || '',
              media_url: row.media_url,
              file_name: row.file_name,
              file_size: row.file_size,
              voice_duration: row.voice_duration,
              reply_to: row.reply_to,
              status: row.status || 'sent',
              created_at: row.created_at || new Date().toISOString(),
            };

            messageListeners.current.forEach((cb) => cb(formattedMsg));
          }
        )
        // 2. Typing indicator broadcast
        .on('broadcast', { event: 'typing' }, (payload) => {
          const { chat_id, user_id, display_name, state } = payload.payload;
          setTypingMap((prev) => {
            const currentList = prev[chat_id] || [];
            if (state === 'typing') {
              const filtered = currentList.filter((item) => item.userId !== user_id);
              return {
                ...prev,
                [chat_id]: [...filtered, { userId: user_id, displayName: display_name, timestamp: Date.now() }],
              };
            } else {
              return {
                ...prev,
                [chat_id]: currentList.filter((item) => item.userId !== user_id),
              };
            }
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            console.log('✅ Supabase Realtime channel active!');
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }

    // Local WebSocket fallback
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/v1/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('⚡ Connected to local Alaqe Realtime WebSocket!');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: evt, data } = payload;

        switch (evt) {
          case 'message.new':
            messageListeners.current.forEach((cb) => cb(data));
            break;

          case 'message.read':
            readListeners.current.forEach((cb) => cb(data));
            break;

          case 'presence.update':
            setOnlineUsers((prev) => {
              const updated = new Set(prev);
              if (data.online) updated.add(data.user_id);
              else updated.delete(data.user_id);
              return updated;
            });
            break;

          case 'typing': {
            const { chat_id, user_id, display_name, state } = data;
            setTypingMap((prev) => {
              const currentList = prev[chat_id] || [];
              if (state === 'typing') {
                const filtered = currentList.filter((item) => item.userId !== user_id);
                return {
                  ...prev,
                  [chat_id]: [...filtered, { userId: user_id, displayName: display_name, timestamp: Date.now() }],
                };
              } else {
                return {
                  ...prev,
                  [chat_id]: currentList.filter((item) => item.userId !== user_id),
                };
              }
            });
            break;
          }
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(() => {
        if (token) setOnlineUsers(new Set());
      }, 2000);
    };

    return () => {
      ws.close();
    };
  }, [token, user]);

  // Stale typing cleanup
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTypingMap((prev) => {
        let changed = false;
        const next: { [chatId: number]: TypingInfo[] } = {};
        for (const [chatIdStr, list] of Object.entries(prev)) {
          const chatId = Number(chatIdStr);
          const active = list.filter((item) => now - item.timestamp < 4000);
          if (active.length !== list.length) changed = true;
          if (active.length > 0) next[chatId] = active;
        }
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const sendMessage = useCallback(
    async (chatId: number, body: string, extra: Partial<Message> = {}) => {
      if (!user) return;

      // If Supabase is active, insert row directly
      if (isSupabaseConfigured && supabase) {
        const msgId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
        await supabase.from('messages').insert({
          msg_id: msgId,
          chat_id: chatId,
          sender_id: user.id,
          type: extra.type || 'text',
          body: body || '',
          media_url: extra.media_url || null,
          file_name: extra.file_name || null,
          file_size: extra.file_size || null,
          voice_duration: extra.voice_duration || null,
          reply_to: extra.reply_to || null,
          status: 'sent',
        });
        return;
      }

      // Local WebSocket mode
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'message.send',
            data: {
              chat_id: chatId,
              body,
              type: extra.type || 'text',
              media_url: extra.media_url,
              file_name: extra.file_name,
              file_size: extra.file_size,
              voice_duration: extra.voice_duration,
              reply_to: extra.reply_to,
              temp_id: Date.now().toString(),
            },
          })
        );
      }
    },
    [user]
  );

  const sendTyping = useCallback(
    (chatId: number, state: 'typing' | 'stopped' = 'typing') => {
      if (!user) return;

      if (isSupabaseConfigured && supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            chat_id: chatId,
            user_id: user.id,
            display_name: user.display_name,
            state,
          },
        });
        return;
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'typing',
            data: { chat_id: chatId, state },
          })
        );
      }
    },
    [user]
  );

  const markRead = useCallback((chatId: number, upToMsgId?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'message.read',
          data: { chat_id: chatId, up_to_msg_id: upToMsgId },
        })
      );
    }
  }, []);

  const onNewMessage = useCallback((cb: (msg: Message) => void) => {
    messageListeners.current.add(cb);
    return () => {
      messageListeners.current.delete(cb);
    };
  }, []);

  const onMessageRead = useCallback((cb: (data: any) => void) => {
    readListeners.current.add(cb);
    return () => {
      readListeners.current.delete(cb);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        onlineUsers,
        typingMap,
        sendMessage,
        sendTyping,
        markRead,
        onNewMessage,
        onMessageRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
