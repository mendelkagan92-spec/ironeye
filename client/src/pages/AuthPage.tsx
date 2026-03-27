import React, { useState } from 'react';
import { login, signup, setToken } from '../api';
import type { User } from '../types';

interface Props {
  onAuth: (user: User) => void;
}

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await login(email, password)
        : await signup(email, password);
      setToken(res.token);
      onAuth(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
            <span className="font-barlow font-black text-amber-500 text-2xl">IE</span>
          </div>
          <h1 className="font-barlow text-4xl font-black text-text-primary">IronEye</h1>
          <p className="text-text-muted text-sm">AI-powered gym companion</p>
        </div>

        {/* Form */}
        <div className="card space-y-5">
          <h2 className="font-barlow text-2xl font-bold text-text-primary">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-text-muted text-xs font-dm uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-500/50 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-muted text-xs font-dm uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                required
                className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-500/50 text-sm"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-barlow font-bold text-lg py-3 rounded-xl transition-colors"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-text-muted text-sm">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-amber-500 font-medium hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
