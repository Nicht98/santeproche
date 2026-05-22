import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, User, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { useConversations, useMessages, useSendMessage } from '../hooks/api';
import { LoadingScreen, ErrorBanner } from '../components/ui';
import { useSearchParams } from 'react-router-dom';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  createdAt: string;
}

export function Chat() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const accessToken = useAuthStore((s) => s.accessToken);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlConversationId = searchParams.get('conversation') || undefined;

  const { data: convoData, isLoading, error: convoError, refetch: refetchConvos } = useConversations();
  const [activeId, setActiveId] = useState<string | undefined>(urlConversationId);
  const { data: msgData, isLoading: msgLoading, error: msgError, refetch: refetchMessages } = useMessages(activeId);
  const send = useSendMessage();
  const [text, setText] = useState('');
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Sync URL → activeId
  useEffect(() => {
    if (urlConversationId) setActiveId(urlConversationId);
  }, [urlConversationId]);

  // When activeId changes, clear URL param
  const selectConversation = useCallback((id: string | undefined) => {
    setActiveId(id);
    setLiveMessages([]);
    if (!id) {
      setSearchParams({});
    } else {
      setSearchParams({ conversation: id });
    }
  }, [setSearchParams]);

  // Merge API messages + live WebSocket messages
  const apiMessages: Message[] = (msgData?.data ?? []);
  const allMessages = [...apiMessages, ...liveMessages.filter((lm) => !apiMessages.some((m) => m.id === lm.id))];

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  // WebSocket for real-time messages
  useEffect(() => {
    if (!accessToken) return;
    const wsUrl = new URL('/ws/chat', window.location.origin);
    wsUrl.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl.searchParams.set('token', accessToken);

    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribe to active conversation when WS connects
      if (activeId) {
        ws.send(JSON.stringify({ subscribe: 'conversation', conversationId: activeId }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'connected') return;
        if (payload.type === 'subscribed') return;
        if (payload.type === 'pong') return;

        const msg: Message | undefined = payload?.data;
        if (msg?.id && msg.conversationId === activeId) {
          setLiveMessages((prev) => {
            if (prev.some((p) => p.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      } catch { /* ignore non-JSON */ }
    };

    ws.onerror = () => {
      // Silent — will auto-reconnect via effect re-run if token changes
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [accessToken, activeId]);

  // Subscribe to new conversation when activeId changes
  useEffect(() => {
    if (activeId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ subscribe: 'conversation', conversationId: activeId }));
      setLiveMessages([]);
    }
  }, [activeId]);

  if (isLoading) return <LoadingScreen />;

  const conversations = convoData?.data ?? [];

  // Determine display name for the conversation list
  const getConvoTitle = (c: any) => c.otherPartyName || c.subject || 'Discussion';

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {!activeId ? (
        <div className="p-4">
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
          {convoError && <div className="mt-2"><ErrorBanner error={convoError} onRetry={refetchConvos} /></div>}
          <div className="mt-3 space-y-2">
            {conversations.map((c: any) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                  <User className="h-5 w-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{getConvoTitle(c)}</p>
                  {c.lastMessage ? (
                    <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Nouvelle conversation</p>
                  )}
                </div>
                {c.patientUnreadCount > 0 || c.providerUnreadCount > 0 ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    {(c.patientUnreadCount || 0) + (c.providerUnreadCount || 0)}
                  </span>
                ) : null}
              </div>
            ))}
            {!conversations.length && (
              <p className="text-center text-sm text-gray-400">Aucune conversation. Commencez-en une depuis le profil d'un soignant.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <button
              onClick={() => selectConversation(undefined)}
              className="rounded-full p-1 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <h2 className="text-sm font-semibold">
              {conversations.find((c: any) => c.id === activeId)?.otherPartyName || 'Discussion'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgLoading && <p className="text-center text-xs text-gray-400">Chargement…</p>}
            {msgError && <ErrorBanner error={msgError} onRetry={refetchMessages} />}

            {allMessages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.senderId === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    m.senderId === userId
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p>{m.content}</p>
                  <p className={`mt-1 text-[10px] ${m.senderId === userId ? 'text-brand-200' : 'text-gray-400'}`}>
                    {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim() || !activeId || send.isPending) return;
              send.mutate({ conversationId: activeId, content: text.trim() }, {
                onSuccess: () => setText(''),
              });
            }}
            className="flex items-center gap-2 border-t px-4 py-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Votre message…"
              className="flex-1 rounded-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={send.isPending || !text.trim()}
              className="rounded-full bg-brand-600 p-2 text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
