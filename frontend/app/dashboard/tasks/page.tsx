'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { ITask, TaskStatus } from '@/interfaces/ITask';
import { CreateTaskDialog } from './components/create-task-dialog';
import Link from 'next/link';
import { format } from 'date-fns';
import { extractListItems, ListResponse } from '@/lib/list-response';

const statusLabel: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Завершена',
};

const statusBadgeClass: Record<TaskStatus, string> = {
  new: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  in_progress: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  completed: 'bg-green-500/15 text-green-700 dark:text-green-400',
};

export default function TasksPage() {
  const { accessToken } = useAuth();
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await api.get<ListResponse<ITask> | ITask[]>('/task');
      setTasks(extractListItems(res.data));
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchTasks();
  }, [accessToken]);

  const filterTasks = (status?: TaskStatus) => {
    if (!status) return tasks;
    return tasks.filter((t) => t.status === status);
  };

  const renderTaskList = (filteredTasks: ITask[]) => {
    if (filteredTasks.length === 0) {
      return <p className="text-sm text-muted-foreground py-4">Нет задач</p>;
    }
    return (
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Link
            key={task.id}
            href={`/dashboard/tasks/${task.id}`}
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="space-y-1">
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {task.description}
              </p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>От: {task.creator?.name}</span>
                <span>Кому: {task.receiver?.name}</span>
                <span>{format(new Date(task.createdAt), 'dd.MM.yyyy')}</span>
              </div>
            </div>
            <Badge className={statusBadgeClass[task.status]} variant="outline">
              {statusLabel[task.status]}
            </Badge>
          </Link>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Задачи</CardTitle>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            Создать задачу
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Все ({tasks.length})</TabsTrigger>
              <TabsTrigger value="new">
                Новые ({filterTasks('new').length})
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                В работе ({filterTasks('in_progress').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Завершены ({filterTasks('completed').length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">{renderTaskList(tasks)}</TabsContent>
            <TabsContent value="new">{renderTaskList(filterTasks('new'))}</TabsContent>
            <TabsContent value="in_progress">
              {renderTaskList(filterTasks('in_progress'))}
            </TabsContent>
            <TabsContent value="completed">
              {renderTaskList(filterTasks('completed'))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchTasks}
      />
    </>
  );
}
