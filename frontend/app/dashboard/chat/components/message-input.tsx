'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SendHorizonal } from 'lucide-react';
import { TypingUser } from '@/hooks/useChatSocket';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  typingUsers: TypingUser[];
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  onTyping,
  typingUsers,
  disabled = false,
  placeholder = 'Напишите сообщение…',
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Debounced stop-typing signal
  const scheduleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        onTyping(false);
        isTypingRef.current = false;
      }
    }, 2000);
  }, [onTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (!isTypingRef.current) {
      onTyping(true);
      isTypingRef.current = true;
    }
    scheduleStopTyping();
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Signal stopped typing immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      onTyping(false);
      isTypingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typingLabel =
    typingUsers.length === 1
      ? `${typingUsers[0].name} печатает…`
      : typingUsers.length === 2
        ? `${typingUsers[0].name} и ${typingUsers[1].name} печатают…`
        : typingUsers.length > 2
          ? 'Несколько человек печатают…'
          : '';

  return (
    <div className="border-t bg-background px-4 py-3">
      {/* Typing indicator */}
      {typingLabel && (
        <p className="mb-1.5 text-[12px] italic text-muted-foreground">{typingLabel}</p>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="max-h-32 min-h-[40px] resize-none"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Отправить"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Enter — отправить · Shift+Enter — новая строка
      </p>
    </div>
  );
}
