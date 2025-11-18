import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface LoginFormProps {
  role: 'admin' | 'member' | 'project_manager';
  onBack: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ role, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert email to lowercase before login
      await login(email.toLowerCase().trim(), password, role);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <img 
            src="/logo.png" 
            alt="Tasknova Logo" 
            className="h-12 w-auto"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {role === 'admin' ? 'Admin' : role === 'project_manager' ? 'Project Manager' : 'Team Member'} Login
        </h2>
        <p className="text-gray-600 mt-2">
          Sign in to access your Tasknova dashboard
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={!email || !password}
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
        >
          ← Back to login options
        </button>
      </div>
    </Card>
  );
};

export default LoginForm;