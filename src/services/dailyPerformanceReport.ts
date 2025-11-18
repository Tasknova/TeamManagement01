import { supabase } from '../lib/supabase';

export interface DailyPerformanceReport {
  date: string;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  blockedTasks: number;
  deletedTasks: number;
  taskBreakdown: {
    byUser: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      totalTasks: number;
      completed: number;
      pending: number;
      blocked: number;
    }>;
  };
}

export const dailyPerformanceReportService = {
  /**
   * Generate daily performance report for today
   * Only includes tasks that were updated today (based on updated_at column)
   */
  async generateDailyReport(): Promise<DailyPerformanceReport> {
    try {
      // Get today's date range (start and end of day in UTC)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      const todayEndStr = todayEnd.toISOString();

      // Query tasks that were updated today
      const { data: tasksUpdatedToday, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .gte('updated_at', todayStart)
        .lte('updated_at', todayEndStr);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

      // Query deleted tasks for today
      const { data: deletedTasksToday, error: deletedError } = await supabase
        .from('deleted_tasks')
        .select('*')
        .eq('task_type', 'regular')
        .gte('deleted_at', todayStart)
        .lte('deleted_at', todayEndStr);

      if (deletedError) {
        console.error('Error fetching deleted tasks:', deletedError);
      }

      const tasks = tasksUpdatedToday || [];
      const deletedTasks = deletedTasksToday || [];

      // Calculate metrics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const pendingTasks = tasks.filter(task => task.status !== 'completed').length;
      
      // Blocked: tasks that are not completed and due date has passed
      const now = new Date();
      const blockedTasks = tasks.filter(task => {
        if (task.status === 'completed') return false;
        const dueDate = new Date(task.due_date);
        return dueDate < now;
      }).length;

      // Get unique user IDs and fetch user data
      const userIds = [...new Set(tasks.map(task => task.user_id))];
      
      const [membersData, adminsData, projectManagersData] = await Promise.all([
        supabase
          .from('members')
          .select('id, name, email')
          .in('id', userIds),
        supabase
          .from('admins')
          .select('id, name, email')
          .in('id', userIds),
        supabase
          .from('project_managers')
          .select('id, name, email')
          .in('id', userIds)
      ]);

      // Create user map
      const userMap = new Map();
      [
        ...(membersData.data || []),
        ...(adminsData.data || []),
        ...(projectManagersData.data || [])
      ].forEach(user => {
        userMap.set(user.id, { name: user.name, email: user.email });
      });

      // Calculate per-user breakdown
      const userBreakdown = new Map<string, any>();
      
      tasks.forEach(task => {
        const userId = task.user_id;
        if (!userBreakdown.has(userId)) {
          const userData = userMap.get(userId) || { name: 'Unknown', email: '' };
          userBreakdown.set(userId, {
            userId,
            userName: userData.name,
            userEmail: userData.email,
            totalTasks: 0,
            completed: 0,
            pending: 0,
            blocked: 0
          });
        }

        const userStats = userBreakdown.get(userId);
        userStats.totalTasks++;

        if (task.status === 'completed') {
          userStats.completed++;
        } else {
          userStats.pending++;
          const dueDate = new Date(task.due_date);
          if (dueDate < now) {
            userStats.blocked++;
          }
        }
      });

      return {
        date: today.toISOString().split('T')[0],
        totalTasks,
        pendingTasks,
        completedTasks,
        blockedTasks,
        deletedTasks: deletedTasks.length,
        taskBreakdown: {
          byUser: Array.from(userBreakdown.values())
        }
      };
    } catch (error) {
      console.error('Error generating daily report:', error);
      throw error;
    }
  },

  /**
   * Send daily performance report to all members and project managers
   */
  async sendDailyReportToAllUsers(): Promise<void> {
    try {
      // Generate the report
      const report = await this.generateDailyReport();

      // Fetch all active members and project managers
      const [membersData, projectManagersData, adminsData] = await Promise.all([
        supabase
          .from('members')
          .select('id, name, email')
          .eq('is_active', true),
        supabase
          .from('project_managers')
          .select('id, name, email')
          .eq('is_active', true),
        supabase
          .from('admins')
          .select('id, name, email')
          .eq('is_active', true)
      ]);

      const allUsers = [
        ...(membersData.data || []),
        ...(projectManagersData.data || []),
        ...(adminsData.data || [])
      ];

      // Format the report message
      const reportMessage = this.formatReportMessage(report);

      // Create notifications for all users
      const notifications = allUsers.map(user => ({
        user_id: user.id,
        title: `📊 Daily Performance Report - ${report.date}`,
        message: reportMessage,
        type: 'report',
        is_read: false,
        created_at: new Date().toISOString()
      }));

      // Insert notifications in batches
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { error } = await supabase
          .from('notifications')
          .insert(batch);

        if (error) {
          console.error('Error inserting notifications batch:', error);
        }
      }

      console.log(`✅ Daily report sent to ${allUsers.length} users`);
    } catch (error) {
      console.error('Error sending daily report:', error);
      throw error;
    }
  },

  /**
   * Format the report data into a readable message
   */
  formatReportMessage(report: DailyPerformanceReport): string {
    const lines = [
      `📅 Date: ${report.date}`,
      '',
      '📈 Overall Performance:',
      `• Total Tasks Updated: ${report.totalTasks}`,
      `• ✅ Completed: ${report.completedTasks}`,
      `• ⏳ Pending: ${report.pendingTasks}`,
      `• 🚫 Blocked: ${report.blockedTasks}`,
      `• 🗑️ Deleted: ${report.deletedTasks}`,
      ''
    ];

    // Add top performers if available
    if (report.taskBreakdown.byUser.length > 0) {
      const sortedUsers = [...report.taskBreakdown.byUser]
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 5);

      lines.push('🏆 Top Performers Today:');
      sortedUsers.forEach((user, index) => {
        lines.push(
          `${index + 1}. ${user.userName}: ${user.completed}/${user.totalTasks} completed`
        );
      });
    }

    return lines.join('\n');
  },

  /**
   * Get detailed report for a specific user
   */
  async getUserDailyReport(userId: string): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      const todayEndStr = todayEnd.toISOString();

      const { data: userTasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', todayStart)
        .lte('updated_at', todayEndStr);

      if (error) throw error;

      const tasks = userTasks || [];
      const now = new Date();

      return {
        date: today.toISOString().split('T')[0],
        totalTasks: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        pending: tasks.filter(t => t.status !== 'completed').length,
        blocked: tasks.filter(t => {
          if (t.status === 'completed') return false;
          return new Date(t.due_date) < now;
        }).length,
        tasks: tasks
      };
    } catch (error) {
      console.error('Error getting user daily report:', error);
      throw error;
    }
  }
};
