import { motion } from 'framer-motion';
import { DisclaimerBanner } from '../research/DisclaimerBanner';
import type { ChatMessage } from '../../types/chat';

const DISCLAIMER_TEXT =
  'AI-generated research for informational purposes only. This is not investment advice. No human analyst review. StockSense is not a SEBI-registered investment adviser or research analyst.';

interface Props {
  message: ChatMessage;
}

export function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm border border-border bg-card text-foreground'
          }`}
        >
          {message.content}
        </div>

        {/* Disclaimer — only on assistant messages that are recommendation-shaped */}
        {!isUser && message.disclaimer && (
          <DisclaimerBanner text={DISCLAIMER_TEXT} />
        )}

        {/* Confidence chip — only on assistant messages */}
        {!isUser && message.confidence !== null && (
          <span className="text-xs text-muted-foreground">
            Confidence: {Math.round(message.confidence * 100)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
