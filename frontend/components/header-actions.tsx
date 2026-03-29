'use client';

import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Placeholder notification count — will be replaced with real data from React Query
const NOTIFICATION_COUNT = 0;

export function HeaderActions() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* ── Global search trigger ─────────────────────────────────────── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-muted-foreground"
              aria-label="Поиск"
            >
              <Search className="h-4 w-4" />
              <span className="hidden text-xs text-muted-foreground/70 md:inline">
                ⌘K
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Глобальный поиск (⌘K)</TooltipContent>
        </Tooltip>

        {/* ── Notification bell ─────────────────────────────────────────── */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-8 w-8 p-0 text-muted-foreground"
                  aria-label="Уведомления"
                >
                  <Bell className="h-4 w-4" />
                  {NOTIFICATION_COUNT > 0 && (
                    <span
                      className={cn(
                        'absolute right-1 top-1 flex h-4 w-4 items-center justify-center',
                        'rounded-full bg-red-500 text-[10px] font-bold text-white',
                      )}
                    >
                      {NOTIFICATION_COUNT > 9 ? '9+' : NOTIFICATION_COUNT}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Уведомления</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Уведомления</span>
              {NOTIFICATION_COUNT > 0 && (
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground">
                  Прочитать все
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {NOTIFICATION_COUNT === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Новых уведомлений нет
              </div>
            ) : (
              <DropdownMenuItem>
                {/* Notification items will be rendered here */}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
