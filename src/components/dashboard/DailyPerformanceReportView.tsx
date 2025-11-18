import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import { BarChart3, TrendingUp, CheckCircle2, Clock, AlertCircle, Trash2, Calendar, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import { toast } from 'sonner';

interface DailyReportData {
  date: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  deletedTasks: number;
  userBreakdown?: Array<{
    userId: string;
    userName: string;
    totalTasks: number;
    completed: number;
    pending: number;
    blocked: number;
  }>;
}

export const DailyPerformanceReportView: React.FC = () => {
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async (date: string) => {
    setLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch tasks updated on the selected date
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .gte('updated_at', startOfDay.toISOString())
        .lte('updated_at', endOfDay.toISOString());

      if (tasksError) throw tasksError;

      // Fetch deleted tasks
      const { data: deletedTasks, error: deletedError } = await supabase
        .from('deleted_tasks')
        .select('*')
        .eq('task_type', 'regular')
        .gte('deleted_at', startOfDay.toISOString())
        .lte('deleted_at', endOfDay.toISOString());

      const taskList = tasks || [];
      const deletedList = deletedTasks || [];

      // Calculate metrics
      const now = new Date();
      const completedTasks = taskList.filter(t => t.status === 'completed').length;
      const pendingTasks = taskList.filter(t => t.status !== 'completed').length;
      const blockedTasks = taskList.filter(t => {
        if (t.status === 'completed') return false;
        return new Date(t.due_date) < now;
      }).length;

      // Get user breakdown
      const userIds = [...new Set(taskList.map(t => t.user_id))];
      
      const [membersData, adminsData, pmsData] = await Promise.all([
        supabase.from('members').select('id, name').in('id', userIds),
        supabase.from('admins').select('id, name').in('id', userIds),
        supabase.from('project_managers').select('id, name').in('id', userIds)
      ]);

      const userMap = new Map();
      [...(membersData.data || []), ...(adminsData.data || []), ...(pmsData.data || [])].forEach(u => {
        userMap.set(u.id, u.name);
      });

      const userBreakdownMap = new Map();
      taskList.forEach(task => {
        if (!userBreakdownMap.has(task.user_id)) {
          userBreakdownMap.set(task.user_id, {
            userId: task.user_id,
            userName: userMap.get(task.user_id) || 'Unknown',
            totalTasks: 0,
            completed: 0,
            pending: 0,
            blocked: 0
          });
        }
        const stats = userBreakdownMap.get(task.user_id);
        stats.totalTasks++;
        if (task.status === 'completed') {
          stats.completed++;
        } else {
          stats.pending++;
          if (new Date(task.due_date) < now) {
            stats.blocked++;
          }
        }
      });

      setReport({
        date,
        totalTasks: taskList.length,
        completedTasks,
        pendingTasks,
        blockedTasks,
        deletedTasks: deletedList.length,
        userBreakdown: Array.from(userBreakdownMap.values()).sort((a, b) => b.completed - a.completed)
      });
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

  const completionRate = report ? 
    Math.round((report.completedTasks / (report.totalTasks || 1)) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Daily Performance Report
          </h2>
          <p className="text-gray-600 mt-1">Track daily task performance and team productivity</p>
        </div>
        <Button
          icon={RefreshCw}
          variant="outline"
          size="sm"
          onClick={() => fetchReport(selectedDate)}
        >
          Refresh
        </Button>
      </div>

      {/* Date Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            Today
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : report ? (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Tasks</p>
                  <p className="text-3xl font-bold text-blue-900">{report.totalTasks}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Completed</p>
                  <p className="text-3xl font-bold text-green-900">{report.completedTasks}</p>
                  <p className="text-xs text-green-600 mt-1">{completionRate}% rate</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Pending</p>
                  <p className="text-3xl font-bold text-yellow-900">{report.pendingTasks}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-600 opacity-50" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Blocked</p>
                  <p className="text-3xl font-bold text-red-900">{report.blockedTasks}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-red-600 opacity-50" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Deleted</p>
                  <p className="text-3xl font-bold text-gray-900">{report.deletedTasks}</p>
                </div>
                <Trash2 className="w-10 h-10 text-gray-600 opacity-50" />
              </div>
            </Card>
          </div>

          {/* User Breakdown */}
          {report.userBreakdown && report.userBreakdown.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Team Member Performance
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team Member
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Tasks
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pending
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Blocked
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.userBreakdown.map((user, index) => {
                      const userCompletionRate = Math.round((user.completed / user.totalTasks) * 100);
                      return (
                        <tr key={user.userId} className={index < 3 ? 'bg-blue-50' : ''}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {index === 0 && <span className="text-yellow-500">🥇</span>}
                              {index === 1 && <span className="text-gray-400">🥈</span>}
                              {index === 2 && <span className="text-orange-600">🥉</span>}
                              <span className="font-medium text-gray-900">{user.userName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-900 font-medium">
                            {user.totalTasks}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {user.completed}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {user.pending}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {user.blocked}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    userCompletionRate >= 80 ? 'bg-green-600' :
                                    userCompletionRate >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                                  }`}
                                  style={{ width: `${userCompletionRate}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                {userCompletionRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Summary */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Report Summary</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                📅 <strong>Date:</strong> {new Date(report.date).toLocaleDateString('en-US', { 
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </p>
              <p>
                📊 <strong>Overall Performance:</strong> {report.totalTasks} tasks were updated with a {completionRate}% completion rate
              </p>
              {report.completedTasks > 0 && (
                <p className="text-green-700">
                  ✅ Great job! {report.completedTasks} tasks were completed today
                </p>
              )}
              {report.blockedTasks > 0 && (
                <p className="text-red-700">
                  ⚠️ Attention needed: {report.blockedTasks} tasks are blocked and overdue
                </p>
              )}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No data available for this date</p>
        </Card>
      )}
    </div>
  );
};
