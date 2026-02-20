import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { IEdmDocument } from '@/interfaces/IEdmDocument';

interface Props {
  document: IEdmDocument;
  stageCommentById: Record<number, string>;
  stageActionLoadingId: number | null;
  onStageCommentChange: (stageId: number, value: string) => void;
  onExecuteStageAction: (
    stageId: number,
    action: 'approved' | 'rejected' | 'returned_for_revision' | 'commented',
  ) => void;
  onSubmitToRoute: () => void;
  onArchiveDocument: () => void;
  submittingToRoute: boolean;
  archiving: boolean;
}

export function RouteActionsCard({
  document,
  stageCommentById,
  stageActionLoadingId,
  onStageCommentChange,
  onExecuteStageAction,
  onSubmitToRoute,
  onArchiveDocument,
  submittingToRoute,
  archiving,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Маршрут</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!document.route ? (
          <p className="text-sm text-muted-foreground">Маршрут не инициирован</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              Версия #{document.route.versionNo}, состояние: {document.route.state}
            </p>
            <div className="space-y-2">
              {document.route.stages.map((stage) => (
                <div key={stage.id} className="rounded border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      Этап {stage.orderNo}: {stage.stageType}
                    </p>
                    <Badge variant="outline">{stage.state}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Исполнитель:{' '}
                    {stage.assigneeUser?.name ??
                      stage.assigneeDepartment?.name ??
                      stage.assigneeType}
                  </p>
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={stageCommentById[stage.id] ?? ''}
                      onChange={(event) => onStageCommentChange(stage.id, event.target.value)}
                      placeholder="Комментарий к действию этапа (опционально)"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => onExecuteStageAction(stage.id, 'approved')}
                        disabled={
                          !['pending', 'in_progress'].includes(stage.state) ||
                          stageActionLoadingId === stage.id
                        }
                      >
                        Утвердить
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onExecuteStageAction(stage.id, 'rejected')}
                        disabled={
                          !['pending', 'in_progress'].includes(stage.state) ||
                          stageActionLoadingId === stage.id
                        }
                      >
                        Отклонить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onExecuteStageAction(stage.id, 'returned_for_revision')}
                        disabled={
                          !['pending', 'in_progress'].includes(stage.state) ||
                          stageActionLoadingId === stage.id
                        }
                      >
                        На доработку
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onExecuteStageAction(stage.id, 'commented')}
                        disabled={
                          !['pending', 'in_progress'].includes(stage.state) ||
                          stageActionLoadingId === stage.id
                        }
                      >
                        Комментарий
                      </Button>
                    </div>
                    {!['pending', 'in_progress'].includes(stage.state) ? (
                      <p className="text-xs text-muted-foreground">
                        Этап закрыт, действия недоступны.
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {document.status === 'draft' ? (
            <Button onClick={onSubmitToRoute} disabled={submittingToRoute}>
              {submittingToRoute ? 'Отправка...' : 'Отправить в маршрут'}
            </Button>
          ) : null}
          {document.status === 'approved' ? (
            <Button onClick={onArchiveDocument} disabled={archiving}>
              {archiving ? 'Архивирование...' : 'Отправить в архив'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
