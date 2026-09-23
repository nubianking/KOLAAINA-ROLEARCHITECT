import React, { useState } from 'react';
import { Button } from './Button';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === 'Anuoluwa112' && password === 'Succ66112026') {
      onLogin();
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-white selection:text-black font-sans">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tighter mb-2">RoleArchitect</h1>
          <p className="text-neutral-400">Secure Access Portal</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 tracking-widest uppercase">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-white focus:outline-none focus:border-white focus:ring-0 transition-colors"
                placeholder="Enter username"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 tracking-widest uppercase">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-white focus:outline-none focus:border-white focus:ring-0 transition-colors"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-900/50 text-red-200 text-xs rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full justify-center">
              Authenticate
            </Button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-neutral-600">
            Restricted System. Authorized Personnel Only.
          </p>
        </div>
      </div>
    </div>
  );
};