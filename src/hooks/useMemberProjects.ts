import { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { projectService } from '../services/projects';
import { useAuth } from '../contexts/AuthContext';

export function useMemberProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMemberProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('Fetching member projects for user:', user.id);
      const data = await projectService.getMemberProjects(user.id);
      console.log('Member projects fetched successfully:', data);
      setProjects(data);
    } catch (err) {
      setError('Failed to fetch member projects');
      console.error('Error fetching member projects:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMemberProjects();
  }, [fetchMemberProjects]);

  const refetchProjects = useCallback(() => {
    fetchMemberProjects();
  }, [fetchMemberProjects]);

  return { 
    projects, 
    loading, 
    error, 
    refetchProjects 
  };
}
