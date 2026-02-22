'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { gisApi } from '@/lib/api/gis';
import { IGisFeature } from '@/interfaces/IGisFeature';

interface Props {
  open: boolean;
  latitude: number;
  longitude: number;
  onOpenChange: (open: boolean) => void;
  onCreated: (feature: IGisFeature) => void;
}

export function CreateFeatureDialog({
  open,
  latitude,
  longitude,
  onOpenChange,
  onCreated,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<string>('medium');
  const [status, setStatus] = useState<string>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const created = await gisApi.createFeature({
        title: title.trim(),
        description: description.trim() || undefined,
        latitude,
        longitude,
        severity,
        status,
      });
      onCreated(created);
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setSeverity('medium');
      setStatus('active');
    } catch {
      setError('Не удалось создать объект. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новый объект на карте</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Широта: {latitude.toFixed(5)}</span>
            <span>Долгота: {longitude.toFixed(5)}</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gf-title">Название *</Label>
            <Input
              id="gf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название объекта"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gf-desc">Описание</Label>
            <Textarea
              id="gf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание ситуации"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Серьёзность</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкая</SelectItem>
                  <SelectItem value="medium">Средняя</SelectItem>
                  <SelectItem value="high">Высокая</SelectItem>
                  <SelectItem value="critical">Критическая</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Статус</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активная</SelectItem>
                  <SelectItem value="monitoring">Мониторинг</SelectItem>
                  <SelectItem value="resolved">Устранена</SelectItem>
                  <SelectItem value="archived">Архив</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Сохранение…' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
