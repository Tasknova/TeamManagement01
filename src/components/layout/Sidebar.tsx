import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  CalendarDays, 
  Users, 
  BarChart3,
  UserPlus,
  Folder,
  User,
  BarChart2,
  CalendarRange,
  ClipboardList,
  Target,
  Settings,
  Shield,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NavLink } from 'react-router-dom'; // Added for NavLink
import type { NavLinkProps } from 'react-router-dom';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

// Sidebar widths for layout adjustment
export const SIDEBAR_MIN_WIDTH = 64; // px (w-16)
export const SIDEBAR_MAX_WIDTH = 256; // px (w-64)

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpen, setIsOpen }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isProjectManager = user?.role === 'project_manager';
  const isSuperAdmin = user?.email === 'contact.tasknova@gmail.com';

  const memberTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'My Tasks', icon: Target },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: CheckSquare },
    { id: 'leaves', label: 'My Leaves', icon: CalendarDays },
    { id: 'projects', label: 'Projects', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: Users },
  ];

  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'All Tasks', icon: ClipboardList },
    { id: 'my-tasks', label: 'My Tasks', icon: Target },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: CheckSquare },
    { id: 'deleted-tasks', label: 'Deleted Tasks', icon: Trash2 },
    { id: 'leaves', label: 'All Leaves', icon: CalendarDays },
    { id: 'holidays', label: 'Company Holidays', icon: CalendarRange },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'project-manager-management', label: 'PM Management', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'admin-management', label: 'Admin Management', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const projectManagerTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'All Tasks', icon: ClipboardList },
    { id: 'my-tasks', label: 'My Tasks', icon: Target },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: CheckSquare },
    { id: 'leaves', label: 'My Leaves', icon: CalendarDays },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'profile', label: 'Profile', icon: User },
  ];
  if (isSuperAdmin) {
    adminTabs.splice(3, 0, { id: 'leave-defaults', label: 'Leave Management', icon: Settings });
  }

  const tabs = user?.role === 'admin' ? adminTabs : user?.role === 'project_manager' ? projectManagerTabs : memberTabs;

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-30
        ${isOpen ? 'w-64' : 'w-16'}
        bg-gradient-to-b from-blue-50 to-blue-100 border-r border-blue-200
        shadow-xl transition-all duration-500 ease-in-out
        group/sidebar
      `}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
             {/* Logo Section */}
       <div className="flex items-center justify-center h-16 px-4 border-b border-blue-200">
         {isOpen ? (
           <img 
             src="/logo2.png" 
             alt="Tasknova" 
             className="h-8 w-auto"
           />
         ) : (
           <img 
             src="/logo.png" 
             alt="Tasknova" 
             className="h-8 w-auto"
           />
         )}
       </div>

      <nav className={`mt-4 px-2 transition-all duration-500 ease-in-out overflow-y-auto h-[calc(100vh-5rem)] custom-scrollbar`}>
        <ul className="space-y-2">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            return (
              <li key={tab.id} className="overflow-hidden">
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    flex items-center w-full py-3 rounded-lg transition-all duration-300
                    ${activeTab === tab.id 
                      ? 'bg-blue-200 text-blue-800 shadow-lg scale-105' 
                      : 'text-blue-600 hover:bg-blue-100 hover:text-blue-900'
                    }
                    ${isOpen ? 'px-4' : 'justify-center'}
                    sidebar-btn
                  `}
                  style={{
                    transitionDelay: `${idx * 40}ms`,
                  }}
                >
                                     <span className={`transition-transform duration-500 ${isOpen ? 'scale-110' : 'scale-100'} relative`}>
                     <Icon className="w-6 h-6" />
                   </span>
                  <span
                    className={`ml-3 whitespace-nowrap font-medium text-base transition-all duration-500
                      ${isOpen ? 'opacity-100' : 'opacity-0 w-0'}
                    `}
                  >
                    {tab.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Animated accent bar */}
      <div className={`absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-blue-400 to-blue-200 rounded-r transition-all duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}></div>
    </aside>
  );
};

export default Sidebar;