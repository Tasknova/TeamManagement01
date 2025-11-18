import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Plus, Users, BarChart3, UserPlus, ChevronDown, CheckCircle2, Calendar, Clock, AlertCircle, Calendar as CalendarIcon, Pencil, CalendarDays, List, Search, CheckSquare, Trash2, Play, Pause } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useLeaves } from '../../hooks/useLeaves';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { TaskFilters } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskFiltersComponent from './TaskFilters';
import ProjectFiltersComponent from './ProjectFilters';
import LeaveCalendar from './LeaveCalendar';
import DashboardStats from './DashboardStats';
import MembersList from './MembersList';
import AdminsList from './AdminsList';
import ProjectManagerManagement from './ProjectManagerManagement';
import { useAuth } from '../../contexts/AuthContext';
import ProjectCard from './ProjectCard';
import { useProjects } from '../../hooks/useProjects';
import { supabase } from '../../lib/supabase';
import { Task } from '../../types';
import { Project } from '../../types';
import { authService } from '../../services/auth';
import { useEffect } from 'react';
import { format } from 'timeago.js';
import { toast } from 'sonner';
import LeaveForm from './LeaveForm';
import HolidayCalendar from './HolidayCalendar';
import { DailyTasksPage } from './DailyTasksPage';
import DeletedTasksPage from './DeletedTasksPage';
import TaskViewSelector, { TaskViewType } from './TaskViewSelector';
import TaskListView from './TaskListView';
import TaskCalendarView from './TaskCalendarView';
import { MemberTaskStats } from './MemberTaskStats';
import { MemberDailyTaskStats } from './MemberDailyTaskStats';
import { DailyTaskQuickStats } from './DailyTaskQuickStats';
import { TaskQuickStats } from './TaskQuickStats';
import { WebhookSettings } from './WebhookSettings';
import PasswordInput from '../ui/PasswordInput';

interface AdminDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab, onTabChange }) => {
  // All hooks at the top
  const { tasks, loading: tasksLoading, error: tasksError, addTask, updateTask, deleteTask, filterTasks, refetchTasks } = useTasks();
  const { leaves, loading: leavesLoading, addLeave, deleteLeave, updateLeave, setLeaves } = useLeaves();
  const { projects, loading: projectsLoading, error: projectsError, addProject, updateProject, deleteProject, fetchProjects } = useProjects();
  const { tasks: dailyTasks, loading: dailyTasksLoading } = useDailyTasks({});
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({});
  const [taskView, setTaskView] = useState<TaskViewType>('grid');
  const [projectFilters, setProjectFilters] = useState({
    search: '',
    status: '',
    client: '',
    projectManager: '',
    dateSort: 'newest'
  });
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    client_name: '',
    start_date: '',
    expected_end_date: '',
    project_manager_id: ''
  });

  // Reset project form when modal closes
  useEffect(() => {
    if (!isProjectFormOpen) {
      setProjectForm({
        name: '',
        description: '',
        client_name: '',
        start_date: '',
        expected_end_date: '',
        project_manager_id: ''
      });
    }
  }, [isProjectFormOpen]);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { user } = useAuth();
  const isSuperAdmin = useMemo(() => user?.email === 'contact.tasknova@gmail.com', [user?.email]);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editProjectForm, setEditProjectForm] = useState({
    name: '',
    description: '',
    client_name: '',
    start_date: '',
    expected_end_date: '',
    status: 'active'
  });

// --- Holiday Add Handler ---
const handleAddHoliday = async (holidayData: { name: string; date: string; description?: string }) => {
  try {
    const { data, error } = await supabase
      .from('company_holidays')
      .insert([{ ...holidayData, is_recurring: false }])
      .select();
    if (error) throw error;
    if (data && data.length > 0) {
      setHolidays((prev: any[]) => [...prev, ...data]);
      toast.success('Holiday added successfully!');
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to add holiday');
  }
};

// --- Holiday Update Handler ---
const handleUpdateHoliday = async (holidayData: { id: string; name: string; date: string; description?: string }) => {
  try {
    const { data, error } = await supabase
      .from('company_holidays')
      .update({ name: holidayData.name, date: holidayData.date, description: holidayData.description })
      .eq('id', holidayData.id)
      .select();
    if (error) throw error;
    if (data && data.length > 0) {
      setHolidays((prev: any[]) => prev.map(h => h.id === holidayData.id ? data[0] : h));
      toast.success('Holiday updated successfully!');
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to update holiday');
  }
};

// --- Holiday Delete Handler ---
const handleDeleteHoliday = async (holidayId: string) => {
  try {
    const { error } = await supabase
      .from('company_holidays')
      .delete()
      .eq('id', holidayId);
    if (error) throw error;
    setHolidays((prev: any[]) => prev.filter(h => h.id !== holidayId));
    toast.success('Holiday deleted successfully!');
  } catch (error: any) {
    toast.error(error.message || 'Failed to delete holiday');
  }
};
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [projectManagers, setProjectManagers] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [projectManagerAssignments, setProjectManagerAssignments] = useState<Array<{ project_id: string; project_manager_id: string }>>([]);
  const [openSections, setOpenSections] = useState({
    recentlyCompleted: false,
    dueToday: false,
    upcoming: false,
    blocked: false,
  });
  const [showWorking, setShowWorking] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [pmLeaveBalances, setPmLeaveBalances] = useState<any[]>([]);
  const [leaveBalancesLoading, setLeaveBalancesLoading] = useState(true);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  // State for editing balances
  const [editingBalances, setEditingBalances] = useState<{ [memberId: string]: boolean }>({});
  const [balancesInput, setBalancesInput] = useState<{ [memberId: string]: { sick_leaves: number; casual_leaves: number; paid_leaves: number } }>({});
  const [leaveDefaults, setLeaveDefaults] = useState({ sick_leaves: 30, casual_leaves: 30, paid_leaves: 30 });
  const [editingDefaults, setEditingDefaults] = useState(false);
  const [defaultsInput, setDefaultsInput] = useState({ sick_leaves: 30, casual_leaves: 30, paid_leaves: 30 });
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [editModalMemberId, setEditModalMemberId] = useState<string | null>(null);
  const [modalInput, setModalInput] = useState<{ sick_leaves: number; casual_leaves: number; paid_leaves: number }>({ sick_leaves: 30, casual_leaves: 30, paid_leaves: 30 });
  const [modalSaving, setModalSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [leavesSearch, setLeavesSearch] = useState('');
  const [leavesDate, setLeavesDate] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [editLeave, setEditLeave] = useState<any | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  // State for search and department filter
  const [teamSearch, setTeamSearch] = useState('');

  // Add at the top, after other hooks
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<any>(null);
  const [holidayForm, setHolidayForm] = useState({
    holiday_name: '',
    date: '',
    description: ''
  });
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidaySearch, setHolidaySearch] = useState('');
  const [holidayView, setHolidayView] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    if (activeTab === 'leaves') {
      const fetchBalances = async () => {
        const { data, error } = await supabase.from('member_leave_balances').select('*');
        if (!error) {
          setLeaveBalances(data || []);
        }
      };
      fetchBalances();
    }
    if (activeTab === 'leaves' && user?.role === 'admin') {
      const fetchDefaults = async () => {
        const res = await supabase.from('leave_defaults').select('*').single();
        if (res.data) {
          setLeaveDefaults(res.data);
          setDefaultsInput(res.data);
        }
      };
      fetchDefaults();
    }
    if (activeTab === 'holidays' || activeTab === 'leaves') {
      const fetchHolidays = async () => {
        setHolidaysLoading(true);
        const { data, error } = await supabase
          .from('company_holidays')
          .select('*')
          .gte('date', '2025-03-01')
          .lte('date', '2026-02-28')
          .order('date');
        if (!error && data) {
          setHolidays(data);
        }
        setHolidaysLoading(false);
      };
      fetchHolidays();
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    const fetchMembersAndAdmins = async () => {
      const [membersData, adminsData, projectManagersData] = await Promise.all([
        authService.getMembers(),
        authService.getAdmins(),
        authService.getProjectManagers()
      ]);
      if (isMounted) {
        setMembers(membersData.map(m => ({ id: m.id, name: m.name })));
        setAdmins(adminsData.map(a => ({ id: a.id, name: a.name })));
        setProjectManagers(projectManagersData.map(pm => ({ id: pm.id, name: pm.name, email: pm.email })));
      }
    };
    fetchMembersAndAdmins();
    // Remove the interval to prevent continuous refresh
    // const interval = setInterval(fetchMembersAndAdmins, 5000); // Poll every 5 seconds
    return () => {
      isMounted = false;
      // clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchProjectManagerAssignments = async () => {
      const { data, error } = await supabase
        .from('project_manager_assignments')
        .select('project_id, project_manager_id')
        .eq('is_active', true);
      if (error) {
        console.error('Error fetching project manager assignments:', error);
      } else if (data && isMounted) {
        setProjectManagerAssignments(data);
      }
    };
    fetchProjectManagerAssignments();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'leave-defaults' && isSuperAdmin) {
      setLeaveBalancesLoading(true);
      const fetchBalances = async () => {
        // Fetch both member and PM leave balances
        const [memberRes, pmRes] = await Promise.all([
          supabase.from('member_leave_balances').select('*'),
          supabase.from('project_manager_leave_balances').select('*')
        ]);
        
        setLeaveBalances(memberRes.data || []);
        setPmLeaveBalances(pmRes.data || []);
        setLeaveBalancesLoading(false);
      };
      fetchBalances();
    }
  }, [activeTab, isSuperAdmin]);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaves = async () => {
      const { data, error } = await supabase
        .from('leaves')
        .select('*');
      if (error) {
        console.error('Error fetching leaves:', error);
        if (isMounted) setLeaves([]);
      } else if (data) {
        // Manually fetch user data for each leave
        const leavesWithUsers = await Promise.all(data.map(async (leave) => {
          // Try to find user in members table first
          let { data: memberUser, error: memberError } = await supabase
            .from('members')
            .select('id, name, email')
            .eq('id', leave.user_id)
            .maybeSingle();
          
          // If not found in members, try admins table
          if (!memberUser && !memberError) {
            let { data: adminUser, error: adminError } = await supabase
              .from('admins')
              .select('id, name, email')
              .eq('id', leave.user_id)
              .maybeSingle();
            if (!adminError) {
              memberUser = adminUser;
            }
          }
          
          // If not found in admins, try project managers table
          if (!memberUser) {
            let { data: pmUser, error: pmError } = await supabase
              .from('project_managers')
              .select('id, name, email')
              .eq('id', leave.user_id)
              .maybeSingle();
            if (!pmError) {
              memberUser = pmUser;
            }
          }
          
          return {
            ...leave,
            user: memberUser
          };
        }));
        
        if (isMounted) setLeaves(leavesWithUsers);
      }
    };
    fetchLeaves();
    // Remove the interval to prevent continuous refresh
    // const interval = setInterval(fetchLeaves, 5000); // Poll every 5 seconds
    return () => {
      isMounted = false;
      // clearInterval(interval);
    };
  }, []);

  // Real-time subscription for tasks (admin sees all changes)
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const channel = supabase.channel('tasks-realtime-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          // On any change, refetch tasks
          refetchTasks();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.role, refetchTasks]);

  // Initialize chat popup for admin dashboard
  // Commented out to hide AI button
  // useEffect(() => {
  //   if (user?.role === 'admin') {
  //     // Create and inject the UMD script first
  //     const umdScript = document.createElement('script');
  //     umdScript.src = 'https://cdn.n8nchatui.com/v1/embed.umd.js';
  //     umdScript.onload = () => {
  //       // After UMD script loads, create and inject the initialization script
  //       const initScript = document.createElement('script');
  //       initScript.innerHTML = `
  //         window.Chatbot.init({
  //           "n8nChatUrl": "https://n8nautomation.site/webhook/8c026208-62f6-4df9-8e09-8dc959e78e34/chat",
  //           "metadata": {}, // Include any custom data to send with each message to your n8n workflow
  //           "theme": {
  //             "button": {
  //               "backgroundColor": "#00081d",
  //               "right": 20,
  //               "bottom": 20,
  //               "size": 50,
  //               "iconColor": "#119cff",
  //               "customIconSrc": "https://mmadclhbsuvkcbibxcsp.supabase.co/storage/v1/object/public/avatars//357f28f4-9993-4f63-b609-c31f60111133_1752589383843.png",
  //               "customIconSize": 60,
  //               "customIconBorderRadius": 15,
  //               "autoWindowOpen": {
  //                 "autoOpen": false,
  //                 "openDelay": 2
  //               },
  //               "borderRadius": "rounded"
  //             },
  //             "tooltip": {
  //               "showTooltip": true,
  //               "tooltipMessage": "🚀 Ready to unlock some AI magic?",
  //               "tooltipBackgroundColor": "#119cff",
  //               "tooltipTextColor": "#f9faff",
  //               "tooltipFontSize": 15
  //             },
  //             "chatWindow": {
  //               "borderRadiusStyle": "rounded",
  //               "avatarBorderRadius": 20,
  //               "messageBorderRadius": 6,
  //               "showTitle": true,
  //               "title": "SuperBot 🚀",
  //               "titleAvatarSrc": "https://mmadclhbsuvkcbibxcsp.supabase.co/storage/v1/object/public/avatars//357f28f4-9993-4f63-b609-c31f60111133_1752589383843.png",
  //               "avatarSize": 30,
  //               "welcomeMessage": " Hey there! I'm Superbot, your AI assistant from Tasknova.",
  //               "errorMessage": "Please connect me to n8n first",
  //               "backgroundColor": "#010c27",
  //               "height": 600,
  //               "width": 400,
  //               "fontSize": 16,
  //               "starterPrompts": [
  //                 "What are today's tasks ?"
  //               ],
  //               "starterPromptFontSize": 15,
  //               "renderHTML": false,
  //               "clearChatOnReload": false,
  //               "showScrollbar": false,
  //               "botMessage": {
  //                 "backgroundColor": "#119cff",
  //                 "textColor": "#fafafa",
  //                 "showAvatar": true,
  //                 "avatarSrc": "https://mmadclhbsuvkcbibxcsp.supabase.co/storage/v1/object/public/avatars//357f28f4-9993-4f63-b609-c31f60111133_1752589895884.gif"
  //               },
  //               "userMessage": {
  //                 "backgroundColor": "#fff6f3",
  //                 "textColor": "#050505",
  //                 "showAvatar": true,
  //                 "avatarSrc": "https://www.svgrepo.com/show/532363/user-alt-1.svg"
  //               },
  //               "textInput": {
  //                 "placeholder": "Type your query",
  //                 "backgroundColor": "#119cff",
  //                 "textColor": "#fff6f3",
  //                 "sendButtonColor": "#01061b",
  //                 "maxChars": 50,
  //                 "maxCharsWarningMessage": "You exceeded the characters limit. Please input less than 50 characters.",
  //                 "autoFocus": true,
  //                 "borderRadius": 6,
  //                 "sendButtonBorderRadius": 50
  //               },
  //               "uploadsConfig": {
  //                 "enabled": true,
  //                 "acceptFileTypes": [
  //                   "png",
  //                   "jpeg",
  //                   "jpg",
  //                   "pdf",
  //                   "txt"
  //                 ],
  //                 "maxSizeInMB": 5,
  //                 "maxFiles": 1
  //               },
  //               "voiceInputConfig": {
  //                 "enabled": true,
  //                 "maxRecordingTime": 15,
  //                 "recordingNotSupportedMessage": "To record audio, use modern browsers like Chrome or Firefox that support audio recording"
  //               }
  //             }
  //           }
  //         });
  //       `;
  //       document.head.appendChild(initScript);
  //     };
      
  //     // Append the UMD script to the document head
  //     document.head.appendChild(umdScript);
      
  //     // Cleanup function to remove the scripts when component unmounts
  //     return () => {
  //       // Remove UMD script
  //       if (document.head.contains(umdScript)) {
  //         document.head.removeChild(umdScript);
  //       }
  //       // Remove init script
  //       const initScripts = document.querySelectorAll('script');
  //       initScripts.forEach(script => {
  //         if (script.innerHTML.includes('window.Chatbot.init')) {
  //           document.head.removeChild(script);
  //         }
  //       });
  //       // Also remove any chat elements that might have been created
  //       const chatElements = document.querySelectorAll('[data-n8n-chat]');
  //       chatElements.forEach(element => element.remove());
  //     };
  //   }
  // }, [user]);

  // --- Admin notifications state and logic (mirroring member dashboard) ---
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [adminNotificationsLoading, setAdminNotificationsLoading] = useState(false);
  // Helper to get/set dismissed notifications in localStorage
  const getDismissedNotifications = () => {
    if (!user?.id) return [];
    try {
      return JSON.parse(localStorage.getItem(`dismissedNotifications_${user.id}`) || '[]');
    } catch {
      return [];
    }
  };
  const addDismissedNotification = (notifId: string) => {
    if (!user?.id) return;
    const dismissed = getDismissedNotifications();
    if (!dismissed.includes(notifId)) {
      localStorage.setItem(
        `dismissedNotifications_${user.id}`,
        JSON.stringify([...dismissed, notifId])
      );
    }
  };
  // Fetch notifications for the admin
  const fetchAdminNotifications = async () => {
    if (!user) return;
    setAdminNotificationsLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const dismissed = getDismissedNotifications();
      const unique = Object.values(
        data.filter(n => !dismissed.includes(n.id)).reduce((acc, n) => {
          acc[n.id] = n;
          return acc;
        }, {} as Record<string, any>)
      );
      setAdminNotifications(unique);
      // Dispatch event for notification dot
      window.dispatchEvent(new CustomEvent('notifications-dot', { detail: { hasUnread: unique.some(n => !n.is_read) } }));
    }
    setAdminNotificationsLoading(false);
  };
  // Real-time notifications for admin (mirroring member dashboard)
  useEffect(() => {
    fetchAdminNotifications();
    // Remove polling since we have real-time subscription
    if (!user || user.role !== 'admin' || !user.id) return;
    
    // Create a Set to track shown notifications and prevent duplicates
    const shownNotifications = new Set();
    
    const channel = supabase.channel('notifications-realtime-admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Check if we've already shown this notification
          if (payload.new && !shownNotifications.has(payload.new.id)) {
            shownNotifications.add(payload.new.id);
            
            let dateTime = '';
            if (payload.new.created_at) {
              const d = new Date(payload.new.created_at);
              dateTime = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            }
            
            toast(payload.new.title, {
              description: `${payload.new.message}${dateTime ? `\n${dateTime}` : ''}`,
              style: { background: '#2563eb', color: 'white' },
              duration: 4500,
            });
            
            // Update notifications list immediately
            fetchAdminNotifications();
            // Dispatch notification dot event
            window.dispatchEvent(new CustomEvent('notifications-dot', { detail: { hasUnread: true } }));
          }
        }
      )
      .subscribe((status) => {
        console.log('[DEBUG] Notifications channel status:', status);
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  // Fetch notifications when switching to notifications tab
  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchAdminNotifications();
      // Mark notifications as read when admin views them
      if (adminNotifications.length > 0) {
        const unreadNotifications = adminNotifications.filter(n => !n.is_read);
        if (unreadNotifications.length > 0) {
          // Mark all as read
          Promise.all(unreadNotifications.map(notification =>
            supabase.from('notifications').update({ is_read: true }).eq('id', notification.id)
          )).then(() => {
            // Update local state and dispatch dot event
            setAdminNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            window.dispatchEvent(new CustomEvent('notifications-dot', { detail: { hasUnread: false } }));
          });
        }
      }
    }
  }, [activeTab]);

  // Remove react-toastify ToastContainer usage

  const filteredTasks = filterTasks(taskFilters);

  const handleStatusChange = (id: string, status: 'not_started' | 'in_progress' | 'completed') => {
    updateTask(id, { status });
  };

  // Add this handler for editing tasks
  const handleTaskUpdate = async (id: string, updates: Partial<Task>) => {
    const updated = await updateTask(id, updates);
    await refetchTasks();
    // --- Insert notification for member if status is updated by admin ---
    if (updates.status && user?.role === 'admin' && updated && updated.user_id) {
      // Prevent duplicate notification
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', updated.user_id)
        .eq('type', 'task_status_updated')
        .eq('related_id', id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!existingError && existing && existing.length > 0) {
        // Notification already exists, skip insert
      } else {
        let emoji = '';
        let statusText = '';
        if (updates.status === 'completed') {
          emoji = '🎉';
          statusText = 'completed';
        } else if (updates.status === 'in_progress') {
          emoji = '⏳';
          statusText = 'in progress';
        } else if (updates.status === 'blocked') {
          emoji = '🛑';
          statusText = 'blocked';
        } else if (updates.status === 'pending') {
          emoji = '⏳';
          statusText = 'pending';
        } else if (updates.status === 'cancelled') {
          emoji = '🚫';
          statusText = 'cancelled';
        }
        await supabase.from('notifications').insert([
          {
            user_id: updated.user_id,
            title: `${emoji} Task Status Updated`,
            message: `Status for task "${updated.task_name}" changed to ${statusText}.`,
            type: 'task_status_updated',
            related_id: id,
            related_type: 'task',
          },
        ]);
      }
    }
  };

  // Helper to count non-Sunday days in a date range (inclusive)
  function countNonSundayDays(fromDate: string, toDate: string): number {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    let count = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) count++; // 0 = Sunday
    }
    return count;
  }

  // Helper to count total days, Sundays, already leave days, holidays, and leave days in a range
  function getDaysInfo(fromDate: string, toDate: string, existingLeaves: any[], holidays: string[] = []) {
    if (!fromDate || !toDate) return { total: 0, sundays: 0, alreadyLeave: 0, holidays: 0, leaveDays: 0 };
    const from = new Date(fromDate);
    const to = new Date(toDate);
    let total = 0;
    let sundays = 0;
    let alreadyLeave = 0;
    let holidaysCount = 0;
    // Build set of already booked days
    const leaveDatesSet = new Set<string>();
    existingLeaves.forEach(leave => {
      if (leave.category === 'multi-day' && leave.from_date && leave.to_date) {
        let d = new Date(leave.from_date);
        const to2 = new Date(leave.to_date);
        while (d <= to2) {
          leaveDatesSet.add(d.toISOString().split('T')[0]);
          d.setDate(d.getDate() + 1);
        }
      } else if (leave.leave_date) {
        leaveDatesSet.add(new Date(leave.leave_date).toISOString().split('T')[0]);
      }
    });
    let leaveDays = 0;
    let idx = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      total++;
      const dayStr = d.toISOString().split('T')[0];
      if (d.getDay() === 0) {
        sundays++;
      } else if (leaveDatesSet.has(dayStr)) {
        alreadyLeave++;
      } else if (holidays.includes(dayStr)) {
        holidaysCount++;
      } else {
        leaveDays++;
      }
      idx++;
    }
    return { total, sundays, alreadyLeave, holidays: holidaysCount, leaveDays };
  }

  async function handleApproveDeclineLeave(leaveId: string, status: 'approved' | 'rejected', userId: string, leaveDate: string, endDate: string | null, leaveType: string, category?: string, from_date?: string | null, to_date?: string | null) {
    // Fetch the full leave object first
    const { data: leave, error: leaveError } = await supabase
      .from('leaves')
      .select('*')
      .eq('id', leaveId)
      .single();
    if (leaveError || !leave) {
      alert('Failed to fetch leave for approval.');
      return;
    }
    const prevStatus = leave.status;
    // Only proceed if the status is actually changing
    if (prevStatus === status) {
      alert(`Leave is already ${status}.`);
      return;
    }
    // Update leave status only - don't pass the full leave object
    await updateLeave(leaveId, { status });

    // Fetch the leave again to confirm status
    const { data: updatedLeave, error: updatedLeaveError } = await supabase
      .from('leaves')
      .select('*')
      .eq('id', leaveId)
      .single();
    if (updatedLeaveError || !updatedLeave) {
      alert('Failed to fetch leave after approval.');
      return;
    }

    // --- REMOVED: Balance update code. Now handled by DB trigger. ---

    // Send notification to member
    const isApproved = status === 'approved';
    const notifType = isApproved ? 'leave_approved' : 'leave_rejected';
    const notifTitle = isApproved ? 'Leave Approved' : 'Leave Rejected';
    let leaveDateStr = '';
    if (updatedLeave.category === 'multi-day' && updatedLeave.from_date && updatedLeave.to_date) {
      leaveDateStr = `Type: Multi-day | From: ${updatedLeave.from_date} | To: ${updatedLeave.to_date} | Leave Type: ${updatedLeave.leave_type}`;
    } else {
      leaveDateStr = `Type: Single Day | Date: ${updatedLeave.leave_date} | Leave Type: ${updatedLeave.leave_type}`;
    }
    const notifMsg = isApproved
      ? `Your leave request (${leaveDateStr}) has been approved.`
      : `Your leave request (${leaveDateStr}) has been declined.`;
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title: notifTitle,
      message: notifMsg,
      type: notifType,
      related_id: leaveId,
      related_type: 'leave',
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Notification insert error:', error);
      alert('Failed to insert notification: ' + error.message);
    }
  }

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    const { error } = await supabase
      .from('admins')
      .update({
        name: profileForm.name,
        phone: profileForm.phone,
      })
      .eq('id', user.id);
    setProfileLoading(false);
    if (!error) {
      setEditProfileOpen(false);
      window.location.reload();
    } else {
      alert('Failed to update profile: ' + error.message);
    }
  };

  // Password update handler (dummy, as Supabase Auth is not used)
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      alert('New passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    setTimeout(() => {
      setPasswordLoading(false);
      setChangePasswordOpen(false);
      alert('Password updated (demo only).');
    }, 1000);
  };

  // Fix: Wrap addTask for TaskForm to match expected signature
  const handleAddTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('🔥 ADMIN DEBUG: handleAddTask called with:', task);
    console.log('🔥 ADMIN DEBUG: user context:', user);
    
    try {
      // Ensure task has all required fields
      const taskWithDefaults = {
        ...task,
        created_by: user?.id || task.created_by,
        progress: task.progress || 0
      };
      
      console.log('🔥 ADMIN DEBUG: Calling addTask with:', taskWithDefaults);
      const result = await addTask(taskWithDefaults);
      console.log('🔥 ADMIN DEBUG: addTask result:', result);
      
      setIsTaskFormOpen(false);
    } catch (error) {
      console.error('🔥 ADMIN DEBUG: Error adding task:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditProject(project);
    setEditProjectForm({
      name: project.name,
      description: project.description || '',
      client_name: project.client_name || '',
      start_date: project.start_date || '',
      expected_end_date: project.expected_end_date || '',
      status: project.status || 'active'
    });
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject) return;
    await updateProject(editProject.id, editProjectForm);
    setEditProject(null);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    // Update the project in the local state
    fetchProjects();
  };

  // Add this function to toggle the open state for each section
  const toggleSection = (sectionKey: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Helper to render section
  const renderTaskSection = (title: string, Icon: any, tasks: any[], sectionKey: keyof typeof openSections, sectionName: string) => (
    <div>
      <div className="flex items-center gap-2 mb-4 group">
        <Icon className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-extrabold text-gray-900 transition-transform duration-300 group-hover:scale-105">
          {title}
        </h2>
      </div>
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-gray-500">No {title.toLowerCase()}.</div>
        ) : (
          <>
            <div className="h-96 flex">
            <TaskCard key={tasks[0].id} task={tasks[0]} showUser={true} onDelete={() => {}} onStatusChange={() => {}} section={sectionName} members={members} admins={admins} projectManagers={projectManagers} />
            </div>
            {tasks.length > 1 && !openSections[sectionKey] && (
              <button
                onClick={() => toggleSection(sectionKey)}
                className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                Load More
              </button>
            )}
            {tasks.length > 1 && openSections[sectionKey] && (
              <>
                <div className="space-y-4">
                  {tasks.slice(1).map(task => (
                    <div key={task.id} className="h-96 flex">
                      <TaskCard task={task} showUser={true} onDelete={() => {}} onStatusChange={() => {}} section={sectionName} members={members} admins={admins} projectManagers={projectManagers} />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  Show Less
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Now, after all hooks, do conditional rendering:
  if (activeTab === 'dashboard') {
    // Date helpers
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    // Recently Completed: completed within last 3 days
    const recentlyCompletedTasks = tasks.filter(task => {
      if (task.status !== 'completed' || !task.updated_at) return false;
      const updated = new Date(task.updated_at);
      const diff = (today.getTime() - updated.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24);
      return diff <= 3 && diff >= 0;
    });

    // Due Today: due date is today and not completed
    const dueTodayTasks = tasks.filter(task => {
      const due = new Date(task.due_date);
      return isSameDay(due, today) && task.status !== 'completed';
    });

    // Upcoming: due date is within next 3 days (excluding today) and not completed
    const upcomingTasks = tasks.filter(task => {
      if (task.status === 'completed') return false;
      const due = new Date(task.due_date);
      const diff = (due.setHours(0,0,0,0) - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 3;
    });

    // Blocked: overdue and not completed, or status is 'blocked'
    const blockedTasks = tasks.filter(task => {
      const due = new Date(task.due_date);
      return (task.status !== 'completed' && due < today) || task.status === 'blocked';
    });

    // Not Started: tasks with status 'not_started'
    const notStartedTasks = tasks.filter(task => task.status === 'not_started');

    // In Progress: tasks with status 'in_progress'
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress');

    // Calculate on leave and working today with names
    const todayStr = today.toISOString().split('T')[0];
    const onLeaveToday = members.filter(member =>
      leaves.some(leave => {
        if (leave.user_id !== member.id || leave.status !== 'approved') return false;
        if (leave.category === 'multi-day') {
          return leave.from_date <= todayStr && leave.to_date >= todayStr;
        } else {
          return leave.leave_date === todayStr;
        }
      })
    );
    const workingToday = members.filter(member => !onLeaveToday.some(l => l.id === member.id));

    // After the four task sections, add a summary for leaves
    // Calculate on leave and working today
    const onLeaveCount = onLeaveToday.length;
    // Assume members state contains all team members
    const totalMembers = members.length;
    const workingTodayCount = totalMembers - onLeaveCount;

    // Personalized greeting logic
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'good morning';
      if (hour < 18) return 'good afternoon';
      return 'good evening';
    };
    const adminName = user?.name || 'Admin';

    // Find next 5 upcoming holidays
    const upcomingHolidays = holidays
      .filter(h => new Date(h.date) >= today)
      .slice(0, 5);

    return (
      <div className="space-y-8 px-2 md:px-8 lg:px-16 pb-8">
        {/* Dashboard content starts here */}
        <div className="pt-4 pb-2">
        </div>
        <DashboardStats tasks={tasks} leaves={leaves} />
        
        {/* Daily Tasks Overview */}
        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-2">Daily Tasks Overview</h2>
        <DailyTaskQuickStats dailyTasks={dailyTasks} />
        
        {/* Section title for leaves dashboard */}
        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-2">Team Attendance Today</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
          {/* Working today card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-2xl font-bold text-green-700 flex items-center gap-2">
              <Users className="w-6 h-6 text-green-500" /> Working today - {workingTodayCount}
            </div>
            <button
              className="mt-3 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              onClick={() => setShowWorking(v => !v)}
            >
              {showWorking ? 'Hide' : 'Show'}
            </button>
            {showWorking && (
              <ul className="mt-3 w-full text-center text-gray-700 text-base">
                {workingTodayCount === 0 ? <li>No one working today</li> : workingToday.map(m => <li key={m.id}>{m.name}</li>)}
              </ul>
              )}
            </div>
          {/* On Leave card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-red-500" /> On Leave - {onLeaveCount}
          </div>
            <button
              className="mt-3 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              onClick={() => setShowLeave(v => !v)}
            >
              {showLeave ? 'Hide' : 'Show'}
            </button>
            {showLeave && (
              <ul className="mt-3 w-full text-center text-gray-700 text-base">
                {onLeaveCount === 0 ? <li>No one on leave today</li> : onLeaveToday.map(m => <li key={m.id}>{m.name}</li>)}
              </ul>
              )}
            </div>
          </div>
        {/* Section title for task overview */}
        <h2 className="text-xl font-semibold text-gray-800 mt-10 mb-2">Task Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {renderTaskSection('Recently Completed Tasks', CheckCircle2, recentlyCompletedTasks, 'recentlyCompleted', 'completed')}
          {renderTaskSection('Due Today', Calendar, dueTodayTasks, 'dueToday', 'today')}
          {renderTaskSection('Upcoming Tasks', Clock, upcomingTasks, 'upcoming', 'upcoming')}
          {renderTaskSection('Blocked Tasks', AlertCircle, blockedTasks, 'blocked', 'blocked')}
        </div>

        {/* Member Task Statistics */}
        <h2 className="text-xl font-semibold text-gray-800 mt-10 mb-2">Member Task Statistics</h2>
        <MemberTaskStats 
          tasks={tasks}
          members={members}
          admins={admins}
          projectManagers={projectManagers}
          currentUserId={user?.id}
          showOnlyCurrentUser={false}
        />

        {/* Member Daily Task Statistics */}
        <h2 className="text-xl font-semibold text-gray-800 mt-10 mb-2">Member Daily Task Statistics</h2>
        <MemberDailyTaskStats 
          dailyTasks={dailyTasks}
          members={members}
          admins={admins}
          projectManagers={projectManagers}
          currentUserId={user?.id}
          showOnlyCurrentUser={false}
        />
        {/* Notifications summary at the top */}
        {adminNotifications.length > 0 && (
          <Card className="mb-6 p-4 border border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-blue-800">Recent Notifications</h2>
              <Button size="sm" variant="primary" onClick={() => setActiveTab('notifications')}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {adminNotifications.slice(0, 5).map(n => (
                <div key={n.id + '-' + n.created_at} className="border-b last:border-b-0 pb-2 last:pb-0">
                  <div className="font-semibold text-blue-900">{n.title}</div>
                  <div className="text-sm text-blue-700">{n.message}</div>
                  <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
        {/* Upcoming Holidays Section */}
        <Card className="mb-6 p-4 border border-green-200 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-green-800">Upcoming Holidays</h2>
          </div>
          <div className="space-y-2">
            {upcomingHolidays.length === 0 ? (
              <div className="text-gray-500">No upcoming holidays.</div>
            ) : (
              upcomingHolidays.map(h => (
                <div key={h.id} className="border-b last:border-b-0 pb-2 last:pb-0 flex items-center gap-4">
                  <CalendarIcon className="w-5 h-5 text-green-600" />
                  <div className="font-semibold text-green-900">{h.name}</div>
                  <div className="text-sm text-green-700">{new Date(h.date).toLocaleDateString()}</div>
                  {h.description && <div className="text-xs text-gray-500 ml-2">{h.description}</div>}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (activeTab === 'tasks') {
    return (
      <div className="p-6 space-y-6">
        {/* Header with Add Task button and View Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">Task Master Hub</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredTasks.length} tasks
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <TaskViewSelector
              currentView={taskView}
              onViewChange={setTaskView}
            />
            <Button
              variant="outline"
              onClick={() => onTabChange('deleted-tasks')}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              See Deleted Tasks
            </Button>
            <Button
              icon={Plus}
              onClick={() => setIsTaskFormOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Task
            </Button>
          </div>
        </div>

        {/* Quick Stats Section */}
        <TaskQuickStats tasks={filteredTasks} />

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <TaskFiltersComponent
          filters={taskFilters}
          onFiltersChange={setTaskFilters}
          showMemberFilter={true}
          members={members}
          admins={admins}
          projectManagers={projectManagers}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
        />
        </div>

        {/* Error Message */}
        {tasksError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
            {tasksError}
            </div>
          </div>
        )}

        {/* Loading State */}
        {tasksLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading tasks...</p>
            </div>
          </div>
        ) : (
          /* Task Views */
          <>
            {taskView === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTasks.length === 0 ? (
                  <div className="col-span-full">
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                      <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                      <p className="text-gray-500 mb-4">No tasks match your current filters.</p>
                      <Button
                        onClick={() => setTaskFilters({})}
                        variant="outline"
                        size="sm"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                ) : (
                  filteredTasks.map(task => (
                    <div key={task.id} className="flex h-[28rem]">
                      <TaskCard
                        task={task}
                        onDelete={deleteTask}
                        onStatusChange={handleStatusChange}
                        showUser={true}
                        onUpdate={handleTaskUpdate}
                        members={members}
                        admins={admins}
                        projectManagers={projectManagers}
                        projects={projects.map(p => ({ id: p.id, name: p.name }))}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {taskView === 'list' && (
              <TaskListView
                tasks={filteredTasks}
                onDelete={deleteTask}
                onStatusChange={handleStatusChange}
                onUpdate={handleTaskUpdate}
                showUser={true}
                members={members}
                admins={admins}
                projectManagers={projectManagers}
                projects={projects.map(p => ({ id: p.id, name: p.name }))}
              />
            )}

            {taskView === 'calendar' && (
              <TaskCalendarView
                tasks={filteredTasks}
                onDelete={deleteTask}
                onStatusChange={handleStatusChange}
                onUpdate={handleTaskUpdate}
                showUser={true}
                members={members}
                admins={admins}
                projectManagers={projectManagers}
                projects={projects.map(p => ({ id: p.id, name: p.name }))}
              />
            )}
          </>
        )}

        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleAddTask}
        />
      </div>
    );
  }

  if (activeTab === 'my-tasks') {
    // Filter tasks to show only tasks assigned to the current admin
    const myTasks = tasks.filter(task => task.user_id === user?.id);
    const filteredMyTasks = filterTasks(taskFilters, myTasks);

    return (
      <div className="p-6 space-y-6">
        {/* Header with Add Task button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">My Task Portfolio</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredMyTasks.length} tasks
            </span>
          </div>
          <Button
            icon={Plus}
            onClick={() => setIsTaskFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add Task
          </Button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                  <TaskFiltersComponent
          filters={taskFilters}
          onFiltersChange={setTaskFilters}
          showMemberFilter={false}
          members={members}
          admins={admins}
          projectManagers={projectManagers}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
         />
        </div>

        {/* Error Message */}
        {tasksError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
            {tasksError}
            </div>
          </div>
        )}

        {/* Loading State */}
        {tasksLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading tasks...</p>
            </div>
          </div>
        ) : (
          /* Tasks Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMyTasks.length === 0 ? (
              <div className="col-span-full">
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                  <p className="text-gray-500 mb-4">No tasks match your current filters.</p>
                  <Button
                    onClick={() => setTaskFilters({})}
                    variant="outline"
                    size="sm"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            ) : (
              filteredMyTasks.map(task => (
              <div key={task.id} className="flex h-[28rem]">
                <TaskCard
                  task={task}
                  onDelete={deleteTask}
                  onStatusChange={handleStatusChange}
                  showUser={false}
                  onUpdate={handleTaskUpdate}
                  members={members}
                  admins={admins}
                  projectManagers={projectManagers}
                  projects={projects.map(p => ({ id: p.id, name: p.name }))}
                />
              </div>
              ))
            )}
          </div>
        )}

        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleAddTask}
        />
      </div>
    );
  }

  if (activeTab === 'leaves') {
    // Helper function to format dates
    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return 'No date';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          weekday: 'short'
        });
      } catch (error) {
        return dateString;
      }
    };

    // Group leaves by member
    const leavesByMember: { [memberId: string]: any[] } = {};
    leaves.forEach(l => {
      if (!leavesByMember[l.user_id]) leavesByMember[l.user_id] = [];
      leavesByMember[l.user_id].push(l);
    });

    // Pending leaves
    const pendingLeaves = leaves.filter(l => l.status === 'pending');

    // Super-admin check (using memoized value from component scope)

    // Handle balance edit
    const handleEditBalances = (memberId: string, balances: any) => {
      setEditingBalances((prev) => ({ ...prev, [memberId]: true }));
      setBalancesInput((prev: any) => ({ ...prev, [memberId]: { ...balances } }));
    };
    const handleSaveBalances = async (memberId: string) => {
      setSavingMemberId(memberId);
      const input = balancesInput[memberId];
      await supabase
        .from('member_leave_balances')
        .upsert({
          member_id: memberId,
          year: new Date().getFullYear(),
          sick_leaves: input.sick_leaves,
          casual_leaves: input.casual_leaves,
          paid_leaves: input.paid_leaves,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'member_id,year' });
      setEditingBalances((prev) => ({ ...prev, [memberId]: false }));
      setLeaveBalancesLoading(true);
      const res = await supabase
        .from('member_leave_balances')
        .select('*');
      setLeaveBalances(res.data || []);
      setLeaveBalancesLoading(false);
      setSavingMemberId(null);
      console.log('Refetched leave balances:', res.data);
    };

    const handleSaveDefaults = async () => {
      await supabase.from('leave_defaults').upsert({
        id: 1,
        sick_leaves: defaultsInput.sick_leaves,
        casual_leaves: defaultsInput.casual_leaves,
        paid_leaves: defaultsInput.paid_leaves,
      });
      setLeaveDefaults(defaultsInput);
      setEditingDefaults(false);
    };

    // Add search for Member Leave Balances & History
    const filteredMembers = members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()));

    return (
      <div className="p-6 space-y-8">

        {/* Pending Leaves Section (no search/filter) */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Pending Leaves</h2>
          {pendingLeaves.length === 0 ? (
            <div className="text-gray-500">No pending leave requests.</div>
        ) : (
          <div className="grid gap-4">
              {pendingLeaves.map(leave => (
                <Card key={leave.id} className="flex flex-col md:flex-row justify-between items-start md:items-center border border-gray-200 bg-white">
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-gray-900 text-base">{leave.user?.name || 'Unknown User'}</div>
                    <div className="text-xs text-gray-400 mb-1">{leave.created_at ? format(leave.created_at) : ''}</div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Type:</span> {leave.category === 'multi-day' ? 'Multi-day' : 'Single Day'}
                      {leave.category === 'multi-day' && leave.from_date && leave.to_date && (
                        <>
                          <span className="mx-2">|</span><span className="font-medium">From:</span> {formatDate(leave.from_date)} <span className="font-medium">To:</span> {formatDate(leave.to_date)}
                        </>
                      )}
                      {leave.category !== 'multi-day' && (leave.leave_date || leave.from_date) && (
                        <>
                          <span className="mx-2">|</span><span className="font-medium">Date:</span> {formatDate(leave.leave_date || leave.from_date)}
                        </>
                      )}
                      <span className="mx-2">|</span><span className="font-medium">Leave Type:</span> {leave.leave_type}
                    </div>
                    <div className="text-xs text-gray-500">Reason: {leave.reason}</div>
                    <div className="text-xs flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold 
                        ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${leave.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${leave.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}>{leave.status}</span>
                    </div>
                    {/* Live days breakdown for multi-day leaves */}
                    {leave.category === 'multi-day' && leave.from_date && leave.to_date && (
                      <div className="text-xs text-gray-700 bg-gray-50 rounded p-2 mt-1">
                        {(() => {
                          const info = getDaysInfo(
                            leave.from_date,
                            leave.to_date,
                            leaves.filter(l => l.user_id === leave.user_id && l.id !== leave.id),
                            holidays.map(h => h.date)
                          );
                          return (
                            <>
                              <span className="font-semibold">Total days:</span> {info.total} &nbsp;|&nbsp;
                              <span className="font-semibold">Sundays:</span> {info.sundays} &nbsp;|&nbsp;
                              <span className="font-semibold">Holidays:</span> {info.holidays} &nbsp;|&nbsp;
                              <span className="font-semibold">Already leave:</span> {info.alreadyLeave} &nbsp;|&nbsp;
                              <span className="font-semibold">Leave days:</span> {info.leaveDays}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                    <div className="flex flex-row md:flex-col gap-2 mt-4 md:mt-0 md:ml-6">
                      <Button variant="primary" size="sm" onClick={async () => await handleApproveDeclineLeave(leave.id, 'approved', leave.user_id, leave.leave_date, leave.end_date ?? null, leave.leave_type, leave.category, leave.from_date, leave.to_date)}>Approve</Button>
                      <Button variant="danger" size="sm" onClick={async () => await handleApproveDeclineLeave(leave.id, 'rejected', leave.user_id, leave.leave_date, leave.end_date ?? null, leave.leave_type, leave.category, leave.from_date, leave.to_date)}>Decline</Button>
                    </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Member Balances & History Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-8">Member Leave Balances & History</h2>
          <input
            type="text"
            placeholder="Search member by name..."
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-64 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <div className="space-y-4">
            {filteredMembers.map(member => {
              const balances = leaveBalances.find((b: any) => b.member_id === member.id && b.year === new Date().getFullYear());
              const memberLeaves = leavesByMember[member.id] || [];
              return (
                <Card key={member.id} className="border border-gray-200 bg-white">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}>
                    <div className="font-semibold text-gray-900 text-base py-2">{member.name}</div>
                    <Button size="sm" variant="outline">{expandedMember === member.id ? 'Hide' : 'Show'}</Button>
                  </div>
                  {expandedMember === member.id && (
                    <div className="p-4 border-t mt-2">
                      <div className="mb-2 font-medium text-gray-700">Leave Balances ({new Date().getFullYear()}):</div>
                      {balances ? (
                        <div className="flex gap-4 items-center mb-4">
                          {isSuperAdmin && editingBalances[member.id] ? (
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                              <label className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Sick</span>
                                <input type="number" className="border rounded px-2 py-1 w-20" value={balancesInput[member.id]?.sick_leaves ?? balances?.sick_leaves ?? 30} onChange={e => setBalancesInput((prev: any) => ({ ...prev, [member.id]: { ...prev[member.id], sick_leaves: +e.target.value } }))} />
                              </label>
                              <label className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Casual</span>
                                <input type="number" className="border rounded px-2 py-1 w-20" value={balancesInput[member.id]?.casual_leaves ?? balances?.casual_leaves ?? 30} onChange={e => setBalancesInput((prev: any) => ({ ...prev, [member.id]: { ...prev[member.id], casual_leaves: +e.target.value } }))} />
                              </label>
                              <label className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Paid</span>
                                <input type="number" className="border rounded px-2 py-1 w-20" value={balancesInput[member.id]?.paid_leaves ?? balances?.paid_leaves ?? 30} onChange={e => setBalancesInput((prev: any) => ({ ...prev, [member.id]: { ...prev[member.id], paid_leaves: +e.target.value } }))} />
                              </label>
                              <div className="flex gap-2 ml-2 mt-2 md:mt-0">
                                <Button size="sm" variant="primary" onClick={async () => {
                                  setSavingMemberId(member.id);
                                  const input = balancesInput[member.id];
                                  const { error } = await supabase
                                    .from('member_leave_balances')
                                    .upsert({
                                      member_id: member.id,
                                      year: year,
                                      sick_leaves: input.sick_leaves,
                                      casual_leaves: input.casual_leaves,
                                      paid_leaves: input.paid_leaves,
                                      updated_at: new Date().toISOString(),
                                    }, { onConflict: 'member_id,year' });
                                  if (!error) {
                                    toast('✅ Leave balances updated', { style: { background: '#10b981', color: 'white' }, duration: 3000 });
                                  } else {
                                    toast('❌ Failed to update leave balances', { style: { background: '#ef4444', color: 'white' }, duration: 4000 });
                                  }
                                  setEditingBalances((prev) => ({ ...prev, [member.id]: false }));
                                  setLeaveBalancesLoading(true);
                                  const res = await supabase
                                    .from('member_leave_balances')
                                    .select('*');
                                  setLeaveBalances(res.data || []);
                                  setLeaveBalancesLoading(false);
                                  setSavingMemberId(null);
                                }} disabled={savingMemberId === member.id}>
                                  {savingMemberId === member.id ? 'Saving...' : 'Save'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingBalances((prev) => ({ ...prev, [member.id]: false }))} disabled={savingMemberId === member.id}>Cancel</Button>
                              </div>
                              <div className="text-xs text-gray-500 mt-2 w-full">These values override the default for this member for the year.</div>
                            </div>
                          ) : (
                            <>
                              <span className="px-2 py-1 bg-blue-50 rounded">Sick: {balances.sick_leaves}</span>
                              <span className="px-2 py-1 bg-yellow-50 rounded">Casual: {balances.casual_leaves}</span>
                              <span className="px-2 py-1 bg-green-50 rounded">Paid: {balances.paid_leaves}</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500">No balance record for this year.</div>
                      )}
                      <div className="mb-2 font-medium text-gray-700">Leave History:</div>
                      <div className="space-y-2">
                        {memberLeaves.length === 0 ? (
                          <div className="text-gray-500">No leaves found.</div>
                        ) : (
                          memberLeaves.map(lv => (
                            <div key={lv.id} className="border rounded p-2 flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50">
                              <div>
                                <span className="font-semibold">{lv.leave_type}</span> - {lv.category === 'multi-day' ? `${formatDate(lv.from_date)} to ${formatDate(lv.to_date)}` : formatDate(lv.leave_date || lv.from_date)}
                                <span className="ml-2 text-xs">({lv.status})</span>
                                {lv.approved_by && (lv.status === 'approved' || lv.status === 'rejected') && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {lv.status === 'approved' ? 'Approved' : 'Rejected'} by: {admins.find(a => a.id === lv.approved_by)?.name || 'Unknown Admin'}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">Reason: {lv.reason}</div>
                              <Button variant="outline" size="sm" icon={Pencil} onClick={() => { setEditLeave(lv); setEditFormOpen(true); }}>Edit</Button>
                            </div>
                          ))
                        )}
                      </div>
          </div>
        )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Project Manager Leave Balances Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-8">Project Manager Leave Balances</h2>
          <div className="space-y-4">
            {projectManagers.map(pm => {
              const balances = pmLeaveBalances.find((b: any) => b.project_manager_id === pm.id && b.year === new Date().getFullYear());
              const pmLeaves = leaves.filter(l => l.user_id === pm.id);
              return (
                <Card key={pm.id} className="border border-gray-200 bg-white">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedMember(expandedMember === pm.id ? null : pm.id)}>
                    <div className="font-semibold text-gray-900 text-base py-2">{pm.name} (Project Manager)</div>
                    <Button size="sm" variant="outline">{expandedMember === pm.id ? 'Hide' : 'Show'}</Button>
                  </div>
                  {expandedMember === pm.id && (
                    <div className="p-4 border-t mt-2">
                      <div className="mb-2 font-medium text-gray-700">Leave Balances ({new Date().getFullYear()}):</div>
                      <div className="flex gap-4 items-center mb-4">
                        <span className="px-2 py-1 bg-blue-50 rounded">Sick: {balances?.sick_leave ?? leaveDefaults.sick_leaves}</span>
                        <span className="px-2 py-1 bg-yellow-50 rounded">Casual: {balances?.casual_leave ?? leaveDefaults.casual_leaves}</span>
                        <span className="px-2 py-1 bg-green-50 rounded">Earned: {balances?.earned_leave ?? leaveDefaults.paid_leaves}</span>
                      </div>
                      <div className="mb-2 font-medium text-gray-700">Leave History:</div>
                      <div className="space-y-2">
                        {pmLeaves.length === 0 ? (
                          <div className="text-gray-500">No leaves found.</div>
                        ) : (
                          pmLeaves.map(lv => (
                            <div key={lv.id} className="border rounded p-2 flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50">
                              <div>
                                <span className="font-semibold">{lv.leave_type}</span> - {lv.category === 'multi-day' ? `${formatDate(lv.from_date)} to ${formatDate(lv.to_date)}` : formatDate(lv.leave_date || lv.from_date)}
                                <span className="ml-2 text-xs">({lv.status})</span>
                                {lv.approved_by && (lv.status === 'approved' || lv.status === 'rejected') && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {lv.status === 'approved' ? 'Approved' : 'Rejected'} by: {admins.find(a => a.id === lv.approved_by)?.name || 'Unknown Admin'}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">Reason: {lv.reason}</div>
                              <Button variant="outline" size="sm" icon={Pencil} onClick={() => { setEditLeave(lv); setEditFormOpen(true); }}>Edit</Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'team') {
    return <MembersList />;
  }

  if (activeTab === 'reports') {
    return (
      <div className="space-y-6">

        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Completion Rate</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Completed</span>
                <span>{tasks.filter(t => t.status === 'completed').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending</span>
                <span>{tasks.filter(t => t.status === 'pending').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Blocked</span>
                <span>{tasks.filter(t => t.status === 'blocked').length}</span>
              </div>
            </div>
          </Card>
          
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Casual Leaves</span>
                <span>{leaves.filter(l => l.leave_type === 'casual').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sick Leaves</span>
                <span>{leaves.filter(l => l.leave_type === 'sick').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paid Leaves</span>
                <span>{leaves.filter(l => l.leave_type === 'paid').length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === 'settings') {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">Configure webhooks and system settings</p>
        </div>
        <WebhookSettings />
      </div>
    );
  }

  if (activeTab === 'projects') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Projects Hub</h2>
              <p className="text-gray-600 text-lg">Manage and track all your projects in one place</p>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{projects.length} Total Projects</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{projects.filter(p => p.status === 'completed').length} Completed</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{projects.filter(p => p.status === 'active').length} Active</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>{projects.filter(p => p.status === 'on_hold').length} On Hold</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>{projects.filter(p => p.status === 'cancelled').length} Cancelled</span>
                </div>
              </div>
            </div>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
              onClick={() => setIsProjectFormOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Project
          </Button>
        </div>
          {projectsError && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Error Loading Projects</h4>
                  <p className="text-sm">{projectsError}</p>
                </div>
              </div>
            </div>
          )}
        {projectsLoading ? (
            <div className="text-center py-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-pulse"></div>
              </div>
              <p className="text-gray-600 mt-6 text-lg">Loading your projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Plus className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No projects yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Start building something amazing! Create your first project to get started with task management.</p>
              <Button 
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
                onClick={() => setIsProjectFormOpen(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Project
              </Button>
          </div>
        ) : (
            <>
              {/* Project Filters */}
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <div className="p-6">
                  <ProjectFiltersComponent
                    filters={projectFilters}
                    onFiltersChange={setProjectFilters}
                    clients={[...new Set(projects.map(p => p.client_name).filter(Boolean))]}
                    projectManagers={projectManagers}
                  />
                </div>
              </Card>

              {/* Filtered Projects Grid */}
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {projects
                  .filter(project => {
                    // Search filter
                    if (projectFilters.search) {
                      const searchTerm = projectFilters.search.toLowerCase();
                      const matchesName = project.name.toLowerCase().includes(searchTerm);
                      const matchesDescription = project.description?.toLowerCase().includes(searchTerm) || false;
                      const matchesClient = project.client_name?.toLowerCase().includes(searchTerm) || false;
                      if (!matchesName && !matchesDescription && !matchesClient) return false;
                    }

                    // Status filter
                    if (projectFilters.status) {
                      // Use the project's actual status from database if available
                      if (project.status && project.status === projectFilters.status) {
                        // Status matches exactly
                      } else if (!project.status) {
                        // Fallback to calculating status from tasks
                        const projectTasks = tasks.filter(task => task.project_id === project.id);
                        const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
                        const inProgressTasks = projectTasks.filter(task => task.status === 'in_progress').length;
                        const projectStatus = completedTasks === projectTasks.length && projectTasks.length > 0 ? 'completed' : 
                                            inProgressTasks > 0 ? 'in_progress' : 'pending';
                        if (projectStatus !== projectFilters.status) return false;
                      } else {
                        // Project has status but it doesn't match filter
                        return false;
                      }
                    }

                    // Client filter
                    if (projectFilters.client && project.client_name !== projectFilters.client) {
                      return false;
                    }

                    // Project Manager filter
                    if (projectFilters.projectManager) {
                      // Check if the project is assigned to the selected project manager
                      const isAssignedToPM = projectManagerAssignments.some(
                        assignment => assignment.project_id === project.id && 
                        assignment.project_manager_id === projectFilters.projectManager
                      );
                      if (!isAssignedToPM) return false;
                    }

                    return true;
                  })
                  .sort((a, b) => {
                    // Sort filter
                    switch (projectFilters.dateSort) {
                      case 'oldest':
                        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                      case 'name_asc':
                        return a.name.localeCompare(b.name);
                      case 'name_desc':
                        return b.name.localeCompare(a.name);
                      case 'newest':
                      default:
                        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                    }
                  })
                  .map(project => {
              const projectTasks = tasks.filter(task => task.project_id === project.id);
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAdmin
                  tasks={projectTasks}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                  onProjectUpdate={handleProjectUpdate}
                />
              );
            })}
          </div>
            </>
        )}
        <Modal isOpen={isProjectFormOpen} onClose={() => setIsProjectFormOpen(false)} title="Add Project">
          <form
            onSubmit={async e => {
              e.preventDefault();
              
              try {
                // Extract project manager ID from form data
                const { project_manager_id, ...projectData } = projectForm;
                
                // Create the project
                const newProject = await addProject(projectData);
                
                // If a project manager is selected, create the assignment
                if (project_manager_id && newProject) {
                  try {
                    await supabase
                      .from('project_manager_assignments')
                      .insert({
                        project_manager_id: project_manager_id,
                        project_id: newProject.id,
                        assigned_by: user?.id || null
                      });
                    
                    // Get the project manager name for the success message
                    const selectedPM = projectManagers.find(pm => pm.id === project_manager_id);
                    if (selectedPM) {
                      toast.success(`Project created and assigned to ${selectedPM.name} successfully!`);
                    } else {
                      toast.success('Project created successfully!');
                    }
                  } catch (error) {
                    console.error('Failed to assign project manager:', error);
                    toast.success('Project created successfully! (Project manager assignment failed)');
                  }
                } else {
                  toast.success('Project created successfully!');
                }
                
                // Refresh the projects list to show the new project
                fetchProjects();
                
                setIsProjectFormOpen(false);
                setProjectForm({ name: '', description: '', client_name: '', start_date: '', expected_end_date: '', project_manager_id: '' });
              } catch (error) {
                console.error('Failed to create project:', error);
                toast.error('Failed to create project');
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Project Name"
                value={projectForm.name}
                onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Client Name"
                value={projectForm.client_name}
                onChange={e => setProjectForm(f => ({ ...f, client_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                placeholder="Description"
                value={projectForm.description}
                onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="date"
                placeholder="Start Date"
                value={projectForm.start_date}
                onChange={e => setProjectForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected End Date</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="date"
                placeholder="Expected End Date"
                value={projectForm.expected_end_date}
                onChange={e => setProjectForm(f => ({ ...f, expected_end_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={projectForm.project_manager_id}
                onChange={e => setProjectForm(f => ({ ...f, project_manager_id: e.target.value }))}
              >
                <option value="">No Project Manager (Unassigned)</option>
                {projectManagers.map(pm => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name ? `${pm.name}${pm.email ? ` (${pm.email})` : ''}` : pm.email || 'Unknown Project Manager'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Add Project</Button>
            </div>
          </form>
        </Modal>
        {/* Edit Project Modal */}
        <Modal isOpen={!!editProject} onClose={() => setEditProject(null)} title="Edit Project">
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Project Name"
                value={editProjectForm.name}
                onChange={e => setEditProjectForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Client Name"
                value={editProjectForm.client_name}
                onChange={e => setEditProjectForm(f => ({ ...f, client_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                placeholder="Description"
                value={editProjectForm.description}
                onChange={e => setEditProjectForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="date"
                placeholder="Start Date"
                value={editProjectForm.start_date}
                onChange={e => setEditProjectForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected End Date</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="date"
                placeholder="Expected End Date"
                value={editProjectForm.expected_end_date}
                onChange={e => setEditProjectForm(f => ({ ...f, expected_end_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={editProjectForm.status}
                onChange={e => setEditProjectForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Update Project</Button>
            </div>
          </form>
        </Modal>
        </div>
      </div>
    );
  }

  // Add profile tab for admin
  if (activeTab === 'profile') {
    if (!user || user.role !== 'admin') return null;
    return (
      <div className="space-y-6">

        <Card className="max-w-md mx-auto p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mb-2">
              <span className="text-3xl font-bold text-blue-600">{user.name.charAt(0)}</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
            <div className="text-gray-700">{user.email}</div>
            {user.phone && <div className="text-gray-700">Phone: {user.phone}</div>}
            <div className="text-gray-700">Status: <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>{user.is_active ? 'Active' : 'Inactive'}</span></div>
            <div className="text-gray-500 text-sm">Created: {new Date(user.created_at).toLocaleDateString()}</div>
            <div className="text-gray-500 text-sm">Updated: {new Date(user.updated_at).toLocaleDateString()}</div>
            <div className="flex space-x-2 mt-4">
              <Button variant="primary" onClick={() => setEditProfileOpen(true)}>Edit Profile</Button>
              <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>Change Password</Button>
            </div>
          </div>
        </Card>

        {/* Webhook Settings - Only for Super Admin */}
        {isSuperAdmin && <WebhookSettings />}
        
        {/* Show message if not super admin */}
        {!isSuperAdmin && user?.role === 'admin' && (
          <Card className="max-w-md mx-auto p-6 bg-blue-50">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Webhook Settings</h3>
              <p className="text-sm text-blue-700 mb-4">
                Webhook settings are only available to the Super Administrator.
              </p>
              <p className="text-xs text-blue-600">
                Please log in with the super admin account to access webhook controls.
              </p>
            </div>
          </Card>
        )}
        {/* Edit Profile Modal */}
        <Modal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit Profile">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Name"
              value={profileForm.name}
              onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Phone"
              value={profileForm.phone}
              onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
            />
            <div className="flex space-x-2 justify-end">
              <Button variant="outline" onClick={() => setEditProfileOpen(false)} type="button">Cancel</Button>
              <Button variant="primary" type="submit" disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
        {/* Change Password Modal */}
        <Modal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} title="Change Password">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPasswordError('');
              if (passwordForm.new !== passwordForm.confirm) {
                setPasswordError('New passwords do not match.');
                return;
              }
              setPasswordLoading(true);
              if (!user) {
                setPasswordError('User not found.');
                setPasswordLoading(false);
                return;
              }
              const ok = await authService.verifyAdminPassword(user.id, passwordForm.current);
              if (!ok) {
                setPasswordError('Current password is incorrect.');
                setPasswordLoading(false);
                return;
              }
              const password_hash = btoa(passwordForm.new);
              const { error } = await supabase
                .from('admins')
                .update({ password_hash })
                .eq('id', user.id);
              setPasswordLoading(false);
              if (!error) {
                setPasswordForm({ current: '', new: '', confirm: '' });
                setChangePasswordOpen(false);
                alert('Password updated successfully.');
              } else {
                setPasswordError('Failed to update password: ' + error.message);
              }
            }}
            className="space-y-4"
          >
            {passwordError && <div className="p-2 bg-red-100 text-red-700 rounded">{passwordError}</div>}
            <PasswordInput
              className="border rounded px-3 py-2"
              placeholder="Current Password"
              value={passwordForm.current}
              onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
              required
            />
            <PasswordInput
              className="border rounded px-3 py-2"
              placeholder="New Password"
              value={passwordForm.new}
              onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))}
              required
            />
            <PasswordInput
              className="border rounded px-3 py-2"
              placeholder="Confirm New Password"
              value={passwordForm.confirm}
              onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
              required
            />
            <div className="flex space-x-2 justify-end">
              <Button variant="outline" onClick={() => setChangePasswordOpen(false)} type="button">Cancel</Button>
              <Button variant="primary" type="submit" disabled={passwordLoading}>{passwordLoading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // Add project manager management tab for admin
  if (activeTab === 'project-manager-management') {
    return (
      <div className="space-y-6">
        <ProjectManagerManagement />
      </div>
    );
  }

  // Add admin management tab for admin
  if (activeTab === 'admin-management') {
    // Only Super-Admin can see this section
    if (!user || user.email !== 'contact.tasknova@gmail.com') {
      return (
        <div className="p-8 text-center text-gray-500">You do not have access to this section.</div>
      );
    }
    return (
      <div className="space-y-8">

        
        {/* Admins Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Admins</h2>
          <AdminsList />
        </div>
      </div>
    );
  }

  if (activeTab === 'leave-defaults' && isSuperAdmin) {
    // Combine members and project managers for leave management
    const allTeamMembers = [...members, ...projectManagers];
    if (leaveBalancesLoading || allTeamMembers.length === 0) {
      return <div className="text-center py-8 text-gray-500">Loading leave balances...</div>;
    }
    const filteredMembers = allTeamMembers.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

    // Date display
    const today = new Date();
    const year = today.getFullYear();
    const nextYear = year + 1;
    const calendarYear = `${year}-${nextYear}`;
    const todayDay = today.getDate();
    const todayMonth = today.toLocaleString(undefined, { month: 'short' });
    const todayYear = today.getFullYear();

    // Modal handlers scoped here
    const openEditModal = (memberId: string, balances: any) => {
      setEditModalMemberId(memberId);
      setModalInput({
        sick_leaves: balances?.sick_leaves ?? 30,
        casual_leaves: balances?.casual_leaves ?? 30,
        paid_leaves: balances?.paid_leaves ?? 30,
      });
    };
    const closeEditModal = () => {
      setEditModalMemberId(null);
      setModalInput({ sick_leaves: 30, casual_leaves: 30, paid_leaves: 30 });
      setModalSaving(false);
    };
    const handleModalSave = async () => {
      if (!editModalMemberId) return;
      setModalSaving(true);
      await supabase
        .from('member_leave_balances')
        .upsert([
          {
            member_id: editModalMemberId,
            year: year,
            sick_leaves: modalInput.sick_leaves,
            casual_leaves: modalInput.casual_leaves,
            paid_leaves: modalInput.paid_leaves,
            updated_at: new Date().toISOString(),
          }
        ], { onConflict: 'member_id,year' });
      setLeaveBalancesLoading(true);
      const res = await supabase
        .from('member_leave_balances')
        .select('*');
      setLeaveBalances(res.data || []);
      setLeaveBalancesLoading(false);
      setModalSaving(false);
      setEditModalMemberId(null);
    };

    return (
      <div className="space-y-8 max-w-2xl mx-auto mt-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>

            <div className="flex items-center gap-6 text-sm text-gray-700 mt-2">
              <span className="font-semibold animate-fade-in">Year: <span className="text-blue-600 font-bold animate-pulse-slow">{calendarYear}</span></span>
              <span className="font-semibold animate-fade-in">Today: <span className="text-green-600 font-bold animate-pulse-slow">{today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search member by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>
        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <div className="text-gray-500 text-center">No members found.</div>
          ) : filteredMembers.map(member => {
            const isProjectManager = projectManagers.some(pm => pm.id === member.id);
            const role = isProjectManager ? 'Project Manager' : 'Member';
            
            // Find balances based on role
            const balances = isProjectManager 
              ? pmLeaveBalances.find(b => b.project_manager_id === member.id && b.year === year)
              : leaveBalances.find(b => b.member_id === member.id && b.year === year);
            return (
              <div key={member.id} className="flex items-center justify-between bg-white rounded-lg shadow p-4 mb-4 border border-gray-100">
                <div className="flex items-center gap-3">
                <div className="font-semibold text-lg text-gray-900">{member.name}</div>
                  <span className={`text-xs px-2 py-1 rounded-full ${isProjectManager ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {role}
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  {editingBalances[member.id] ? (
                    <>
                      <input type="number" className="border rounded px-2 py-1 w-20" value={balancesInput[member.id]?.sick_leaves ?? balances?.sick_leaves ?? 30} onChange={e => setBalancesInput((prev: any) => ({ ...prev, [member.id]: { ...prev[member.id], sick_leaves: +e.target.value } }))} />
                      <input type="number" className="border rounded px-2 py-1 w-20" value={balancesInput[member.id]?.casual_leaves ?? balances?.casual_leaves ?? 30} onChange={e => setBalancesInput((prev: any) => ({ ...prev, [member.id]: { ...prev[member.id], casual_leaves: +e.target.value } }))} />
                      <input type="number" className="border rounded px-2 py-1 w-20" value={balancesInput[member.id]?.paid_leaves ?? (isProjectManager ? balances?.earned_leave : balances?.paid_leaves) ?? 30} onChange={e => setBalancesInput((prev: any) => ({ ...prev, [member.id]: { ...prev[member.id], paid_leaves: +e.target.value } }))} />
                      <Button size="sm" variant="primary" onClick={async () => {
                        setSavingMemberId(member.id);
                        const input = balancesInput[member.id];
                        
                        let error;
                        if (isProjectManager) {
                          // Save to project_manager_leave_balances table
                          const { error: pmError } = await supabase
                            .from('project_manager_leave_balances')
                            .upsert({
                              project_manager_id: member.id,
                              year: year,
                              sick_leave: input.sick_leaves,
                              casual_leave: input.casual_leaves,
                              earned_leave: input.paid_leaves, // PM table uses earned_leave instead of paid_leaves
                              updated_at: new Date().toISOString(),
                            }, { onConflict: 'project_manager_id,year' });
                          error = pmError;
                        } else {
                          // Save to member_leave_balances table
                          const { error: memberError } = await supabase
                          .from('member_leave_balances')
                          .upsert({
                            member_id: member.id,
                            year: year,
                            sick_leaves: input.sick_leaves,
                            casual_leaves: input.casual_leaves,
                            paid_leaves: input.paid_leaves,
                            updated_at: new Date().toISOString(),
                          }, { onConflict: 'member_id,year' });
                          error = memberError;
                        }
                        
                        if (!error) {
                          toast('✅ Leave balances updated', { style: { background: '#10b981', color: 'white' }, duration: 3000 });
                        } else {
                          console.error('Failed to update leave balances for:', member.name, 'Error:', error);
                          toast('❌ Failed to update leave balances', { style: { background: '#ef4444', color: 'white' }, duration: 4000 });
                        }
                        setEditingBalances((prev) => ({ ...prev, [member.id]: false }));
                        setLeaveBalancesLoading(true);
                        
                        // Refresh both tables
                        const [memberRes, pmRes] = await Promise.all([
                          supabase.from('member_leave_balances').select('*'),
                          supabase.from('project_manager_leave_balances').select('*')
                        ]);
                        setLeaveBalances(memberRes.data || []);
                        setPmLeaveBalances(pmRes.data || []);
                        setLeaveBalancesLoading(false);
                        setSavingMemberId(null);
                      }} disabled={savingMemberId === member.id}>
                        {savingMemberId === member.id ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingBalances((prev) => ({ ...prev, [member.id]: false }))} disabled={savingMemberId === member.id}>Cancel</Button>
                    </>
                  ) : (
                    <>
                  <span className="px-2 py-1 bg-blue-50 rounded">Sick: {isProjectManager ? (balances?.sick_leave ?? 30) : (balances?.sick_leaves ?? 30)}</span>
                  <span className="px-2 py-1 bg-yellow-50 rounded">Casual: {isProjectManager ? (balances?.casual_leave ?? 30) : (balances?.casual_leaves ?? 30)}</span>
                  <span className="px-2 py-1 bg-green-50 rounded">{isProjectManager ? 'Earned' : 'Paid'}: {isProjectManager ? (balances?.earned_leave ?? 30) : (balances?.paid_leaves ?? 30)}</span>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingBalances((prev) => ({ ...prev, [member.id]: true }));
                        setBalancesInput((prev: any) => ({ 
                          ...prev, 
                          [member.id]: { 
                            sick_leaves: isProjectManager ? (balances?.sick_leave ?? 30) : (balances?.sick_leaves ?? 30), 
                            casual_leaves: isProjectManager ? (balances?.casual_leave ?? 30) : (balances?.casual_leaves ?? 30), 
                            paid_leaves: isProjectManager ? (balances?.earned_leave ?? 30) : (balances?.paid_leaves ?? 30) 
                          } 
                        }));
                      }}>Edit</Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Modal for editing leave balances */}
        {editModalMemberId && (
          <Modal isOpen={!!editModalMemberId} onClose={closeEditModal} title="Edit Leave Balances">
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2">
                  <span className="w-20">Sick</span>
                  <input type="number" className="border rounded px-2 py-1 w-24" value={modalInput.sick_leaves} onChange={e => setModalInput(prev => ({ ...prev, sick_leaves: +e.target.value }))} />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-20">Casual</span>
                  <input type="number" className="border rounded px-2 py-1 w-24" value={modalInput.casual_leaves} onChange={e => setModalInput(prev => ({ ...prev, casual_leaves: +e.target.value }))} />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-20">Paid</span>
                  <input type="number" className="border rounded px-2 py-1 w-24" value={modalInput.paid_leaves} onChange={e => setModalInput(prev => ({ ...prev, paid_leaves: +e.target.value }))} />
                </label>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <Button size="sm" variant="primary" onClick={handleModalSave} disabled={modalSaving}>{modalSaving ? 'Saving...' : 'Save'}</Button>
                <Button size="sm" variant="outline" onClick={closeEditModal} disabled={modalSaving}>Cancel</Button>
              </div>
              <div className="text-xs text-gray-500 mt-2">These values override the default for this member for the year.</div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  if (activeTab === 'notifications') {
    return (
      <div className="max-w-2xl mx-auto py-8">

        {adminNotificationsLoading ? (
          <div className="text-gray-500">Loading notifications...</div>
        ) : adminNotifications.length === 0 ? (
          <div className="text-gray-500">No notifications.</div>
        ) : (
          <div className="space-y-4">
            {adminNotifications.map(n => (
              <Card key={n.id + '-' + n.created_at} className="flex items-center justify-between p-4 border border-gray-200 bg-white">
                <div>
                  <div className="font-semibold text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-700">{n.message}</div>
                  <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => {
                    addDismissedNotification(n.id);
                    setAdminNotifications(adminNotifications => adminNotifications.filter(x => x.id !== n.id));
                    supabase.from('notifications').delete().eq('id', n.id);
                    // Update notification dot
                    const remainingNotifications = adminNotifications.filter(x => x.id !== n.id);
                    const hasUnread = remainingNotifications.some(notification => !notification.is_read);
                    window.dispatchEvent(new CustomEvent('notifications-dot', { detail: { hasUnread } }));
                  }}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (editFormOpen && editLeave) {
    return (
      <LeaveForm
        isOpen={editFormOpen}
        onClose={() => { setEditFormOpen(false); setEditLeave(null); }}
        onSubmit={leave => {
          // Call updateLeave (reuse the member logic or call your admin update function)
          updateLeave(leave.id, leave);
          setEditFormOpen(false);
          setEditLeave(null);
        }}
        selectedDate={editLeave?.leave_date || undefined}
        initialData={editLeave}
        noModal={false}
        leaves={leaves}
        holidays={holidays}
      />
    );
  }

  // --- Company Holidays Tab ---
  if (activeTab === 'holidays') {
    const filteredHolidays = holidays.filter(h => 
      h.holiday_name.toLowerCase().includes(holidaySearch.toLowerCase()) ||
      (h.description && h.description.toLowerCase().includes(holidaySearch.toLowerCase())) ||
      new Date(h.date).toLocaleDateString().includes(holidaySearch)
    );

    // Calculate analytics
    const currentYear = new Date().getFullYear();
    const currentYearHolidays = holidays.filter(h => new Date(h.date).getFullYear() === currentYear);
    const upcomingHolidays = holidays.filter(h => new Date(h.date) > new Date());
    const pastHolidays = holidays.filter(h => new Date(h.date) < new Date());
    const thisMonthHolidays = holidays.filter(h => {
      const holidayDate = new Date(h.date);
      const now = new Date();
      return holidayDate.getMonth() === now.getMonth() && holidayDate.getFullYear() === now.getFullYear();
    });

    return (
      <div className="space-y-6">
        {/* Enhanced Header Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Company Calendar Hub</h1>
                <p className="text-gray-600 text-sm">Manage and track all company holidays and important dates</p>
              </div>
            </div>
            <Button 
              onClick={() => {
                setEditHoliday(null);
                setHolidayForm({ holiday_name: '', date: '', description: '' });
                setHolidayModalOpen(true);
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Add Holiday
            </Button>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Holidays</p>
                <p className="text-2xl font-bold text-gray-900">{holidays.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Year</p>
                <p className="text-2xl font-bold text-green-600">{currentYearHolidays.length}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-orange-600">{upcomingHolidays.length}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-purple-600">{thisMonthHolidays.length}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex space-x-2">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-all duration-200 ${
                  holidayView === 'calendar' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => setHolidayView('calendar')}
              >
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Calendar View
                </div>
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-all duration-200 ${
                  holidayView === 'list' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => setHolidayView('list')}
              >
                <div className="flex items-center">
                  <List className="h-4 w-4 mr-2" />
                  List View
                </div>
              </button>
            </div>
          </div>
          
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search holidays..."
              className="pl-10 pr-20 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
              value={holidaySearch}
              onChange={(e) => setHolidaySearch(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  // Trigger search on Enter key
                  e.preventDefault();
                }
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-green-600 hover:bg-green-700 text-white border-0 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200"
              onClick={() => {
                // Search functionality is already handled by the onChange event
                // This button provides visual feedback and accessibility
              }}
            >
              Search
            </Button>
          </div>
        </div>

        {holidaysLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : holidayView === 'calendar' ? (
          <HolidayCalendar
            holidays={filteredHolidays}
            onAddHoliday={handleAddHoliday}
            onUpdateHoliday={handleUpdateHoliday}
            onDeleteHoliday={handleDeleteHoliday}
            isAdmin={true}
          />
        ) : (
          <Card className="border border-gray-200 shadow-sm">
            <div className="p-6">
              {filteredHolidays.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredHolidays.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(h.date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">{h.holiday_name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-700 max-w-xs truncate">
                              {h.description || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {(() => {
                                const holidayDate = new Date(h.date);
                                const today = new Date();
                                const isPast = holidayDate < today;
                                
                                return (
                                  <>
                                    {!isPast && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditHoliday(h);
                                          setHolidayForm({
                                            holiday_name: h.holiday_name,
                                            date: h.date,
                                            description: h.description || ''
                                          });
                                          setHolidayModalOpen(true);
                                        }}
                                        className="hover:bg-green-50 hover:border-green-300"
                                      >
                                        Edit
                                      </Button>
                                    )}
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleDeleteHoliday(h.id)}
                                      disabled={isPast}
                                      className="hover:bg-red-50"
                                    >
                                      Delete
                                    </Button>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Holidays Found</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {holidaySearch ? 'No holidays match your search criteria.' : 'No holidays have been added yet. Get started by adding your first company holiday.'}
                  </p>
                  {!holidaySearch && (
                    <Button
                      onClick={() => {
                        setEditHoliday(null);
                        setHolidayForm({ holiday_name: '', date: '', description: '' });
                        setHolidayModalOpen(true);
                      }}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      Add Your First Holiday
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
        
        <Modal 
          isOpen={holidayModalOpen} 
          onClose={() => setHolidayModalOpen(false)} 
          title={editHoliday ? 'Edit Holiday' : 'Add Holiday'}
        >
          <form
            onSubmit={async e => {
              e.preventDefault();
              
              // Check if date is in the past
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const selectedDate = new Date(holidayForm.date);
              
              if (selectedDate < today) {
                toast.error('Cannot select a past date for holidays. Please choose a future date.');
                return;
              }
              
              // Check if date already exists (only for new holidays)
              if (!editHoliday) {
                const existingHoliday = holidays.find(h => h.date === holidayForm.date);
                if (existingHoliday) {
                  toast.error(`A holiday already exists on ${new Date(holidayForm.date).toLocaleDateString()}: ${existingHoliday.holiday_name}`);
                  return;
                }
              }
              
              setHolidaySaving(true);
              const year = parseInt(holidayForm.date.slice(0, 4), 10);
              
              try {
                if (editHoliday) {
                  const { data, error } = await supabase.from('company_holidays').update({ ...holidayForm, year }).eq('id', editHoliday.id).select();
                  if (error) {
                    toast.error('Failed to update holiday: ' + error.message);
                    return;
                  }
                  if (data && data[0]) {
                    setHolidays(prev => prev.map(h => h.id === editHoliday.id ? data[0] : h));
                    toast.success('Holiday updated successfully!');
                  }
                } else {
                  const { data, error } = await supabase.from('company_holidays').insert({ ...holidayForm, year }).select();
                  if (error) {
                    toast.error('Failed to add holiday: ' + error.message);
                    return;
                  }
                  if (data && data[0]) {
                    setHolidays(prev => [...prev, data[0]].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
                    toast.success('Holiday added successfully!');
                  }
                }
                setHolidayModalOpen(false);
                setHolidayForm({ holiday_name: '', date: '', description: '' });
                setEditHoliday(null);
              } catch (error) {
                toast.error('An unexpected error occurred. Please try again.');
              } finally {
                setHolidaySaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name *</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Holiday Name"
                value={holidayForm.holiday_name}
                onChange={e => setHolidayForm(f => ({ ...f, holiday_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="date"
                value={holidayForm.date}
                onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                placeholder="Description"
                value={holidayForm.description}
                onChange={e => setHolidayForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={holidaySaving}>{holidaySaving ? 'Saving...' : (editHoliday ? 'Update' : 'Add')}</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  if (activeTab === 'daily-tasks') {
    return <DailyTasksPage />;
  }

  if (activeTab === 'deleted-tasks') {
    return <DeletedTasksPage onBack={() => onTabChange('tasks')} />;
  }

  return null;
};

export default AdminDashboard;