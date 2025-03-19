
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Analyse from "./pages/Analyse";
import AppreciationGenerale from "./pages/AppreciationGenerale";
import AppreciationsIndividuelles from "./pages/AppreciationsIndividuelles";
import Rapport from "./pages/Rapport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/analyse" element={<Analyse />} />
          <Route path="/appreciation-generale" element={<AppreciationGenerale />} />
          <Route path="/appreciations-individuelles" element={<AppreciationsIndividuelles />} />
          <Route path="/rapport" element={<Rapport />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
