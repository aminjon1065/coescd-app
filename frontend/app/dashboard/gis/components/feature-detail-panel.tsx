'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { X, Pencil, Trash2, Check } from 'lucide-react';
import { IGisFeature, GisFeatureSeverity, GisFeatureStatus } from '@/interfaces/IGisFeature';
import { gisApi } from '@/lib/api/gis';
import { format } from 'date-fns';
import { SEVERITY_COLORS, SEVERITY_LABEL, STATUS_LABEL } from './map-container';

interface Props {
  feature: IGisFeature;
  canWrite: boolean;
  onClose: () => void;
  onUpdated: (feature: IGisFeature) => void;
  onDeleted: (id: number) => void;
}

export function FeatureDetailPanel({
  feature,
  canWrite,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [severity, setSeverity] = useState(feature.severity);
  const [status, setStatus] = useState(feature.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await gisApi.updateFeature(feature.id, { severity, status });
      onUpdated(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Удалить объект "${feature.title}"?`)) return;
    setDeleting(true);
    try {
      await gisApi.deleteFeature(feature.id);
      onDeleted(feature.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-3">
        <h3 className="font-semibold text-sm leading-tight">{feature.title}</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator className="mb-3" />

      <div className="flex-1 space-y-3 overflow-y-auto text-sm">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            style={{
              borderColor: SEVERITY_COLORS[feature.severity],
              color: SEVERITY_COLORS[feature.severity],
            }}
          >
            {SEVERITY_LABEL[feature.severity]}
          </Badge>
          <Badge variant="outline">{STATUS_LABEL[feature.status]}</Badge>
        </div>

        {/* Description */}
        {feature.description && (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {feature.description}
          </p>
        )}

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          <span>Ш: {feature.latitude.toFixed(5)}</span>
          <span>Д: {feature.longitude.toFixed(5)}</span>
        </div>

        {/* Metadata */}
        {feature.layer && (
          <div className="text-xs">
            <span className="text-muted-foreground">Слой: </span>
            {feature.layer.name}
          </div>
        )}
        {feature.department && (
          <div className="text-xs">
            <span className="text-muted-foreground">Подразделение: </span>
            {feature.department.name}
          </div>
        )}
        {feature.createdBy && (
          <div className="text-xs">
            <span className="text-muted-foreground">Создал: </span>
            {feature.createdBy.name}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {format(new Date(feature.createdAt), 'dd.MM.yyyy HH:mm')}
        </div>

        {/* Edit controls */}
        {canWrite && editing && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Серьёзность</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as GisFeatureSeverity)}>
                  <SelectTrigger className="h-8 text-xs">
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
              <div className="space-y-1">
                <Label className="text-xs">Статус</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as GisFeatureStatus)}>
                  <SelectTrigger className="h-8 text-xs">
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
          </>
        )}
      </div>

      {/* Action buttons */}
      {canWrite && (
        <>
          <Separator className="mt-3 mb-2" />
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setEditing(false)}
                >
                  Отмена
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Изменить
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
