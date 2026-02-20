import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IEdmAuditEvent } from '@/interfaces/IEdmDocument';

interface Props {
  events: IEdmAuditEvent[];
}

export function AuditCard({ events }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit действий</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Audit-записи пока отсутствуют.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="rounded border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{event.action}</Badge>
                {event.stage ? (
                  <Badge variant="outline">
                    Этап #{event.stage.orderNo} ({event.stage.stageType})
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(new Date(event.createdAt), 'dd.MM.yyyy HH:mm')} | Актор:{' '}
                {event.actorUser?.name ?? '—'}
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
