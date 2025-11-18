import React, { useState, useEffect, useRef } from 'react';
import { Plus, User, Bell, CheckCircle2, Calendar, Clock, AlertCircle, CheckSquare, Play, Pause } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useLeaves } from '../../hooks/useLeaves';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth';
import { TaskFilters } from '../../types';
import Button from '../ui/Button';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskFiltersComponent from './TaskFilters';
import ProjectFiltersComponent from './ProjectFilters';
import LeaveCalendar from './LeaveCalendar';
import DashboardStats from './DashboardStats';
import Modal from '../ui/Modal';
import LeaveForm from './LeaveForm';
import ProjectCard from './ProjectCard';
import { useMemberProjects } from '../../hooks/useMemberProjects';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import { toast } from 'sonner';
import { MemberDailyTasksPage } from './MemberDailyTasksPage';
import TaskViewSelector, { TaskViewType } from './TaskViewSelector';
import TaskListView from './TaskListView';
import TaskCalendarView from './TaskCalendarView';
import { MemberTaskStats } from './MemberTaskStats';

interface MemberDashboardProps {
  activeTab: string;
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ activeTab }) => {
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask, filterTasks, refetchTasks } = useTasks();
  const { leaves, loading: leavesLoading, error: leavesError, addLeave, updateLeave, deleteLeave } = useLeaves();
  const { user } = useAuth();
  const { projects, loading: projectsLoading, error: projectsError, refetchProjects } = useMemberProjects();
  
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
  const [showProfile, setShowProfile] = useState(false);
  const [editLeave, setEditLeave] = useState(null);
  const [deleteLeaveId, setDeleteLeaveId] = useState<string | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  // Add departments list for dropdown
  const departments = [
    'Engineering', 'Design', 'Marketing', 'Sales',
    'HR', 'Finance', 'Operations', 'Customer Support'
  ];
  // Add avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<{ sick_leaves: number; casual_leaves: number; paid_leaves: number } | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [projectManagers, setProjectManagers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (activeTab !== 'leaves' || !user) return;
    const fetchBalance = async () => {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('member_leave_balances')
        .select('*')
        .eq('member_id', user.id)
        .eq('year', currentYear)
        .single();
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

    // Real-time subscription for leave balance
    const channel = supabase.channel('member-leave-balance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_leave_balances',
          filter: `member_id=eq.${user.id}`,
        },
        (payload) => {
          // Refetch leave balance on any change
          fetchBalance();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, user]);

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

  // Update handleRemoveNotification to use local dismissal
  const handleRemoveNotification = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    const userId = user?.id;
    console.log('Attempting to delete notification:', { id, notif, userId });
    // Try to delete from Supabase (will fail silently if not allowed)
    await supabase.from('notifications').delete().eq('id', id);
    // Always locally dismiss
    addDismissedNotification(id);
    setNotifications(notifications => notifications.filter(n => n.id !== id));
  };

  // Fetch notifications for the logged-in member, filter out dismissed
  React.useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      setNotificationsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const dismissed = getDismissedNotifications();
        // Deduplicate notifications by id
        const unique = Object.values(
          data.filter(n => !dismissed.includes(n.id)).reduce((acc, n) => {
            acc[n.id] = n;
            return acc;
          }, {} as Record<string, any>)
        );
        setNotifications(unique);
        // Dispatch event for notification dot
        window.dispatchEvent(new CustomEvent('notifications-dot', { detail: { hasUnread: unique.some(n => !n.is_read) } }));
      }
      setNotificationsLoading(false);
    };
    fetchNotifications();

    // --- Real-time notifications subscription ---
    if (!user) return;
    const channel = supabase.channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime notification event received:', payload);
          if (payload.new) {
            const dismissed = getDismissedNotifications();
            if (!dismissed.includes(payload.new.id)) {
              setNotifications((prev) => {
                if (prev.some(n => n.id === payload.new.id)) return prev;
                const updated = [payload.new, ...prev.filter(n => n.id !== payload.new.id)];
                window.dispatchEvent(new CustomEvent('notifications-dot', { detail: { hasUnread: updated.some(n => !n.is_read) } }));
                return updated;
              });
              // Always show toast for any notification (blue)
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
            }
          } else {
            // Fallback: refetch notifications if payload is missing
            fetchNotifications();
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscribed to notifications realtime:', status);
      });
    return () => {
      supabase.removeChannel(channel);
    };
    // --- END real-time ---
  }, [user]);

  // Fetch members, admins, and project managers for task display
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
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time subscription for tasks (member sees all changes to their tasks, robust to admin actions)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('tasks-realtime-member')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Realtime event:', payload);
          // For DELETE, use payload.old; for INSERT/UPDATE, use payload.new
          const affected = payload.eventType === 'DELETE' ? payload.old : payload.new;
          if (affected && affected.user_id === user.id) {
            refetchTasks();
            // Refetch projects when tasks change (in case project assignment changed)
            refetchProjects();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchTasks, refetchProjects]);

  // Refetch projects when projects tab is opened (only when tab changes to 'projects')
  const prevActiveTabRef = useRef<string>('');
  useEffect(() => {
    if (activeTab === 'projects' && prevActiveTabRef.current !== 'projects' && user) {
      refetchProjects();
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, user, refetchProjects]);

  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('*')
        .order('date', { ascending: true });
      
      if (!error && data) {
        setHolidays(data);
      }
    };
    
    fetchHolidays();
  }, []);

  const filteredTasks = filterTasks({ ...taskFilters, userId: user?.id });

  const handleStatusChange = (id: string, status: 'pending' | 'completed' | 'blocked') => {
    updateTask(id, { status });
  };

  const handleEditLeave = (leave) => {
    setEditLeave(leave);
    setEditFormOpen(true);
  };

  const handleUpdateLeave = (updatedLeave) => {
    if (!updatedLeave.id) {
      alert('Leave ID is missing. Cannot update.');
      return;
    }
    updateLeave(updatedLeave.id, {
      leave_date: updatedLeave.leave_date,
      end_date: updatedLeave.end_date,
      leave_type: updatedLeave.leave_type,
      reason: updatedLeave.reason,
      category: updatedLeave.category,
      from_date: updatedLeave.from_date,
      to_date: updatedLeave.to_date,
      brief_description: updatedLeave.brief_description,
      status: updatedLeave.status,
    });
    setEditFormOpen(false);
    setEditLeave(null);
  };

  const handleDeleteLeave = (id) => {
    deleteLeave(id);
    setDeleteLeaveId(null);
    setDeleteConfirmOpen(false);
  };

  const confirmDeleteLeave = () => {
    if (deleteLeaveId) {
      deleteLeave(deleteLeaveId);
      setDeleteLeaveId(null);
      setDeleteConfirmOpen(false);
    }
  };

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    let avatar_url = user.avatar_url;
    if (avatarFile) {
      setAvatarUploading(true);
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
      setAvatarUploading(false);
      if (uploadError) {
        alert('Failed to upload avatar: ' + uploadError.message);
        setProfileLoading(false);
        return;
      }
      avatar_url = data?.path ? supabase.storage.from('avatars').getPublicUrl(data.path).publicUrl : user.avatar_url;
    }
    const { error } = await supabase
      .from('members')
      .update({
        name: profileForm.name,
        phone: profileForm.phone,
        department: profileForm.department,
        hire_date: profileForm.hire_date,
        avatar_url,
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
    // If using Supabase Auth, call updateUser. Here, just close modal.
    setPasswordLoading(true);
    setTimeout(() => {
      setPasswordLoading(false);
      setChangePasswordOpen(false);
      alert('Password updated (demo only).');
    }, 1000);
  };

  // Add greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'good morning';
    if (hour < 18) return 'good afternoon';
    return 'good evening';
  };
  const memberName = user?.name || 'Member';

  // Place at the top level, outside any if block:
  const [openSections, setOpenSections] = useState({
    recentlyCompleted: false,
    dueToday: false,
    upcoming: false,
    blocked: false,
  });
  const toggleSection = (sectionKey) => {
    setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };
  const renderTaskSection = (title, Icon, tasks, sectionKey, sectionName) => (
    <div>
      <div className="flex items-center gap-2 mb-4 group">
        <Icon className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-extrabold text-gray-900 transition-transform duration-300 group-hover:scale-105 truncate whitespace-nowrap">
          {title}
        </h2>
      </div>
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-gray-500">No {title.toLowerCase()}.</div>
        ) : (
          <>
            <div className="h-96 flex">
              <TaskCard 
                key={tasks[0].id} 
                task={tasks[0]} 
                showUser={true}
                section={sectionName}
                members={members}
                admins={admins}
                projectManagers={projectManagers}
                projects={projects.map(p => ({ id: p.id, name: p.name }))}
              />
            </div>
            {tasks.length > 1 && !openSections[sectionKey] && (
              <button
                onClick={() => toggleSection(sectionKey)}
                className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                Show More
              </button>
            )}
            {tasks.length > 1 && openSections[sectionKey] && (
              <>
                <div className="space-y-4">
                  {tasks.slice(1).map(task => (
                    <div key={task.id} className="h-96 flex">
                      <TaskCard 
                        task={task} 
                        showUser={true}
                        section={sectionName}
                        members={members}
                        admins={admins}
                        projectManagers={projectManagers}
                        projects={projects.map(p => ({ id: p.id, name: p.name }))}
                      />
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

  if (activeTab === 'dashboard') {
    // Section logic for member dashboard (like admin)
    // First, filter tasks to only show tasks assigned to the current member
    const memberTasks = tasks.filter(task => task.user_id === user?.id);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    // Recently Completed: completed within last 3 days
    const recentlyCompletedTasks = memberTasks.filter(task => {
      if (task.status !== 'completed' || !task.updated_at) return false;
      const updated = new Date(task.updated_at);
      const diff = (today.getTime() - updated.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24);
      return diff <= 3 && diff >= 0;
    });
    // Due Today: due date is today and not completed
    const dueTodayTasks = memberTasks.filter(task => {
      const due = new Date(task.due_date);
      return isSameDay(due, today) && task.status !== 'completed';
    });
    // Upcoming: due date is within next 3 days (excluding today) and not completed
    const upcomingTasks = memberTasks.filter(task => {
      if (task.status === 'completed') return false;
      const due = new Date(task.due_date);
      const diff = (due.setHours(0,0,0,0) - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 3;
    });
    // Blocked: overdue and not completed, or status is 'blocked'
    const blockedTasks = memberTasks.filter(task => {
      const due = new Date(task.due_date);
      return (task.status !== 'completed' && due < today) || task.status === 'blocked';
    });

    // Not Started: tasks with status 'not_started'
    const notStartedTasks = tasks.filter(task => task.status === 'not_started');

    // In Progress: tasks with status 'in_progress'
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
    // Icons
    return (
      <div className="space-y-8 px-2 md:px-8 lg:px-16 pb-8">
        {/* Dashboard header */}
        <div className="flex items-center justify-between pt-4 pb-2">
          <div className="text-2xl font-bold text-gray-900">
            Dashboard
          </div>
        </div>
        <DashboardStats tasks={memberTasks} leaves={leaves} />
        {/* Task sections grid */}
        <h2 className="text-xl font-semibold text-gray-800 mt-10 mb-2">Task Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {renderTaskSection('Recently Completed', CheckCircle2, recentlyCompletedTasks, 'recentlyCompleted', 'completed')}
          {renderTaskSection('Due Today', Calendar, dueTodayTasks, 'dueToday', 'today')}
          {renderTaskSection('Upcoming', Clock, upcomingTasks, 'upcoming', 'upcoming')}
          {renderTaskSection('Blocked', AlertCircle, blockedTasks, 'blocked', 'blocked')}
            </div>
        {/* Upcoming Leaves section remains as before */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Leaves</h2>
            <div className="space-y-2">
              {leaves
                .filter(leave => {
                  // Only show leaves that are today or in the future (for single-day), or multi-day leaves that end today or later
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  if (leave.category === 'multi-day' && leave.to_date) {
                    return new Date(leave.to_date) >= today;
                  } else if (leave.leave_date) {
                    return new Date(leave.leave_date) >= today;
                  }
                  return false;
                })
                .sort((a, b) => {
                  // Sort by start date
                  const aDate = a.category === 'multi-day' ? new Date(a.from_date ?? '') : new Date(a.leave_date ?? '');
                  const bDate = b.category === 'multi-day' ? new Date(b.from_date ?? '') : new Date(b.leave_date ?? '');
                  return aDate.getTime() - bDate.getTime();
                })
                .slice(0, 3)
                .map(leave => (
                <div key={leave.id} className="border rounded p-2 flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50">
                  <div>
                    <span className="font-semibold">{leave.leave_type}</span> - {leave.category === 'multi-day' ? `${leave.from_date} to ${leave.to_date}` : leave.leave_date}
                    <span className="ml-2 text-xs">({leave.status})</span>
                      </div>
                      <div className="text-xs text-gray-500">Reason: {leave.reason}</div>
                    </div>
                ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'tasks') {
    return (
      <div className="p-6 space-y-6">
        {/* Header with Add Task button and View Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">My Tasks</h2>
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
              icon={Plus}
              onClick={() => setIsTaskFormOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Task
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <TaskFiltersComponent
            filters={taskFilters}
            onFiltersChange={setTaskFilters}
          />
        </div>

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
                        showUser={true}
                        onDelete={deleteTask}
                        onStatusChange={handleStatusChange}
                        onUpdate={updateTask}
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
                onUpdate={updateTask}
                showUser={false}
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
                onUpdate={updateTask}
                showUser={false}
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
          onSubmit={addTask}
        />
      </div>
    );
  }

  if (activeTab === 'leaves') {
    // At the top of the member's leave management page:
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
            leaves={leaves}
            holidays={holidays} // Pass holidays to LeaveCalendar
            onAddLeave={addLeave}
            onUpdateLeave={handleUpdateLeave}
            onDeleteLeave={handleDeleteLeave}
          />
        )}
        {/* Edit and Delete modals will be implemented next */}
        {/* Edit Leave Modal */}
        {editFormOpen && editLeave && (
          <Modal isOpen={editFormOpen} onClose={() => setEditFormOpen(false)} title="Edit Leave">
            <LeaveForm
              isOpen={editFormOpen}
              onClose={() => setEditFormOpen(false)}
              onSubmit={handleUpdateLeave}
              selectedDate={editLeave.leave_date}
              leaves={leaves}
              holidays={holidays} // Pass holidays to LeaveForm
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

  if (activeTab === 'projects') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600">Projects you have tasks assigned to</p>
          </div>
        </div>
        {projectsError && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{projectsError}</div>}
        {projectsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
                  projectManagers={[]}
                />
              </div>
            </Card>

            {/* Projects Grid */}
            {projects.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-gray-500">
                  <p className="text-lg mb-2">No projects found</p>
                  <p>You don't have any tasks assigned to projects yet.</p>
                </div>
              </Card>
            ) : (
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
                    // For members, only show tasks assigned to them; for admins/PMs, show all tasks
                    const projectTasks = tasks.filter(task => 
                      task.project_id === project.id && 
                      (user?.role === 'member' ? task.user_id === user.id : true)
                    );
                    return (
                      <ProjectCard key={project.id} project={project} tasks={projectTasks} />
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (activeTab === 'daily-tasks') {
    return <MemberDailyTasksPage />;
  }

  return null;
};

export default MemberDashboard;