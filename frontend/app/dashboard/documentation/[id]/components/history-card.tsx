import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IEdmHistoryEvent } from '@/interfaces/IEdmDocument';

interface Props {
  events: IEdmHistoryEvent[];
}

export function HistoryCard({ events }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>История движения</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">История пока пустая.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="rounded border px-3 py-2">
              <p className="text-sm font-medium">{event.eventType}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(event.createdAt), 'dd.MM.yyyy HH:mm')}
              </p>
              <p className="text-xs text-muted-foreground">
                От: {event.fromUser?.name ?? '—'} | Кому: {event.toUser?.name ?? '—'}
              </p>
              {event.commentText ? (
                <p className="mt-1 text-sm whitespace-pre-wrap">{event.commentText}</p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
