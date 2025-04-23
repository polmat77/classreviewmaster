
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import Index from '@/pages/Index';
import Landing from '@/pages/Landing';
import Analyse from '@/pages/Analyse';
import AppreciationGenerale from '@/pages/AppreciationGenerale';
import AppreciationsIndividuelles from '@/pages/AppreciationsIndividuelles';
import Rapport from '@/pages/Rapport';
import NotFound from '@/pages/NotFound';
import ImportationBulletins from '@/pages/ImportationBulletins';
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/analyse" element={<Analyse />} />
        <Route path="/appreciation-generale" element={<AppreciationGenerale />} />
        <Route path="/appreciations-individuelles" element={<AppreciationsIndividuelles />} />
        <Route path="/rapport" element={<Rapport />} />
        <Route path="/importation-bulletins" element={<ImportationBulletins />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </QueryClientProvider>
  );
}

export default App;
