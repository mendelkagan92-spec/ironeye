import React, { useState } from 'react';
import BottomNav from './components/BottomNav';
import WorkoutPage from './pages/WorkoutPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import GeneratePage from './pages/GeneratePage';
import RunningPage from './pages/RunningPage';
import AuthPage from './pages/AuthPage';
import { getToken, clearToken } from './api';
import type { TabName, GeneratedWorkout, User } from './types';

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('ironeye_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    // Only restore user if a token also exists
    return getToken() ? getStoredUser() : null;
  });
  const [activeTab, setActiveTab] = useState<TabName>('workout');
  const [pendingGeneratedWorkout, setPendingGeneratedWorkout] = useState<GeneratedWorkout | null>(null);

  const hasActiveWorkout = !!localStorage.getItem('ironeye_active_workout');

  function handleAuth(u: User) {
    localStorage.setItem('ironeye_user', JSON.stringify(u));
    setUser(u);
  }

  function handleLogout() {
    clearToken();
    localStorage.removeItem('ironeye_user');
    setUser(null);
    setActiveTab('workout');
  }

  const handleStartGeneratedWorkout = (workout: GeneratedWorkout) => {
    setPendingGeneratedWorkout(workout);
    setActiveTab('workout');
  };

  if (!user) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex-shrink-0 bg-surface border-b border-surface-3 safe-top">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <span className="font-barlow font-black text-amber-500 text-xs">IE</span>
            </div>
            <span className="font-barlow text-xl font-bold text-text-primary tracking-tight">IronEye</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-text-muted text-xs font-dm">AI Ready</span>
          </div>
        </div>
      </header>

      {/* Page content — scrollable */}
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-lg mx-auto px-4 py-4 pb-24">
          {activeTab === 'workout' && (
            <WorkoutPage
              generatedWorkout={pendingGeneratedWorkout}
              onClearGenerated={() => setPendingGeneratedWorkout(null)}
            />
          )}
          {activeTab === 'generate' && (
            <GeneratePage onStartWorkout={handleStartGeneratedWorkout} />
          )}
          {activeTab === 'running' && <RunningPage />}
          {activeTab === 'history' && (
            <HistoryPage onStartSavedWorkout={(w) => { setPendingGeneratedWorkout(w); setActiveTab('workout'); }} />
          )}
          {activeTab === 'profile' && <ProfilePage user={user} onLogout={handleLogout} />}
        </div>
      </main>

      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        hasActiveWorkout={hasActiveWorkout}
      />
    </div>
  );
}
