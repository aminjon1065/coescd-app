import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { CallsProvider } from '@/context/calls-context';
import { HeaderActions } from '@/components/header-actions';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <header className="flex h-14 shrink-0 items-center border-b border-border/60 bg-background transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          {/* Left: trigger + breadcrumb */}
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <PageBreadcrumbs />
          </div>
          {/* Right: search + bell (client component) */}
          <div className="ml-auto px-4">
            <HeaderActions />
          </div>
        </header>

        {/* ── Page content ────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          <CallsProvider>
            {children}
          </CallsProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
