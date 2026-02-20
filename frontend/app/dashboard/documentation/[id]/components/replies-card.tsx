import { format } from 'date-fns';
import { SendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { IEdmReply } from '@/interfaces/IEdmDocument';

interface Props {
  replies: IEdmReply[];
  replyText: string;
  replySending: boolean;
  onReplyTextChange: (value: string) => void;
  onSendReply: () => void;
}

export function RepliesCard({
  replies,
  replyText,
  replySending,
  onReplyTextChange,
  onSendReply,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Переписка по документу</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={replyText}
            onChange={(event) => onReplyTextChange(event.target.value)}
            placeholder="Напишите сообщение в тред документа..."
          />
          <Button onClick={onSendReply} disabled={replySending || !replyText.trim()}>
            <SendIcon className="mr-2 h-4 w-4" />
            {replySending ? 'Отправка...' : 'Отправить'}
          </Button>
        </div>
        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Сообщений пока нет.</p>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="rounded border px-3 py-2">
              <p className="text-sm">{reply.messageText}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {reply.senderUser?.name ?? '—'} |{' '}
                {format(new Date(reply.createdAt), 'dd.MM.yyyy HH:mm')}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
