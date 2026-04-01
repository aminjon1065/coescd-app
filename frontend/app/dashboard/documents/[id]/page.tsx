'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Settings,
  Users,
  GitBranch,
  MessageSquare,
  History,
  Loader2,
  Save,
  MoreHorizontal,
  Archive,
  Trash2,
  Lock,
  Unlock,
} from 'lucide-react';
import Link from 'next/link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import {
  getDocument,
  getVersion,
  saveDocumentContent,
  updateDocumentMetadata,
  archiveDocument,
  deleteDocument,
} from '@/lib/api/documents-v2';
import { StatusBadgeV2 } from '@/components/edm/StatusBadgeV2';
import { WorkflowPanel } from '@/components/edm/WorkflowPanel';
import { ActivityTimeline } from '@/components/edm/ActivityTimeline';
import { CommentsPanel } from '@/components/edm/CommentsPanel';
import { VersionHistory } from '@/components/edm/VersionHistory';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/toggle-theme';

type PanelTab = 'workflow' | 'activity' | 'comments' | 'versions' | null;

/* ── Toolbar button ── */
function TB({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'px-2 py-1 rounded text-xs font-medium transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activePanel, setActivePanel] = useState<PanelTab>('workflow');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  /* ── Load document ── */
  const { data: doc, isLoading } = useQuery({
    queryKey: ['document-v2', id],
    queryFn: () => getDocument(id),
    refetchInterval: false,
  });

  /* ── Load latest version content ── */
  const { data: latestVersion } = useQuery({
    queryKey: ['doc-version-latest', id, doc?.currentVersion],
    queryFn: () => getVersion(id, doc!.currentVersion),
    enabled: !!doc,
  });

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: (content: Record<string, unknown>) =>
      saveDocumentContent(id, content, true),
    onSuccess: () => {
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    },
  });

  const titleMutation = useMutation({
    mutationFn: (title: string) => updateDocumentMetadata(id, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-v2', id] }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveDocument(id),
    onSuccess: () => router.push('/dashboard/documents'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(id),
    onSuccess: () => router.push('/dashboard/documents'),
  });

  /* ── TipTap editor ── */
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Начните вводить текст документа...' }),
      CharacterCount,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      TiptapLink.configure({ openOnClick: false }),
    ],
    editable: doc ? ['draft', 'rejected'].includes(doc.status) : false,
    content: latestVersion?.content ?? { type: 'doc', content: [] },
    onUpdate: ({ editor: ed }) => {
      // Debounced auto-save: 3s after last keystroke
      setAutoSaveStatus('saving');
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        saveMutation.mutate(ed.getJSON() as Record<string, unknown>);
      }, 3000);
    },
  });

  // Update editor content when version loads
  useEffect(() => {
    if (editor && latestVersion?.content) {
      editor.commands.setContent(latestVersion.content);
    }
  }, [latestVersion?.id]);

  // Update editor editable state when doc status changes
  useEffect(() => {
    if (!editor || !doc) return;
    const canEdit = ['draft', 'rejected'].includes(doc.status);
    editor.setEditable(canEdit);
  }, [doc?.status, editor]);

  // Title editing
  useEffect(() => {
    if (doc) setTitleDraft(doc.title);
  }, [doc?.title]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== doc?.title) {
      titleMutation.mutate(titleDraft);
    }
  };

  const panelLabel: Record<NonNullable<PanelTab>, string> = {
    workflow: 'Процесс',
    activity: 'История',
    comments: 'Комментарии',
    versions: 'Версии',
  };

  const panelIcon: Record<NonNullable<PanelTab>, React.ReactNode> = {
    workflow: <GitBranch className="w-3.5 h-3.5" />,
    activity: <History className="w-3.5 h-3.5" />,
    comments: <MessageSquare className="w-3.5 h-3.5" />,
    versions: <History className="w-3.5 h-3.5" />,
  };

  if (isLoading || !doc) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canEdit = ['draft', 'rejected'].includes(doc.status);
  const wordCount = editor?.storage?.characterCount?.words?.() ?? 0;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ────────────────── TOP BAR ────────────────── */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b bg-background z-10 shrink-0">
        {/* Back */}
        <Link
          href="/dashboard/documents"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Title (editable inline) */}
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
              className="w-full font-semibold text-sm bg-transparent border-b border-[oklch(0.546_0.245_262.881)] focus:outline-none"
            />
          ) : (
            <button
              onClick={() => canEdit && setIsEditingTitle(true)}
              className={cn(
                'font-semibold text-sm truncate max-w-xs text-left',
                canEdit && 'hover:text-[oklch(0.546_0.245_262.881)] transition-colors cursor-pointer',
              )}
            >
              {doc.title}
            </button>
          )}
        </div>

        {/* Status */}
        <StatusBadgeV2 status={doc.status} />

        {/* Auto-save indicator */}
        <span className={cn(
          'text-xs transition-opacity',
          autoSaveStatus === 'idle' ? 'opacity-0' : 'opacity-100',
          autoSaveStatus === 'saving' ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400',
        )}>
          {autoSaveStatus === 'saving' ? 'Сохранение...' : 'Сохранено'}
        </span>

        {/* Actions */}
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => {
              if (editor) saveMutation.mutate(editor.getJSON() as Record<string, unknown>);
            }}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Save className="w-3 h-3" />}
            Сохранить
          </Button>
        )}

        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/documents/${id}/settings`}>
                <Settings className="w-3.5 h-3.5 mr-2" /> Настройки
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => archiveMutation.mutate()}
              className="text-muted-foreground"
            >
              <Archive className="w-3.5 h-3.5 mr-2" /> Архивировать
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (confirm('Удалить документ?')) deleteMutation.mutate();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ────────────────── EDITOR AREA ────────────────── */}
        <main className="flex flex-col flex-1 overflow-hidden">
          {/* Toolbar */}
          {canEdit && editor && (
            <div className="flex items-center gap-0.5 px-4 py-1.5 border-b bg-muted/30 overflow-x-auto shrink-0">
              <TB active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Жирный">B</TB>
              <TB active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Курсив"><em>I</em></TB>
              <TB active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Подчёркнутый"><span className="underline">U</span></TB>
              <div className="w-px h-4 bg-border mx-1" />
              <TB active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</TB>
              <TB active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</TB>
              <TB active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</TB>
              <div className="w-px h-4 bg-border mx-1" />
              <TB active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</TB>
              <TB active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</TB>
              <TB active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>" Quote</TB>
              <div className="w-px h-4 bg-border mx-1" />
              <TB active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>←</TB>
              <TB active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>↔</TB>
              <TB active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>→</TB>
              <div className="w-px h-4 bg-border mx-1" />
              <TB onClick={() => editor.chain().focus().undo().run()}>↩</TB>
              <TB onClick={() => editor.chain().focus().redo().run()}>↪</TB>
            </div>
          )}

          {/* Document content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-10">
              {/* Doc metadata header */}
              <div className="flex items-center gap-3 mb-8 pb-6 border-b">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="uppercase tracking-wide">{doc.docType}</span>
                    {doc.externalRef && (
                      <>
                        <span>·</span>
                        <span>№ {doc.externalRef}</span>
                      </>
                    )}
                  </div>
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] bg-[oklch(0.546_0.245_262.881)]/10 text-[oklch(0.546_0.245_262.881)] px-1.5 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <div>{doc.owner.name}</div>
                  <div>{doc.department?.name}</div>
                  <div>v{doc.currentVersion}</div>
                </div>
              </div>

              {/* TipTap editor */}
              <EditorContent
                editor={editor}
                className={cn(
                  'prose prose-sm dark:prose-invert max-w-none min-h-[400px] focus-visible:outline-none',
                  '[&_.ProseMirror]:focus:outline-none',
                  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
                  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
                  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
                  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
                  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t text-xs text-muted-foreground bg-muted/20 shrink-0">
            <span>{wordCount} слов</span>
            <span>
              {canEdit
                ? <span className="flex items-center gap-1"><Unlock className="w-3 h-3" />Редактирование</span>
                : <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Только чтение</span>}
            </span>
          </div>
        </main>

        {/* ────────────────── RIGHT PANEL ────────────────── */}
        <aside className="w-72 border-l flex flex-col bg-background shrink-0 overflow-hidden">
          {/* Panel tabs */}
          <div className="flex border-b shrink-0">
            {(['workflow', 'comments', 'activity', 'versions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePanel(activePanel === tab ? null : tab)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors border-b-2',
                  activePanel === tab
                    ? 'border-[oklch(0.546_0.245_262.881)] text-[oklch(0.546_0.245_262.881)]'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
                title={panelLabel[tab]}
              >
                {panelIcon[tab]}
                <span className="hidden lg:block">{panelLabel[tab]}</span>
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activePanel === 'workflow' && user && (
              <WorkflowPanel
                documentId={id}
                currentUserId={user.id ?? 0}
                docStatus={doc.status}
              />
            )}
            {activePanel === 'activity' && (
              <ActivityTimeline documentId={id} />
            )}
            {activePanel === 'comments' && user && (
              <CommentsPanel documentId={id} currentUserId={user.id ?? 0} />
            )}
            {activePanel === 'versions' && (
              <VersionHistory
                documentId={id}
                currentVersion={doc.currentVersion}
                onRestore={() => qc.invalidateQueries({ queryKey: ['doc-version-latest', id] })}
              />
            )}
            {!activePanel && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <p className="text-xs text-center">Выберите вкладку выше</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
