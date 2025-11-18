import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Plus, Users, BarChart3, UserPlus, ChevronDown, CheckCircle2, Calendar, Clock, AlertCircle, Calendar as CalendarIcon, Pencil, CalendarDays, List, Search, CheckSquare, Play, Pause } from 'lucide-react';
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
import DashboardStats from './DashboardStats';
import MembersList from './MembersList';
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
import { DailyTasksPage } from './DailyTasksPage';
import LeaveCalendar from './LeaveCalendar';
import LeaveForm from './LeaveForm';
import TaskViewSelector, { TaskViewType } from './TaskViewSelector';
import TaskListView from './TaskListView';
import TaskCalendarView from './TaskCalendarView';
import { MemberTaskStats } from './MemberTaskStats';
import { MemberDailyTaskStats } from './MemberDailyTaskStats';
import { TaskQuickStats } from './TaskQuickStats';

interface ProjectManagerDashboardProps {
  activeTab: string;
}

const ProjectManagerDashboard: React.FC<ProjectManagerDashboardProps> = ({ activeTab }) => {
  // All hooks at the top
  const { tasks, loading: tasksLoading, error: tasksError, addTask, updateTask, deleteTask, filterTasks, refetchTasks } = useTasks();
  const { leaves, loading: leavesLoading, error: leavesError, addLeave, deleteLeave, updateLeave, setLeaves } = useLeaves();
  const { projects, loading: projectsLoading, error: projectsError, addProject, updateProject, deleteProject, fetchProjects } = useProjects();
  const { tasks: dailyTasks, loading: dailyTasksLoading } = useDailyTasks({});
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [assignedProjectsLoading, setAssignedProjectsLoading] = useState(true);
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
    expected_end_date: ''
  });

  // Reset project form when modal closes
  useEffect(() => {
    if (!isProjectFormOpen) {
      setProjectForm({
        name: '',
        description: '',
        client_name: '',
        start_date: '',
        expected_end_date: ''
      });
    }
  }, [isProjectFormOpen]);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { user } = useAuth();
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

  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [projectManagers, setProjectManagers] = useState<{ id: string; name: string }[]>([]);
  const [openSections, setOpenSections] = useState({
    recentlyCompleted: false,
    dueToday: false,
    upcoming: false,
    blocked: false,
  });
  const [showWorking, setShowWorking] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  
  // Leave management state
  const [leaveBalance, setLeaveBalance] = useState<{ sick_leaves: number; casual_leaves: number; paid_leaves: number } | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [editLeave, setEditLeave] = useState(null);
  const [deleteLeaveId, setDeleteLeaveId] = useState<string | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isLeaveFormOpen, setIsLeaveFormOpen] = useState(false);

  // Project Manager notifications state and logic
  const [pmNotifications, setPmNotifications] = useState<any[]>([]);
  const [pmNotificationsLoading, setPmNotificationsLoading] = useState(false);

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

  // Fetch notifications for the project manager
  const fetchPMNotifications = async () => {
    if (!user) return;
    setPmNotificationsLoading(true);
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
      setPmNotifications(unique);
      // Dispatch event for notification dot
      window.dispatchEvent(new CustomEvent('notifications-dot', { detail: { hasUnread: unique.some(n => !n.is_read) } }));
    }
    setPmNotificationsLoading(false);
  };

  // Real-time notifications for project manager
  useEffect(() => {
    fetchPMNotifications();
    if (!user || user.role !== 'project_manager') return;
    
    // Create a Set to track shown notifications and prevent duplicates
    const shownNotifications = new Set();
    
    const channel = supabase.channel('notifications-realtime-pm')
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
            fetchPMNotifications();
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
  }, [user]);

  // Fetch notifications when switching to notifications tab
  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchPMNotifications();
      // Mark notifications as read when project manager views them
      if (pmNotifications.length > 0) {
        const unreadNotifications = pmNotifications.filter(n => !n.is_read);
        if (unreadNotifications.length > 0) {
          // Mark all as read
          Promise.all(unreadNotifications.map(notification =>
            supabase.from('notifications').update({ is_read: true }).eq('id', notification.id)
          )).then(() => {
            // Update local state and dispatch dot event
            setPmNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            window.dispatchEvent(new CustomEvent('notifications-dot', { detail: { hasUnread: false } }));
          });
        }
      }
    }
  }, [activeTab]);

  // Fetch leave balance and holidays for project managers
  useEffect(() => {
    if (!user) return;
    
    const fetchBalance = async () => {
      const currentYear = new Date().getFullYear();
      
      // First try to find balance for member
      let { data, error } = await supabase
        .from('member_leave_balances')
        .select('*')
        .eq('member_id', user.id)
        .eq('year', currentYear)
        .single();
      
      // If not found as member, try as admin
      if (error || !data) {
        const { data: adminData, error: adminError } = await supabase
          .from('member_leave_balances')
          .select('*')
          .eq('admin_id', user.id)
          .eq('year', currentYear)
          .single();
        
        data = adminData;
        error = adminError;
      }
      
      // If not found as admin, try as project manager in the correct table
      if (error || !data) {
        const { data: pmData, error: pmError } = await supabase
          .from('project_manager_leave_balances')
          .select('*')
          .eq('project_manager_id', user.id)
          .eq('year', currentYear)
          .single();
        
        if (!pmError && pmData) {
          // Map the project manager leave balance fields to the expected format
          setLeaveBalance({
            sick_leaves: pmData.sick_leave,
            casual_leaves: pmData.casual_leave,
            paid_leaves: pmData.earned_leave,
          });
          return;
        }
        
        data = pmData;
        error = pmError;
      }
    
      if (!error && data) {
        setLeaveBalance({
          sick_leaves: data.sick_leaves,
          casual_leaves: data.casual_leaves,
          paid_leaves: data.paid_leaves,
        });
      } else {
        setLeaveBalance(null);
      }
    };
    
    const fetchHolidays = async () => {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('*')
        .order('date');
      if (!error && data) {
        // Map the database fields to match the Holiday interface expected by LeaveCalendar
        const mappedHolidays = data.map(holiday => ({
          id: holiday.id,
          name: holiday.holiday_name, // Map holiday_name to name
          date: holiday.date,
          description: holiday.description,
          is_recurring: false // Default value since it's not in the database
        }));
        setHolidays(mappedHolidays);
      }
    };
    
    fetchBalance();
    fetchHolidays();
    
    // Set up real-time subscription for leave balance updates
    if (user.role === 'project_manager') {
      console.log('🔄 PM Dashboard: Setting up real-time subscription for user:', user.id);
      
      const channel = supabase.channel('leave-balance-realtime-pm')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'member_leave_balances',
          },
          (payload) => {
            console.log('🔄 PM Dashboard: member_leave_balances changed:', payload);
            // Check if this change affects the current user
            if (payload.new && (
              (payload.new as any).member_id === user.id || 
              (payload.new as any).admin_id === user.id || 
              (payload.new as any).project_manager_id === user.id
            )) {
              console.log('🔄 PM Dashboard: This change affects current user, refetching balance');
              fetchBalance();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_manager_leave_balances',
          },
          (payload) => {
            console.log('🔄 PM Dashboard: project_manager_leave_balances changed:', payload);
            // Check if this change affects the current user
            if (payload.new && (payload.new as any).project_manager_id === user.id) {
              console.log('🔄 PM Dashboard: This change affects current user, refetching balance');
              fetchBalance();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'leaves',
          },
          (payload) => {
            console.log('🔄 PM Dashboard: Leave status changed:', payload);
            // When a leave status changes (approved/rejected), refetch balance
            if (payload.new && payload.old && 
                (payload.new as any).status !== (payload.old as any).status && 
                (payload.new as any).user_id === user.id) {
              console.log('🔄 PM Dashboard: Leave status changed for current user, refetching balance');
              fetchBalance();
            }
          }
        )
        .subscribe((status) => {
          console.log('🔄 PM Dashboard: Subscription status:', status);
        });
      
      return () => {
        console.log('🔄 PM Dashboard: Cleaning up subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

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
        setProjectManagers(projectManagersData.map(pm => ({ id: pm.id, name: pm.name })));
      }
    };
    fetchMembersAndAdmins();
    const interval = setInterval(fetchMembersAndAdmins, 5000); // Poll every 5 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch assigned projects for project manager
  useEffect(() => {
    if (!user || user.role !== 'project_manager') return;
    
    const fetchAssignedProjects = async () => {
      setAssignedProjectsLoading(true);
      try {
        const { data, error } = await supabase
          .from('project_manager_assignments')
          .select(`
            *,
            project:projects(*)
          `)
          .eq('project_manager_id', user.id)
          .eq('is_active', true);

        if (!error && data) {
          const projects = data
            .map(item => item.project)
            .filter(Boolean) as Project[];
          setAssignedProjects(projects);
        }
      } catch (error) {
        console.error('Error fetching assigned projects:', error);
      } finally {
        setAssignedProjectsLoading(false);
      }
    };

    fetchAssignedProjects();
  }, [user]);

  // Real-time subscription for tasks (project manager sees all changes)
  useEffect(() => {
    if (!user || user.role !== 'project_manager') return;
    const channel = supabase.channel('tasks-realtime-pm')
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
  }, [user, refetchTasks]);

  const filteredTasks = filterTasks(taskFilters);

  // Handle leave operations
  const handleUpdateLeave = async (leave: any) => {
    await updateLeave(leave.id, leave);
    setEditFormOpen(false);
    setEditLeave(null);
  };

  const handleDeleteLeave = async (id: string) => {
    await deleteLeave(id);
    setDeleteConfirmOpen(false);
    setDeleteLeaveId(null);
  };

  const confirmDeleteLeave = () => {
    if (deleteLeaveId) {
      handleDeleteLeave(deleteLeaveId);
    }
  };

  const handleStatusChange = (id: string, status: 'not_started' | 'in_progress' | 'completed') => {
    updateTask(id, { status });
  };

  // Add this handler for editing tasks
  const handleTaskUpdate = async (id: string, updates: Partial<Task>) => {
    const updated = await updateTask(id, updates);
    await refetchTasks();
  };

  // Fix: Wrap addTask for TaskForm to match expected signature
  const handleAddTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    await addTask(task as any); // 'as any' to satisfy the type, since addTask expects created_by
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

    // Filter tasks to only show tasks from assigned projects
    const assignedProjectIds = assignedProjects.map(p => p.id);
    const filteredTasks = tasks.filter(task => 
      !task.project_id || assignedProjectIds.includes(task.project_id)
    );

    // Recently Completed: completed within last 3 days
    const recentlyCompletedTasks = filteredTasks.filter(task => {
      if (task.status !== 'completed' || !task.updated_at) return false;
      const updated = new Date(task.updated_at);
      const diff = (today.getTime() - updated.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24);
      return diff <= 3 && diff >= 0;
    });

    // Due Today: due date is today and not completed
    const dueTodayTasks = filteredTasks.filter(task => {
      const due = new Date(task.due_date);
      return isSameDay(due, today) && task.status !== 'completed';
    });

    // Upcoming: due date is within next 3 days (excluding today) and not completed
    const upcomingTasks = filteredTasks.filter(task => {
      if (task.status === 'completed') return false;
      const due = new Date(task.due_date);
      const diff = (due.setHours(0,0,0,0) - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 3;
    });

    // Blocked: overdue and not completed, or status is 'blocked'
    const blockedTasks = filteredTasks.filter(task => {
      const due = new Date(task.due_date);
      return (task.status !== 'completed' && due < today) || task.status === 'blocked';
    });

    // Not Started: tasks with status 'not_started'
    const notStartedTasks = filteredTasks.filter(task => task.status === 'not_started');

    // In Progress: tasks with status 'in_progress'
    const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress');

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
    const pmName = user?.name || 'Project Manager';

    return (
      <div className="space-y-8 px-2 md:px-8 lg:px-16 pb-8">

        <DashboardStats tasks={filteredTasks} leaves={leaves} />
        {/* Section title for task overview */}
        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-2">Task Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {renderTaskSection('Recently Completed Tasks', CheckCircle2, recentlyCompletedTasks, 'recentlyCompleted', 'completed')}
          {renderTaskSection('Due Today', Calendar, dueTodayTasks, 'dueToday', 'today')}
          {renderTaskSection('Upcoming Tasks', Clock, upcomingTasks, 'upcoming', 'upcoming')}
          {renderTaskSection('Blocked Tasks', AlertCircle, blockedTasks, 'blocked', 'blocked')}
        </div>

        {/* Member Task Statistics */}
        <h2 className="text-xl font-semibold text-gray-800 mt-10 mb-2">Member Task Statistics</h2>
        <MemberTaskStats 
          tasks={filteredTasks}
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
        {pmNotifications.length > 0 && (
          <Card className="mb-6 p-4 border border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-blue-800">Recent Notifications</h2>
              <Button size="sm" variant="primary" onClick={() => window.location.href = '#notifications'}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {pmNotifications.slice(0, 5).map(n => (
                <div key={n.id + '-' + n.created_at} className="border-b last:border-b-0 pb-2 last:pb-0">
                  <div className="font-semibold text-blue-900">{n.title}</div>
                  <div className="text-sm text-blue-700">{n.message}</div>
                  <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (activeTab === 'tasks') {
    // Filter tasks to only show tasks from assigned projects
    const assignedProjectIds = assignedProjects.map(p => p.id);
    const tasksForAssignedProjects = tasks.filter(task => 
      !task.project_id || assignedProjectIds.includes(task.project_id)
    );
    const filteredTasksForDisplay = filterTasks(taskFilters, tasksForAssignedProjects);

    return (
      <div className="p-6 space-y-6">
        {/* Header with Add Task button and View Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">All Tasks</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredTasksForDisplay.length} tasks
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <TaskViewSelector
              currentView={taskView}
              onViewChange={setTaskView}
            />
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
        <TaskQuickStats tasks={filteredTasksForDisplay} />

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <TaskFiltersComponent
            filters={taskFilters}
            onFiltersChange={setTaskFilters}
            showMemberFilter={true}
            members={members}
            admins={admins}
            projectManagers={projectManagers}
            projects={assignedProjects.map(p => ({ id: p.id, name: p.name }))}
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
                {filteredTasksForDisplay.length === 0 ? (
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
                  filteredTasksForDisplay.map(task => (
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
                        projects={assignedProjects.map(p => ({ id: p.id, name: p.name }))}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {taskView === 'list' && (
              <TaskListView
                tasks={filteredTasksForDisplay}
                onDelete={deleteTask}
                onStatusChange={handleStatusChange}
                onUpdate={handleTaskUpdate}
                showUser={true}
                members={members}
                admins={admins}
                projectManagers={projectManagers}
                projects={assignedProjects.map(p => ({ id: p.id, name: p.name }))}
              />
            )}

            {taskView === 'calendar' && (
              <TaskCalendarView
                tasks={filteredTasksForDisplay}
                onDelete={deleteTask}
                onStatusChange={handleStatusChange}
                onUpdate={handleTaskUpdate}
                showUser={true}
                members={members}
                admins={admins}
                projectManagers={projectManagers}
                projects={assignedProjects.map(p => ({ id: p.id, name: p.name }))}
              />
            )}
          </>
        )}

        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleAddTask}
          availableProjects={assignedProjects.map(p => ({ id: p.id, name: p.name }))}
        />
      </div>
    );
  }

  if (activeTab === 'my-tasks') {
    // Filter tasks to show only tasks assigned to the current project manager from assigned projects
    const assignedProjectIds = assignedProjects.map(p => p.id);
    const myTasks = tasks.filter(task => 
      task.user_id === user?.id && 
      (!task.project_id || assignedProjectIds.includes(task.project_id))
    );
    const filteredMyTasks = filterTasks(taskFilters, myTasks);

    return (
      <div className="p-6 space-y-6">
        {/* Header with Add Task button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">My Tasks</h2>
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
            projects={assignedProjects.map(p => ({ id: p.id, name: p.name }))}
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
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    projects={assignedProjects.map(p => ({ id: p.id, name: p.name }))}
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
          availableProjects={assignedProjects.map(p => ({ id: p.id, name: p.name }))}
        />
      </div>
    );
  }

  if (activeTab === 'leaves') {
    // Project managers can only see their own leaves (like members)
    const myLeaves = leaves.filter(leave => leave.user_id === user?.id);
    
    // Date helpers
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const cycleLabel = '2025-2026';
    




    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leaves Management</h1>
            <div className="text-sm text-blue-700 mt-1">
              Year: <span className="font-semibold">{cycleLabel}</span> &nbsp; Today: <span className="font-semibold text-green-700">{todayStr}</span>
            </div>
          </div>
        </div>
        
        {/* Remaining Leaves Section */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Remaining Leaves</h2>
          <div className="flex gap-4">
            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Sick</div>
              <div className="text-2xl font-bold text-blue-700">{leaveBalance ? leaveBalance.sick_leaves : '--'}</div>
            </div>
            <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Casual</div>
              <div className="text-2xl font-bold text-yellow-700">{leaveBalance ? leaveBalance.casual_leaves : '--'}</div>
            </div>
            <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Paid</div>
              <div className="text-2xl font-bold text-green-700">{leaveBalance ? leaveBalance.paid_leaves : '--'}</div>
            </div>
          </div>
        </div>

        {leavesError && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {leavesError}
          </div>
        )}

        {leavesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <LeaveCalendar
            leaves={myLeaves}
            holidays={holidays}
            onAddLeave={addLeave}
            onUpdateLeave={handleUpdateLeave}
            onDeleteLeave={handleDeleteLeave}
          />
        )}
        
        {/* Edit and Delete modals */}
        {/* Edit Leave Modal */}
        {editFormOpen && editLeave && (
          <Modal isOpen={editFormOpen} onClose={() => setEditFormOpen(false)} title="Edit Leave">
            <LeaveForm
              isOpen={editFormOpen}
              onClose={() => setEditFormOpen(false)}
              onSubmit={handleUpdateLeave}
              selectedDate={editLeave.leave_date}
              leaves={myLeaves}
              holidays={holidays}
              initialData={editLeave}
              noModal={true}
            />
          </Modal>
        )}
        
        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && (
          <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Leave">
            <div>Are you sure you want to delete this leave?</div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDeleteLeave}>Delete</Button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  if (activeTab === 'team') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Members</h1>
        <MembersList members={members} />
      </div>
    );
  }

  if (activeTab === 'projects') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Assigned Projects</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{assignedProjects.length} Total Projects</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{assignedProjects.filter(p => p.status === 'completed').length} Completed</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{assignedProjects.filter(p => p.status === 'active').length} Active</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>{assignedProjects.filter(p => p.status === 'on_hold').length} On Hold</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{assignedProjects.filter(p => p.status === 'cancelled').length} Cancelled</span>
              </div>
            </div>
          </div>
        </div>
        {assignedProjectsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : assignedProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg font-medium mb-2">No projects assigned</div>
            <div className="text-sm">Contact your administrator to get assigned to projects.</div>
          </div>
        ) : (
          <>
            {/* Project Filters */}
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <div className="p-6">
                <ProjectFiltersComponent
                  filters={projectFilters}
                  onFiltersChange={setProjectFilters}
                  clients={[...new Set(assignedProjects.map(p => p.client_name).filter(Boolean))]}
                  projectManagers={projectManagers}
                />
              </div>
            </Card>

            {/* Filtered Projects Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {assignedProjects
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
                      isAdmin={false}
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
            onSubmit={e => {
              e.preventDefault();
              addProject(projectForm);
              setIsProjectFormOpen(false);
              setProjectForm({ name: '', description: '', client_name: '', start_date: '', expected_end_date: '' });
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
    );
  }

  if (activeTab === 'notifications') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        {pmNotificationsLoading ? (
          <div className="text-gray-500">Loading notifications...</div>
        ) : pmNotifications.length === 0 ? (
          <div className="text-gray-500">No notifications.</div>
        ) : (
          <div className="space-y-4">
            {pmNotifications.map(n => (
              <Card key={n.id + '-' + n.created_at} className="flex items-center justify-between p-4 border border-gray-200 bg-white">
                <div>
                  <div className="font-semibold text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-700">{n.message}</div>
                  <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => {
                    addDismissedNotification(n.id);
                    setPmNotifications(pmNotifications => pmNotifications.filter(x => x.id !== n.id));
                    supabase.from('notifications').delete().eq('id', n.id);
                    // Update notification dot
                    const remainingNotifications = pmNotifications.filter(x => x.id !== n.id);
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

  if (activeTab === 'daily-tasks') {
    return <DailyTasksPage />;
  }

  return null;
};

export default ProjectManagerDashboard;
