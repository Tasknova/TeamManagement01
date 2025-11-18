import React, { useState, useRef, useEffect } from 'react';
import { Calendar, User, Trash2, CheckCircle2, AlertCircle, Pencil, Eye, Paperclip, Link, File, X } from 'lucide-react';
import { fileUploadService } from '../../services/fileUpload';
import { Task, TaskAttachment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useDeleteConfirmation } from '../../hooks/useDeleteConfirmation';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  showUser?: boolean;
  section?: 'completed' | 'today' | 'upcoming' | 'blocked'; // NEW
  members?: { id: string; name: string }[];
  admins?: { id: string; name: string }[];
  projectManagers?: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onDelete, 
  onStatusChange, 
  onUpdate,
  showUser = false,
  section, // NEW
  members = [],
  admins = [],
  projectManagers = [],
  projects = []
}) => {
  const { user } = useAuth();
  const { 
    isOpen: isDeleteModalOpen, 
    task: taskToDelete, 
    taskType, 
    showDeleteConfirmation, 
    hideDeleteConfirmation, 
    confirmDelete 
  } = useDeleteConfirmation();
  const [projectName, setProjectName] = useState<string | null>(null);
  
  // Fetch project name if not in projects array
  useEffect(() => {
    if (task.project_id) {
      // First check if project is in the projects array
      const foundProject = projects.find(p => p.id === task.project_id);
      if (foundProject) {
        setProjectName(foundProject.name);
      } else {
        // Fetch project name from database
        const fetchProjectName = async () => {
          try {
            const { data, error } = await supabase
              .from('projects')
              .select('name')
              .eq('id', task.project_id)
              .single();
            
            if (!error && data) {
              setProjectName(data.name);
            }
          } catch (err) {
            console.error('Error fetching project name:', err);
          }
        };
        fetchProjectName();
      }
    }
  }, [task.project_id, projects]);
  
  // Helper to check if a date is before today
  const isBeforeToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  const dueDate = new Date(task.due_date);
  const isOverdue = isBeforeToday(dueDate) && task.status !== 'completed';
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editData, setEditData] = useState({
    task_name: task.task_name,
    description: task.description,
    priority: task.priority as Task['priority'],
    status: task.status as Task['status'],
    user_id: task.user_id,
    project_id: task.project_id || '',
  });
  const [editAttachments, setEditAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Local state for progress input
  const [progressInput, setProgressInput] = useState(task.progress);
  React.useEffect(() => { setProgressInput(task.progress); }, [task.progress]);
  // Overdue warning popover state
  const [showOverdue, setShowOverdue] = useState(false);

  // Handle progress input change
  const handleProgressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    if (isNaN(val)) val = 0;
    val = Math.max(0, Math.min(100, val));
    setProgressInput(val);
  };
  // Commit progress on blur or Enter
  const commitProgress = () => {
    if (progressInput !== task.progress && onUpdate) {
      onUpdate(task.id, { progress: progressInput });
    }
  };
  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const getStatusVariant = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'pending';
      case 'not_started': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return Calendar;
      case 'not_started': return AlertCircle;
      default: return Calendar;
    }
  };

  const getPriorityVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'secondary';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return AlertCircle;
      case 'high': return AlertCircle;
      case 'medium': return Calendar;
      case 'low': return CheckCircle2;
      default: return Calendar;
    }
  };

  const getUserName = (userId: string) => {
    const member = members.find(m => m.id === userId);
    const admin = admins.find(a => a.id === userId);
    const pm = projectManagers.find(p => p.id === userId);
    return member?.name || admin?.name || pm?.name || 'Unknown User';
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const StatusIcon = getStatusIcon(task.status);
  const PriorityIcon = getPriorityIcon(task.priority);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdate) {
      onUpdate(task.id, { ...editData, attachments: editAttachments });
    }
    setIsEditOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && user) {
      for (const file of Array.from(files)) {
        let tempAttachment: TaskAttachment | null = null;
        try {
          // Validate file
          const validation = fileUploadService.validateFile(file);
          if (!validation.isValid) {
            alert(validation.error);
            continue;
          }

          // Show loading state
          tempAttachment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: URL.createObjectURL(file), // Temporary URL for preview
            type: 'file',
            file_type: file.type,
            size: file.size,
            uploaded_at: new Date().toISOString()
          };
          setEditAttachments(prev => [...prev, tempAttachment!]);

          // Upload to Supabase Storage
          const uploadedAttachment = await fileUploadService.uploadFile(file, user.id);
          
          // Replace temporary attachment with real one
          setEditAttachments(prev => prev.map(att => 
            att.id === tempAttachment!.id ? uploadedAttachment : att
          ));
        } catch (error) {
          alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Remove temporary attachment if upload failed
          if (tempAttachment) {
            setEditAttachments(prev => prev.filter(att => att.id !== tempAttachment!.id));
          }
        }
      }
    }
  };

  const handleUrlAdd = () => {
    if (urlInput.trim()) {
      const attachment = fileUploadService.createUrlAttachment(urlInput.trim());
      setEditAttachments(prev => [...prev, attachment]);
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const removeAttachment = async (id: string) => {
    const attachment = editAttachments.find(att => att.id === id);
    if (attachment && attachment.type === 'file') {
      try {
        // Delete from Supabase Storage
        await fileUploadService.deleteFile(attachment.url);
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
        // Continue with removal even if storage deletion fails
      }
    }
    setEditAttachments(prev => prev.filter(att => att.id !== id));
  };

  // Section-based border gradient and accent color
  let borderClass = '';
  let accentColor = '';
  switch (section || task.status) {
    case 'completed':
      borderClass = 'border-2 border-green-400 bg-gradient-to-br from-green-50 to-green-100';
      accentColor = 'border-green-500';
      break;
    case 'today':
      borderClass = 'border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100';
      accentColor = 'border-orange-500';
      break;
    case 'upcoming':
      borderClass = 'border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100';
      accentColor = 'border-blue-500';
      break;
    case 'blocked':
      borderClass = 'border-2 border-red-400 bg-gradient-to-br from-red-50 to-red-100';
      accentColor = 'border-red-500';
      break;
    case 'in_progress':
      borderClass = 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100';
      accentColor = 'border-yellow-500';
      break;
    case 'pending':
      borderClass = 'border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100';
      accentColor = 'border-purple-500';
      break;
    case 'not_started':
      accentColor = 'border-gray-400';
      break;
    default:
      borderClass = '';
      accentColor = '';
  }

  return (
    <>
    <Card
      className={`flex flex-col h-full w-full min-h-0 min-w-0 overflow-hidden ${borderClass} ${isOverdue && !section ? 'border-red-200 bg-red-50' : ''} group transition-all duration-200`}
      hover
      animated
      accentColor={accentColor}
      padding="md"
    >
        {/* Action buttons on top center */}
        <div className="flex justify-center mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm border border-gray-200">
            {/* View button - always visible */}
            <Button
              variant="ghost"
              size="sm"
              icon={Eye}
              onClick={() => setIsViewOpen(true)}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full"
              title="View task details"
            />
            {/* Overdue warning icon */}
              {isOverdue && section !== 'today' && (
                <button
                  type="button"
                  className="p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                  onClick={() => setShowOverdue(v => !v)}
                  title="Show overdue warning"
                  tabIndex={0}
                >
                  <AlertCircle className="w-5 h-5" />
                </button>
              )}
            {/* Edit and Delete buttons - only for authorized users */}
          {(user?.role === 'admin' || user?.role === 'project_manager' || task.user_id === user?.id) && onUpdate && (
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={() => setIsEditOpen(true)}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
                title="Edit task"
              />
            )}
            {(user?.role === 'admin' || user?.role === 'project_manager' || task.user_id === user?.id) && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => showDeleteConfirmation(task, 'regular', () => onDelete(task.id))}
                className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full"
                title="Delete task"
            />
          )}
        </div>
        </div>

        {/* Overdue warning popover */}
        {isOverdue && section !== 'today' && showOverdue && (
          <div className="absolute top-10 right-0 z-20 bg-red-100 border border-red-300 rounded shadow p-2 text-sm text-red-700 w-48 max-w-xs overflow-hidden">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">This task is overdue</span>
            </div>
          </div>
        )}

        {/* Task title and description */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-blue-700 transition-colors duration-200 truncate">{task.task_name}</h3>
          <p className="text-sm text-gray-600 mb-1 line-clamp-2 break-words">{task.description}</p>
          {task.project_id && projects && projects.length > 0 && (
            <div className="text-xs text-blue-700 mt-1 truncate">
              Project: {projects.find(p => p.id === task.project_id)?.name || 'Unknown Project'}
            </div>
          )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="w-full">
          <div className="text-sm text-gray-700 mb-1 flex items-center">
            <span className="font-semibold mr-1">Due Date:</span>
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(task.due_date).toLocaleDateString()}
          </div>
          <div className="text-sm text-gray-700 mb-1 flex items-center">
            <span className="font-semibold mr-1">Status:</span>
            <Badge variant={getStatusVariant(task.status)} className="px-3 py-1 text-base font-semibold shadow-sm animate-pulse">
              <StatusIcon className="w-4 h-4 mr-1" />
              {task.status}
            </Badge>
          </div>
            <div className="text-sm text-gray-700 mb-1 flex items-center">
              <span className="font-semibold mr-1">Priority:</span>
              <Badge variant={getPriorityVariant(task.priority)} className="px-3 py-1 text-base font-semibold shadow-sm">
                <PriorityIcon className="w-4 h-4 mr-1" />
                {task.priority}
              </Badge>
            </div>
 
          {(showUser || user?.role === 'admin') ? (
            <div className="text-sm text-gray-700 mb-1 flex items-center">
              <span className="font-semibold mr-1">Assigned to:</span>
              <User className="w-4 h-4 mr-1" />
              {getUserName(task.user_id)}
            </div>
          ) : null}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="text-sm text-gray-700 mb-1">
              <span className="font-semibold mr-1">Attachments:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {task.attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    onClick={() => window.open(attachment.url, '_blank')}
                    className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                    title={`Click to open ${attachment.name}`}
                  >
                    {attachment.type === 'file' ? (
                      <File className="w-3 h-3" />
                    ) : (
                      <Link className="w-3 h-3" />
                    )}
                    <span className="truncate max-w-20">{attachment.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress input and bar for in-progress tasks */}
      {task.status === 'in_progress' && (user?.role === 'admin' || task.user_id === user?.id) && onUpdate && (
        <div className="mb-3 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">Progress</span>
            <input
              type="number"
              min={0}
              max={100}
              value={progressInput}
              onChange={handleProgressInputChange}
              onBlur={commitProgress}
              onKeyDown={handleProgressKeyDown}
              className="w-16 text-center border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400"
            />
            <span className="text-xs text-gray-700 font-semibold">%</span>
          </div>
          <div className="relative h-2 w-full bg-yellow-100 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-yellow-400 transition-all duration-500"
              style={{ width: `${progressInput}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Complete button for all tasks except completed */}
      {task.status !== 'completed' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('TaskCard: Mark as Complete button clicked for task:', task.id);
            onStatusChange(task.id, 'completed');
          }}
          className="w-full mt-2 text-green-700 border-green-400 hover:bg-green-50 hover:border-green-600"
        >
          Mark as Complete
        </Button>
      )}
      </Card>

      {/* Edit Modal */}
      {isEditOpen && (
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Task" size="lg">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
              <input
                type="text"
                name="task_name"
                value={editData.task_name}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={editData.description}
                onChange={handleEditChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                value={editData.priority}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={editData.status}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

                         {/* Assigned To field - only for admins */}
             {user?.role === 'admin' && (
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                 <select
                   name="user_id"
                   value={editData.user_id}
                   onChange={handleEditChange}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   required
                 >
                   <option value="">Select Member or Admin</option>
                   {members.length > 0 && (
                     <optgroup label="Members">
                       {members.map(member => (
                         <option key={member.id} value={member.id}>{member.name}</option>
                       ))}
                     </optgroup>
                   )}
                   {admins.length > 0 && (
                     <optgroup label="Admins">
                       {admins.map(admin => (
                         <option key={admin.id} value={admin.id}>{admin.name} (Admin)</option>
                       ))}
                     </optgroup>
                   )}
                   {projectManagers.length > 0 && (
                     <optgroup label="Project Managers">
                       {projectManagers.map(pm => (
                         <option key={pm.id} value={pm.id}>{pm.name} (Project Manager)</option>
                       ))}
                     </optgroup>
                   )}
                 </select>
               </div>
             )}

            {/* Project field - only for admins and project managers */}
            {(user?.role === 'admin' || user?.role === 'project_manager') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  name="project_id"
                  value={editData.project_id}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Attachments Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments
              </label>
              
              {/* Attachment Controls */}
              <div className="flex space-x-2 mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>Upload File</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="flex items-center space-x-1"
                >
                  <Link className="w-4 h-4" />
                  <span>Add URL</span>
                </Button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
              />

              {/* URL Input */}
              {showUrlInput && (
                <div className="flex space-x-2 mb-3">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Enter URL (e.g., https://example.com/document.pdf)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUrlAdd}
                    disabled={!urlInput.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}

              {/* Attachments List */}
              {editAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Attached Files:</p>
                  {editAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-2">
                        {attachment.type === 'file' ? (
                          <File className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Link className="w-4 h-4 text-green-500" />
                        )}
                        <span className="text-sm text-gray-700 truncate">
                          {attachment.name}
                        </span>
                        {attachment.size && (
                          <span className="text-xs text-gray-500">
                            ({(attachment.size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {isViewOpen && (
        <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Task Details" size="lg">
          <div className="space-y-6">
            {/* Task Header */}
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{task.task_name}</h2>
              <p className="text-gray-600">{task.description}</p>
            </div>

            {/* Task Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Due Date</p>
                    <p className="text-sm text-gray-900">{new Date(task.due_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Assigned To</p>
                    <p className="text-sm text-gray-900">{task.user?.name || 'Unassigned'}</p>
                  </div>
                </div>

                 {task.project_id && (
                   <div className="flex items-center">
                     <div className="w-5 h-5 bg-blue-100 rounded mr-3 flex items-center justify-center">
                       <span className="text-xs text-blue-600 font-bold">P</span>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-700">Project</p>
                       <p className="text-sm text-gray-900">
                         {projectName || projects.find(p => p.id === task.project_id)?.name || 'Loading...'}
                       </p>
                     </div>
                   </div>
                 )}

                 {task.attachments && task.attachments.length > 0 && (
                   <div className="flex items-center">
                     <div className="w-5 h-5 bg-purple-100 rounded mr-3 flex items-center justify-center">
                       <Paperclip className="w-3 h-3 text-purple-600" />
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-700">Attachments</p>
                       <p className="text-sm text-gray-900">{task.attachments.length} file(s)</p>
                     </div>
                   </div>
                 )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-5 h-5 mr-3 flex items-center justify-center">
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <Badge variant={getStatusVariant(task.status)} className="mt-1">
                      {task.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-5 h-5 mr-3 flex items-center justify-center">
                    <PriorityIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Priority</p>
                    <Badge variant={getPriorityVariant(task.priority)} className="mt-1">
                      {task.priority}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-5 h-5 bg-gray-100 rounded mr-3 flex items-center justify-center">
                    <span className="text-xs text-gray-600 font-bold">%</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Progress</p>
                    {!isOverdue && (
                      <p className="text-sm text-gray-900">{task.progress}%</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Attachments</p>
                <div className="space-y-2">
                  {task.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {attachment.type === 'file' ? (
                          <File className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Link className="w-5 h-5 text-green-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                          <p className="text-xs text-gray-500">
                            {attachment.type === 'file' && attachment.file_type && (
                              <span>{attachment.file_type}</span>
                            )}
                            {attachment.type === 'file' && attachment.size && (
                              <span> • {(attachment.size / 1024).toFixed(1)} KB</span>
                            )}
                            {attachment.type === 'url' && (
                              <span>URL Link</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(attachment.url, '_blank')}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Details */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Created</p>
                  <p className="text-gray-900">{new Date(task.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Last Updated</p>
                  <p className="text-gray-900">{new Date(task.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Overdue Warning */}
            {isOverdue && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-700 font-medium">This task is overdue</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
              {(user?.role === 'admin' || task.user_id === user?.id) && onUpdate && (
                <Button onClick={() => {
                  setIsViewOpen(false);
                  setIsEditOpen(true);
                }}>
                  Edit Task
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={hideDeleteConfirmation}
        onConfirm={confirmDelete}
        taskName={taskToDelete?.task_name || ''}
        taskDescription={taskToDelete?.description}
        assignedTo={taskToDelete?.user?.name}
        projectName={taskToDelete?.project?.name}
        priority={taskToDelete?.priority}
        dueDate={taskToDelete?.due_date}
        taskType={taskType}
      />
     </>
  );
};

export default TaskCard;