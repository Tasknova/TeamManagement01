import { supabase } from '../lib/supabase';
import { Member, Admin, ProjectManager } from '../types';

export interface LoginResponse {
  user: (Member & { role: 'member' }) | (Admin & { role: 'admin' }) | (ProjectManager & { role: 'project_manager' });
  token: string;
}

export const authService = {
  async loginUser(email: string, password: string, role: 'admin' | 'member' | 'project_manager'): Promise<LoginResponse> {
    try {
      // Convert email to lowercase before querying
      const normalizedEmail = email.toLowerCase().trim();
      let user, error;
      if (role === 'admin') {
        ({ data: user, error } = await supabase
          .from('admins')
          .select('*')
          .eq('email', normalizedEmail)
          .eq('is_active', true)
          .single());
      } else if (role === 'project_manager') {
        ({ data: user, error } = await supabase
          .from('project_managers')
          .select('*')
          .eq('email', normalizedEmail)
          .eq('is_active', true)
          .single());
      } else {
        ({ data: user, error } = await supabase
          .from('members')
          .select('*')
          .eq('email', normalizedEmail)
          .eq('is_active', true)
          .single());
      }

      if (error || !user) {
        throw new Error('Invalid email or password');
      }

      // For demo: accept any password with at least 6 characters
      if (password.length < 6) {
        throw new Error('Invalid email or password');
      }

      // Create a simple token (in production, use JWT)
      const token = btoa(
        JSON.stringify({ id: user.id, role: role, exp: Date.now() + 24 * 60 * 60 * 1000 })
      );

      return {
        user: { ...user, role: role },
        token,
      };
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  async createMember(memberData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    department?: string;
    hire_date?: string;
  }): Promise<Member> {
    try {
      // In production, hash the password with bcrypt
      const password_hash = btoa(memberData.password); // Simple encoding for demo
      // Convert email to lowercase before storing
      const normalizedEmail = memberData.email.toLowerCase().trim();

      const { data: member, error } = await supabase
        .from('members')
        .insert({
          name: memberData.name,
          email: normalizedEmail,
          password_hash,
          phone: memberData.phone,
          department: memberData.department,
          hire_date: memberData.hire_date,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Email already exists');
        }
        throw new Error('Failed to create member');
      }

      return member;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create member');
    }
  },

  async updateMember(id: string, updates: Partial<Member>, adminUser?: { id: string; name: string }): Promise<Member> {
    // Normalize email to lowercase if it's being updated
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.email) {
      normalizedUpdates.email = normalizedUpdates.email.toLowerCase().trim();
    }
    const { data, error } = await supabase
      .from('members')
      .update(normalizedUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Failed to update member');
    // --- NEW: Send notification to member if updated by admin ---
    if (adminUser) {
      console.log('NOTIF DEBUG', {adminUser, id, updates});
      try {
        await supabase.from('notifications').insert([
          {
            user_id: id,
            title: '👤 Profile Updated',
            message: `Your profile was updated by admin${adminUser.name ? ' ' + adminUser.name : ''}. If you did not request this change, please contact support.`,
            type: 'system', // changed from 'profile_updated_by_admin' to 'system'
            related_id: id,
            related_type: 'user', // changed from 'member' to 'user'
          },
        ]);
      } catch (notifError) {
        // eslint-disable-next-line no-console
        console.error('Failed to send profile update notification to member:', notifError);
      }
    }
    // --- END NEW ---
    return data;
  },

  async deleteMember(id: string): Promise<void> {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Failed to delete member');
  },

  async getMembers(): Promise<Member[]> {
    try {
      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Failed to fetch members');
      }

      return members || [];
    } catch (error) {
      throw new Error('Failed to fetch members');
    }
  },

  async getAdmins(): Promise<Admin[]> {
    try {
      const { data: admins, error } = await supabase
        .from('admins')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) {
        throw new Error('Failed to fetch admins');
      }
      return admins || [];
    } catch (error) {
      throw new Error('Failed to fetch admins');
    }
  },

  async createAdmin(adminData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<Admin> {
    try {
      const password_hash = btoa(adminData.password.trim()); // Simple encoding for demo
      // Convert email to lowercase before storing
      const normalizedEmail = adminData.email.toLowerCase().trim();
      const { data: admin, error } = await supabase
        .from('admins')
        .insert({
          name: adminData.name,
          email: normalizedEmail,
          password_hash,
          phone: adminData.phone,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('Email already exists');
        }
        throw new Error('Failed to create admin');
      }
      return admin;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create admin');
    }
  },

  async updateAdmin(id: string, updates: Partial<Admin>): Promise<Admin> {
    // Normalize email to lowercase if it's being updated
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.email) {
      normalizedUpdates.email = normalizedUpdates.email.toLowerCase().trim();
    }
    const { data, error } = await supabase
      .from('admins')
      .update(normalizedUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Failed to update admin');
    return data;
  },

  async deleteAdmin(id: string): Promise<void> {
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Failed to delete admin');
  },

  // Add password verification for admin
  async verifyAdminPassword(adminId: string, password: string): Promise<boolean> {
    // In production, use bcrypt.compare
    try {
      if (!adminId || !password) {
        console.log('[DEBUG] verifyAdminPassword: Missing adminId or password');
        return false;
      }
      
      // Trim the password input (passwords are stored with trim)
      const trimmedPassword = password.trim();
      
      console.log('[DEBUG] verifyAdminPassword called with:', { 
        adminId, 
        passwordLength: trimmedPassword.length,
        passwordPreview: trimmedPassword.substring(0, 1) + '***' 
      });
      
      const { data: admin, error } = await supabase
        .from('admins')
        .select('password_hash, email, id')
        .eq('id', adminId)
        .single();
      
      console.log('[DEBUG] Admin query result:', { 
        found: !!admin, 
        adminId: admin?.id,
        email: admin?.email,
        hasHash: !!admin?.password_hash,
        hashLength: admin?.password_hash?.length,
        hashPreview: admin?.password_hash ? admin.password_hash.substring(0, 10) + '...' : 'N/A',
        error: error?.message 
      });
      
      if (error || !admin) {
        console.log('[DEBUG] Admin not found or error:', error);
        return false;
      }
      
      if (!admin.password_hash) {
        console.log('[DEBUG] Admin has no password_hash');
        return false;
      }
      
      // Password is stored as: btoa(password.trim())
      // We need to decode the stored hash and compare with input password (case-insensitive)
      
      // Normalize the stored hash (remove any whitespace)
      const storedHash = admin.password_hash.trim();
      
      // Decode the stored password hash to get the original password
      let storedPassword: string;
      try {
        storedPassword = atob(storedHash);
      } catch (e) {
        console.error('[DEBUG] Error decoding stored password hash:', e);
        return false;
      }
      
      // Compare passwords case-insensitively
      const passwordMatches = storedPassword.toLowerCase() === trimmedPassword.toLowerCase();
      
      // Also try direct hash comparison (for backwards compatibility)
      let computedHash: string;
      try {
        computedHash = btoa(trimmedPassword);
      } catch (e) {
        console.error('[DEBUG] Error encoding password with btoa:', e);
        // If encoding fails, fall back to decoded comparison only
        return passwordMatches;
      }
      
      // Direct hash comparison (most common case)
      const hashMatches = storedHash === computedHash;
      
      // Also try without trimming stored hash
      const hashMatchesUntrimmed = admin.password_hash === computedHash;
      
      // Try with untrimmed password
      let computedHashUntrimmed: string;
      try {
        computedHashUntrimmed = btoa(password);
        const hashMatchesUntrimmedPassword = storedHash === computedHashUntrimmed || admin.password_hash === computedHashUntrimmed;
        
        const finalMatch = passwordMatches || hashMatches || hashMatchesUntrimmed || hashMatchesUntrimmedPassword;
        
        console.log('[DEBUG] Password comparison:', { 
          storedPassword: storedPassword,
          inputPassword: trimmedPassword,
          passwordMatches,
          storedHashLength: storedHash.length, 
          computedHashLength: computedHash.length,
          hashMatches,
          hashMatchesUntrimmed,
          hashMatchesUntrimmedPassword,
          finalMatch
        });
        
        if (!finalMatch) {
          console.log('[DEBUG] Password mismatch details:');
          console.log('[DEBUG] - Stored password (decoded):', storedPassword);
          console.log('[DEBUG] - Input password:', trimmedPassword);
          console.log('[DEBUG] - Stored hash (full):', storedHash);
          console.log('[DEBUG] - Computed hash (trimmed):', computedHash);
        }
        
        return finalMatch;
      } catch (e) {
        console.error('[DEBUG] Error encoding untrimmed password with btoa:', e);
        // Fall back to case-insensitive comparison
        return passwordMatches || hashMatches || hashMatchesUntrimmed;
      }
    } catch (err) {
      console.error('[DEBUG] verifyAdminPassword error:', err);
      return false;
    }
  },

  validateToken(token: string): boolean {
    try {
      const decoded = JSON.parse(atob(token));
      return decoded.exp > Date.now();
    } catch {
      return false;
    }
  },

  getTokenData(token: string): { id: string; role: 'admin' | 'member' | 'project_manager' } | null {
    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.exp > Date.now()) {
        return { id: decoded.id, role: decoded.role };
      }
      return null;
    } catch {
      return null;
    }
  },

  async getProjectManagers(): Promise<ProjectManager[]> {
    try {
      const { data: projectManagers, error } = await supabase
        .from('project_managers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) {
        throw new Error('Failed to fetch project managers');
      }
      return projectManagers || [];
    } catch (error) {
      throw new Error('Failed to fetch project managers');
    }
  },

  async createProjectManager(pmData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    department?: string;
    hire_date?: string;
  }): Promise<ProjectManager> {
    try {
      const password_hash = btoa(pmData.password); // Simple encoding for demo
      // Convert email to lowercase before storing
      const normalizedEmail = pmData.email.toLowerCase().trim();
      const { data: projectManager, error } = await supabase
        .from('project_managers')
        .insert({
          name: pmData.name,
          email: normalizedEmail,
          password_hash,
          phone: pmData.phone,
          department: pmData.department,
          hire_date: pmData.hire_date,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('Email already exists');
        }
        throw new Error('Failed to create project manager');
      }
      return projectManager;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create project manager');
    }
  },

  async updateProjectManager(id: string, updates: Partial<ProjectManager>): Promise<ProjectManager> {
    // Normalize email to lowercase if it's being updated
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.email) {
      normalizedUpdates.email = normalizedUpdates.email.toLowerCase().trim();
    }
    const { data, error } = await supabase
      .from('project_managers')
      .update(normalizedUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Failed to update project manager');
    return data;
  },

  async deleteProjectManager(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_managers')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Failed to delete project manager');
  }
};