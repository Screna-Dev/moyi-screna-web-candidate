import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { User, Briefcase, MessageSquare, BarChart3, DollarSign, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Profile', url: '/profile', icon: User },
  { title: 'Metrics', url: '/metrics', icon: BarChart3 },
  { title: 'Jobs', url: '/jobs', icon: Briefcase },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Pricing', url: '/pricing', icon: DollarSign },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { logout, user } = useAuth();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          {!isCollapsed && <span className="font-bold text-lg">Virtual Recruiter</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive ? 'bg-primary/10 text-primary font-medium' : ''
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        {!isCollapsed && user && (
          <div className="text-sm mb-2 px-2">
            <p className="font-medium text-foreground">{user.name}</p>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={logout}
          className="w-full justify-start"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
