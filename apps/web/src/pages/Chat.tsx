import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, User, ArrowLeft, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { useConversations, useMessages, useSendMessage } from '../hooks/api';
import { LoadingScreen, ErrorBanner, EmptyState } from '../components/ui';
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

  useEffect(() => { if (urlConversationId) setActiveId(urlConversationId); }, [urlConversationId]);

  const selectConversation = useCallback((id: string | undefined) => {
    setActiveId(id);
    setLiveMessages([]);
    if (!id) { setSearchParams({}); } else { setSearchParams({ conversation: id }); }
  }, [setSearchParams]);

  const apiMessages: Message[] = (msgData?.data ?? []);
  const allMessages = [...apiMessages, ...liveMessages.filter((lm) => !apiMessages.some((m) => m.id === lm.id))];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [allMessages.length]);

  useEffect(() => {
    if (!accessToken) return;
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined || window.location.origin).replace(/\/api\/v1\/?$/, '');
    const wsUrl = new URL('/ws/chat', apiBase);
    wsUrl.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl.searchParams.set('token', accessToken);
    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      if (activeId) ws.send(JSON.stringify({ subscribe: 'conversation', conversationId: activeId }));
    };
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (['connected', 'subscribed', 'pong'].includes(payload.type)) return;
        const msg: Message | undefined = payload?.data;
        if (msg?.id && msg.conversationId === activeId) {
          setLiveMessages((prev) => prev.some((p) => p.id === msg.id) ? prev : [...prev, msg]);
        }
      } catch { }
    };
    ws.onerror = () => { };
    return () => { ws.close(); wsRef.current = null; };
  }, [accessToken, activeId]);

  useEffect(() => {
    if (activeId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ subscribe: 'conversation', conversationId: activeId }));
      setLiveMessages([]);
    }
  }, [activeId]);

  if (isLoading) return <LoadingScreen />;

  const conversations = convoData?.data ?? [];
  const getConvoTitle = (c: any) => c.otherPartyName || c.subject || 'Discussion';

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {!activeId ? (
        <div className="p-4">
          <div className="mb-4">
            <h1 className="text-xl font-extrabold text-slate-900">Messages</h1>
            <p className="text-sm text-slate-500">Discutez avec vos soignants</p>
          </div>
          {convoError && <div className="mb-3"><ErrorBanner error={convoError} onRetry={refetchConvos} /></div>}
          <div className="mt-3 space-y-2.5">
            {conversations.filter(Boolean).map((c: any) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className="card-surface flex cursor-pointer items-center gap-3 p-3.5 transition-all hover:shadow-card-hover active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-emerald-50">
                  <User className="h-5 w-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{getConvoTitle(c)}</p>
                  {c.lastMessage ? (
                    <p className="text-xs text-slate-500 truncate">{c.lastMessage}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nouvelle conversation</p>
                  )}
                </div>
                {(c.patientUnreadCount || c.providerUnreadCount) > 0 && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                    {(c.patientUnreadCount || 0) + (c.providerUnreadCount || 0)}
                  </span>
                )}
              </div>
            ))}
            {!conversations.length && (
              <EmptyState
                icon={MessageCircle}
                title="Aucune conversation"
                subtitle="Commencez une conversation depuis le profil d'un soignant."
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
            <button onClick={() => selectConversation(undefined)} className="rounded-full p-2 transition-colors hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-emerald-50">
              <User className="h-4 w-4 text-brand-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              {conversations.find((c: any) => c.id === activeId)?.otherPartyName || 'Discussion'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {msgLoading && <p className="text-center text-xs text-slate-400">Chargement…</p>}
            {msgError && <ErrorBanner error={msgError} onRetry={refetchMessages} />}
            {allMessages.map((m) => (
              <div key={m.id} className={`flex ${m.senderId === userId ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all ${
                    m.senderId === userId
                      ? 'bg-brand-600 text-white rounded-br-md'
                      : 'bg-white text-slate-900 border border-slate-100 rounded-bl-md'
                  }`}
                >
                  <p className="leading-relaxed">{m.content}</p>
                  <p className={`mt-1 text-[10px] ${m.senderId === userId ? 'text-brand-200' : 'text-slate-400'}`}>
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
              send.mutate({ conversationId: activeId, content: text.trim() }, { onSuccess: () => setText('') });
            }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-3"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Votre message…"
              className="flex-1 rounded-full border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
            />
            <button
              type="submit"
              disabled={send.isPending || !text.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
