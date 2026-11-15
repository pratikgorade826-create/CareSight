import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { EmergencyModal } from './components/EmergencyModal';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Medications } from './pages/Medications';
import { Appointments } from './pages/Appointments';
import { AICareCompanion } from './pages/AICareCompanion';
import { HealthTimeline } from './pages/HealthTimeline';
import { FamilyCircle } from './pages/FamilyCircle';
import { MedicalVault } from './pages/MedicalVault';
import { Analytics } from './pages/Analytics';
import { Emergency } from './pages/Emergency';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isSOSOpen, setIsSOSOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            CareSight Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      <Navbar onOpenSOS={() => setIsSOSOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard onOpenSOS={() => setIsSOSOpen(true)} />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/ai-companion" element={<AICareCompanion />} />
              <Route path="/timeline" element={<HealthTimeline />} />
              <Route path="/family-circle" element={<FamilyCircle />} />
              <Route path="/medical-vault" element={<MedicalVault />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/emergency" element={<Emergency onOpenSOS={() => setIsSOSOpen(true)} />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <EmergencyModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
};
