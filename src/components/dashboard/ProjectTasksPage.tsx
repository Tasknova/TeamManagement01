import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { authService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import TaskCard from './TaskCard';
import TaskFiltersComponent from './TaskFilters';
import Button from '../ui/Button';
import TaskForm from './TaskForm';
import { DailyTaskCard } from './DailyTaskCard';
import { DailyTaskForm } from './DailyTaskForm';
import { Plus, Calendar, Building, CheckCircle2, Play, Clock, Clock3 } from 'lucide-react';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { Task, DailyTask } from '../../types';

const ProjectTasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { tasks, addTask, updateTask, deleteTask, filterTasks } = useTasks();
  const { projects } = useProjects();
  const { 
    tasks: dailyTasks, 
    createTask: createDailyTask, 
    updateTask: updateDailyTask, 
    deleteTask: deleteDailyTask,
    markCompleted: markDailyCompleted,
    markSkipped: markDailySkipped,
    markPending: markDailyPending
  } = useDailyTasks({ project: projectId });
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [taskFilters, setTaskFilters] = useState({ project: projectId });
  
  // Filter tasks: for members, only show tasks assigned to them; for admins/PMs, show all tasks
  const allFilteredTasks = filterTasks({ ...taskFilters, project: projectId });
  const filteredTasks = user?.role === 'member' 
    ? allFilteredTasks.filter(task => task.user_id === user.id)
    : allFilteredTasks;
  
  // Filter daily tasks: for members, only show tasks assigned to them; for admins/PMs, show all tasks
  const filteredDailyTasks = user?.role === 'member'
    ? dailyTasks.filter(task => task.user_id === user.id)
    : dailyTasks;
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isDailyTaskFormOpen, setIsDailyTaskFormOpen] = useState(false);

  React.useEffect(() => {
    Promise.all([
      authService.getMembers(),
      authService.getAdmins()
    ]).then(([membersData, adminsData]) => {
      setMembers(membersData.map(m => ({ id: m.id, name: m.name })));
      setAdmins(adminsData.map(a => ({ id: a.id, name: a.name })));
    });
  }, []);

  const handleAddTask = (task) => {
    addTask({ ...task, project_id: projectId });
    setIsTaskFormOpen(false);
  };

  const handleAddDailyTask = async (taskData: Omit<DailyTask, 'id' | 'created_at' | 'updated_at' | 'user' | 'created_by_user'>) => {
    try {
      await createDailyTask({
        ...taskData,
        project_id: projectId
      });
      setIsDailyTaskFormOpen(false);
    } catch (error) {
      console.error('Error creating daily task:', error);
    }
  };

  const handleDailyTaskStatusChange = async (id: string, status: 'pending' | 'completed' | 'skipped') => {
    try {
      switch (status) {
        case 'completed':
          await markDailyCompleted(id);
          break;
        case 'skipped':
          await markDailySkipped(id);
          break;
        case 'pending':
          await markDailyPending(id);
          break;
      }
    } catch (error) {
      console.error('Error changing daily task status:', error);
    }
  };

  // Wrapper function to handle status changes from TaskCard
  const handleStatusChange = (id: string, status: Task['status']) => {
    console.log('ProjectTasksPage: handleStatusChange called with:', { id, status });
    try {
      updateTask(id, { status });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Get current project details
  const currentProject = projects.find(p => p.id === projectId);

  // Calculate task statistics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress').length;
  const pendingTasks = filteredTasks.filter(task => task.status === 'pending').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate daily task statistics (using filtered daily tasks)
  const totalDailyTasks = filteredDailyTasks.length;
  const completedDailyTasks = filteredDailyTasks.filter(task => task.status === 'completed').length;
  const pendingDailyTasks = filteredDailyTasks.filter(task => task.status === 'pending').length;
  const skippedDailyTasks = filteredDailyTasks.filter(task => task.status === 'skipped').length;

  // Get project status
  const getProjectStatus = () => {
    if (completedTasks === totalTasks && totalTasks > 0) return 'completed';
    if (inProgressTasks > 0) return 'in_progress';
    return 'pending';
  };

  const projectStatus = getProjectStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!currentProject) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project not found</h2>
          <p className="text-gray-600">The project you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="p-6 space-y-6">
        {/* Project Header */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5"></div>
          <div className="relative p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">{currentProject.name}</h1>
                    {currentProject.client_name && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="font-semibold text-lg">{currentProject.client_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                {currentProject.description && (
                  <div className="bg-white/70 rounded-lg p-4 border border-white/50 backdrop-blur-sm">
                    <p className="text-gray-700 leading-relaxed">{currentProject.description}</p>
                  </div>
                )}
              </div>
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(projectStatus)} flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full shadow-md border-0`}
              >
                {getStatusIcon(projectStatus)}
                {projectStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            {/* Project Info Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/70 rounded-xl p-4 border border-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Start Date</div>
                    <div className="font-bold text-gray-900">
                      {currentProject.start_date ? new Date(currentProject.start_date).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 rounded-xl p-4 border border-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">End Date</div>
                    <div className="font-bold text-gray-900">
                      {currentProject.expected_end_date ? new Date(currentProject.expected_end_date).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 rounded-xl p-4 border border-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Progress</div>
                    <div className="font-bold text-gray-900">{progressPercentage}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-800">Overall Progress</span>
                <span className="text-2xl font-bold text-blue-600">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-white/50 rounded-full h-4 overflow-hidden border border-white/50">
                <div 
                  className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 h-4 rounded-full transition-all duration-700 ease-out shadow-inner"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Task Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/70 rounded-xl p-5 text-center border border-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold text-white">{totalTasks}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">Total Tasks</div>
              </div>
              <div className="bg-white/70 rounded-xl p-5 text-center border border-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold text-white">{completedTasks}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">Completed</div>
              </div>
              <div className="bg-white/70 rounded-xl p-5 text-center border border-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold text-white">{inProgressTasks}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">In Progress</div>
              </div>
              <div className="bg-white/70 rounded-xl p-5 text-center border border-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold text-white">{pendingTasks}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">Pending</div>
              </div>
            </div>

            {/* Daily Task Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/70 rounded-xl p-5 text-center border border-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold text-white">{totalDailyTasks}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">Daily Tasks</div>
              </div>
              <div className="bg-white/70 rounded-xl p-5 text-center border border-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold text-white">{completedDailyTasks}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">Completed</div>
              </div>
              <div className="bg-white/70 rounded-xl p-5 text-center border border-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold text-white">{pendingDailyTasks}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">Pending</div>
              </div>
              <div className="bg-white/70 rounded-xl p-5 text-center border border-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold text-white">{skippedDailyTasks}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">Skipped</div>
              </div>
            </div>
          </div>
        </Card>

              {/* Actions and Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project Tasks</h2>
            <p className="text-gray-600">
              {user?.role === 'member' 
                ? 'Tasks assigned to you in this project'
                : 'Manage and track all tasks for this project'}
            </p>
          </div>
          {user?.role !== 'member' && (
            <Button 
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
              onClick={() => setIsTaskFormOpen(true)} 
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Task
            </Button>
          )}
        </div>

        {/* Task Filters */}
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Filter Tasks</h3>
      </div>
      <TaskFiltersComponent
        filters={taskFilters}
        onFiltersChange={setTaskFilters}
        showMemberFilter={true}
        members={members}
        admins={admins}
              projects={[]}
      />
          </div>
        </Card>

              {/* Tasks Grid */}
        {filteredTasks.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Plus className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No tasks found</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {user?.role === 'member' 
                  ? 'You don\'t have any tasks assigned to you for this project yet.'
                  : taskFilters.project 
                    ? 'No tasks match your current filters. Try adjusting your search criteria.' 
                    : 'No tasks have been created for this project yet. Get started by creating your first task.'}
              </p>
              {user?.role !== 'member' && (
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
                  onClick={() => setIsTaskFormOpen(true)} 
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Task
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTasks.map(task => (
              <div key={task.id} className="group">
              <TaskCard
                task={task}
                onDelete={deleteTask}
                onStatusChange={handleStatusChange}
                showUser={true}
                members={members}
                admins={admins}
                projects={projects.map(p => ({ id: p.id, name: p.name }))}
              />
            </div>
            ))}
          </div>
        )}

        {/* Daily Tasks Section */}
        <div className="space-y-6">
          {/* Daily Tasks Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Daily Tasks</h2>
              <p className="text-gray-600">Quick daily tasks and activities for this project</p>
            </div>
            {user?.role !== 'member' && (
              <Button 
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
                onClick={() => setIsDailyTaskFormOpen(true)} 
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Daily Task
              </Button>
            )}
          </div>

          {/* Daily Tasks Grid */}
          {filteredDailyTasks.length === 0 ? (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Clock3 className="w-12 h-12 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No daily tasks found</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {user?.role === 'member' 
                    ? 'You don\'t have any daily tasks assigned to you for this project yet.'
                    : 'No daily tasks have been created for this project yet. Create quick daily tasks to track ongoing activities.'}
                </p>
                {user?.role !== 'member' && (
                  <Button 
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
                    onClick={() => setIsDailyTaskFormOpen(true)} 
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create First Daily Task
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDailyTasks.map(task => (
                <div key={task.id} className="group">
                  <DailyTaskCard
                    task={task}
                    onDelete={deleteDailyTask}
                    onStatusChange={handleDailyTaskStatusChange}
                    onEdit={(task) => {
                      // Handle edit if needed
                      console.log('Edit daily task:', task);
                    }}
                    isAdmin={true}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Form Modal */}
      {isTaskFormOpen && (
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleAddTask}
          initialProjectId={projectId}
        />
      )}

        {/* Daily Task Form Modal */}
      {isDailyTaskFormOpen && (
        <DailyTaskForm
          isOpen={isDailyTaskFormOpen}
          onClose={() => setIsDailyTaskFormOpen(false)}
          onSubmit={handleAddDailyTask}
          members={members}
          admins={admins}
          currentUserId={user?.id || ''}
          isAdmin={true}
        />
      )}
      </div>
    </div>
  );
};

export default ProjectTasksPage; 