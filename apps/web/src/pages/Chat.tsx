import { useState, useEffect, useRef } from 'react';
import { Send, User } from 'lucide-react';
import { useConversations, useMessages, useSendMessage } from '../hooks/api';
import { LoadingScreen } from '../components/ui';

export function Chat() {
  const { data: convoData, isLoading } = useConversations();
  const [activeId, setActiveId] = useState<string | undefined>();
  const { data: msgData } = useMessages(activeId);
  const send = useSendMessage();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgData]);

  if (isLoading) return <LoadingScreen />;

  const conversations = convoData?.data ?? [];

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {!activeId ? (
        <div className="p-4">
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
          <div className="mt-3 space-y-2">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                  <User className="h-5 w-5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.title}</p>
                  {c.lastMessage && (
                    <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
                  )}
                </div>
              </div>
            ))}
            {!conversations.length && <p className="text-center text-sm text-gray-400">Aucune conversation.</p>}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h2 className="text-sm font-semibold">{conversations.find((c) => c.id === activeId)?.title ?? 'Discussion'}</h2>
            <button onClick={() => setActiveId(undefined)} className="text-xs text-gray-500">Fermer</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(msgData?.data ?? []).map((m) => (
              <div
                key={m.id}
                className={`flex ${m.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    m.senderId === 'me'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {m.content}
                  <p className={`mt-1 text-[10px] ${m.senderId === 'me' ? 'text-brand-200' : 'text-gray-400'}`}>
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
              if (!text.trim()) return;
              send.mutate({ receiverId: activeId, content: text });
              setText('');
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
              disabled={send.isPending}
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
