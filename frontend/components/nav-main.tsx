'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem, useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';

export function NavMain({
  items,
  label = 'Menu',
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[];
  label?: string;
}) {
  const { state } = useSidebar();
  if (!items.length) {
    return null;
  }
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          item.items?.length ?
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  {
                    state === 'collapsed'
                      ?
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <Link href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      :
                      <SidebarMenuButton tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight
                          className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                  }
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
            :
            <SidebarMenuItem
              key={item.title}
              className="group"
            >
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          // <SidebarMenuSubItem key={item.title}>
          //   <SidebarMenuSubButton asChild>
          //     <Collapsible
          //       key={item.title}
          //       asChild
          //       defaultOpen={item.isActive}
          //       className="group/collapsible"
          //     >
          //       <CollapsibleTrigger asChild>
          //         <SidebarMenuButton tooltip={item.title}>
          //           {item.icon && <item.icon />}
          //           <span>{item.title}</span>
          //           <ChevronRight
          //             className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          //         </SidebarMenuButton>
          //       </CollapsibleTrigger>
          //
          //       <Link href={item.url}>
          //         {item.icon && <item.icon />}
          //         <span>{item.title}</span>
          //       </Link>
          //     </Collapsible>
          //   </SidebarMenuSubButton>
          // </SidebarMenuSubItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
