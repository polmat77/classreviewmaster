
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import AppreciationGenerale from "./pages/AppreciationGenerale";
import AppreciationsIndividuelles from "./pages/AppreciationsIndividuelles";
import Rapport from "./pages/Rapport";
import NotFound from "./pages/NotFound";
import StepNavigationExample from "./pages/StepNavigationExample";

// Créez le client de requête
const queryClient = new QueryClient();

// URL de l'Edge Function Supabase - À mettre à jour avec votre ID de projet Supabase réel
export const SUPABASE_URL = import.meta.env.DEV 
  ? 'http://localhost:54321'
  : 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/analyse" element={<Navigate to="/dashboard" replace />} />
          <Route path="/appreciation-generale" element={<AppreciationGenerale />} />
          <Route path="/appreciations-individuelles" element={<AppreciationsIndividuelles />} />
          <Route path="/rapport" element={<Rapport />} />
          <Route path="/step-navigation-example" element={<StepNavigationExample />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
