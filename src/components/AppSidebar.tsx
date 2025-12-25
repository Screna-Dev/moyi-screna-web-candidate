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
import { User, Briefcase, Target, DollarSign, LogOut, GraduationCap, Users, Settings, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from "@/assets/logo.png"

const candidateNavItems = [
  { title: 'Profile', url: '/profile', icon: User },
  { title: 'Mentors', url: '/mentors', icon: GraduationCap },
  { title: 'Interview Prep', url: '/interview-prep', icon: Target },
  { title: 'Jobs', url: '/jobs', icon: Briefcase },
  { title: 'Settings & Payment', url: '/settings', icon: Settings },
];

const mentorNavItems = [
  { title: 'Profile', url: '/profile', icon: User },
  { title: 'Mentor Dashboard', url: '/mentor/dashboard', icon: Users },
  { title: 'Pricing', url: '/pricing', icon: DollarSign },
];

const adminNavItems = [
  { title: 'Admin Dashboard', url: '/admin', icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { logout, user } = useAuth();
  const isCollapsed = state === 'collapsed';

  // Determine which nav items to show based on user role
  const getNavItems = () => {
    if (user?.role === 'admin') {
      return adminNavItems;
    }
    if (user?.role === 'mentor') {
      return mentorNavItems;
    }
    return candidateNavItems;
  };

  const navItems = getNavItems();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <img src={Logo} alt="Logo" className="w-6 h-6 text-primary" />
          {!isCollapsed && <span className="font-bold text-lg">Screna AI</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {user?.role === 'admin' ? 'Admin' : 'Navigation'}
          </SidebarGroupLabel>
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
            {user.role === 'admin' && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
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