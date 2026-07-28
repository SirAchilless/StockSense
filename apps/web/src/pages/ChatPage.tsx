import { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';

const SUGGESTIONS = [
  'What are the key risks for this stock?',
  'Summarise the bull case based on current data.',
  'How does the P/E compare to the sector?',
  'What does the debt-to-equity ratio indicate?',
];

export default function ChatPage() {
  const { messages, contextSymbol, setContextSymbol, isLoading, error, sendMessage, reset } =
    useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold">AI Chat</h1>
          {/* Symbol context badge */}
          {contextSymbol && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {contextSymbol}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Symbol context input */}
          <input
            value={contextSymbol}
            onChange={(e) => setContextSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol (optional)"
            maxLength={20}
            className="w-36 rounded-lg border border-input bg-background px-2 py-1 font-mono text-xs uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Stock symbol context"
          />
          {hasMessages && (
            <button
              onClick={reset}
              className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!hasMessages && (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="space-y-1">
              <p className="text-lg font-medium">Ask me about any NSE stock</p>
              <p className="text-sm text-muted-foreground">
                Enter a symbol above to ground my answers in live market data.
                <br />
                Without a symbol I'll answer from general context only.
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>

            <p className="max-w-sm text-xs text-muted-foreground/60">
              AI-generated for informational purposes only. Not investment advice.
              Not from a SEBI-registered analyst.
            </p>
          </div>
        )}

        {hasMessages && (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            {error && (
              <p className="text-center text-xs text-destructive">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
          <p className="mt-2 text-center text-xs text-muted-foreground/50">
            All answers are grounded in fetched market data. AI may still be wrong — verify before acting.
          </p>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
