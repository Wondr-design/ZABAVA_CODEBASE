import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  FileText,
  Gift,
  Settings,
  LogOut,
  ChevronDown,
  Calendar,
  Mail,
  CreditCard,
  BarChart3,
  UserPlus,
  Award,
  Package,
  Search,
  Bell
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  user: {
    email: string;
    name?: string | null;
    role: 'admin' | 'partner';
    partnerId?: string | null;
  };
  onLogout: () => void;
  onViewChange?: (view: string) => void;
  activeView?: string;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: NavItem[];
}

export function Sidebar({ user, onLogout, onViewChange, activeView, className }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const isAdmin = user.role === 'admin';
  const userInitials = user.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email.substring(0, 2).toUpperCase();

  // Define navigation items based on role
  const mainNavItems: NavItem[] = isAdmin
    ? [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
        { id: 'submissions', label: 'Submissions', icon: FileText, href: '/admin/submissions' },
        { id: 'partners', label: 'Partners', icon: Users, href: '/admin/partners' },
        { id: 'invites', label: 'Invite Manager', icon: UserPlus, href: '/admin/invites' },
        { id: 'rewards', label: 'Rewards', icon: Gift, href: '/admin/rewards' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
      ]
    : [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard#overview' },
        { id: 'submissions', label: 'Submissions', icon: FileText, href: '/dashboard#submissions' },
        { id: 'redemptions', label: 'Redemptions', icon: Gift, href: '/dashboard#redemptions' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard#analytics' },
      ];

  const secondaryNavItems: NavItem[] = [];

  const handleNavClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
      return;
    }

    if (isAdmin) {
      onViewChange?.(item.id);
      if (item.href) {
        navigate(item.href);
      }
    } else if (item.href) {
      if (item.href.startsWith('#')) {
        const section = item.href.substring(1);
        window.location.hash = section;
      } else if (item.href.includes('#')) {
        const [path, hash] = item.href.split('#');
        if (path) {
          navigate(path);
        }
        if (hash) {
          window.location.hash = `#${hash}`;
        }
      } else {
        navigate(item.href);
      }
    }

    if (item.children) {
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(item.id)) {
        newExpanded.delete(item.id);
      } else {
        newExpanded.add(item.id);
      }
      setExpandedItems(newExpanded);
    }
  };

  const isActive = (item: NavItem) => {
    if (isAdmin) {
      if (item.href) {
        const normalizedPath = location.pathname.replace(/\/$/, '');
        const normalizedHref = item.href.replace(/\/$/, '');
        if (normalizedHref === '/admin/dashboard') {
          return normalizedPath === '/admin' || normalizedPath === normalizedHref;
        }
        return normalizedPath === normalizedHref;
      }
      return activeView ? item.id === activeView : false;
    }

    if (item.href) {
      if (item.href.includes('#')) {
        const [path, hash] = item.href.split('#');
        const matchesPath = location.pathname === (path || location.pathname);
        return matchesPath && location.hash === `#${hash}`;
      }
      return location.pathname === item.href;
    }

    return false;
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r border-gray-200",
      className
    )}>
      {/* Logo/Brand */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Zabava</h2>
            <p className="text-xs text-gray-500 capitalize">{user.role} Portal</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 p-2">
          <Avatar className="h-10 w-10 border-2 border-gray-100">
            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-gray-700 font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name || user.email.split('@')[0]}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <Badge variant="outline" className="text-xs capitalize bg-blue-50 text-blue-600 border-blue-200">
            {user.role}
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</p>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const expanded = expandedItems.has(item.id);

            return (
              <div key={item.id}>
                <button
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-600">
                      {item.badge}
                    </Badge>
                  )}
                  {item.children && (
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expanded && "rotate-180"
                      )}
                    />
                  )}
                </button>
                
                {item.children && expanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = isActive(child);
                      
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNavClick(child)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                            childActive
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        {secondaryNavItems.length > 0 && (
          <div className="mt-8 space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</p>
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}