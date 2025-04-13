
import React, { useState } from 'react';
import StepNavigation from '@/components/StepNavigation';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const StepContent = ({ step }: { step: number }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h3 className="text-xl font-semibold mb-4">Étape {step}</h3>
      <p className="text-gray-600">
        Contenu exemple pour l'étape {step}. Cette section montrera le contenu associé
        à l'étape que vous avez sélectionnée dans la navigation.
      </p>
    </div>
  );
};

const StepNavigationExample = () => {
  const [currentStep, setCurrentStep] = useState(1);
  
  const steps = [
    {
      id: 1,
      label: "Analyse des données",
      icon: "BarChart",
      path: "#step-1",
    },
    {
      id: 2,
      label: "Appréciation classe",
      icon: "MessageCircle",
      path: "#step-2",
    },
    {
      id: 3,
      label: "Appréciation individuelle",
      icon: "UserCheck",
      path: "#step-3",
    },
    {
      id: 4,
      label: "Votre conseil de classe en résumé",
      icon: "FileText",
      path: "#step-4",
    },
  ];
  
  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Exemple de Navigation Multi-étapes</h1>
        
        <StepNavigation 
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          className="mb-10"
        />
        
        <StepContent step={currentStep} />
        
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={goToPrevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Button>
          
          <Button
            onClick={goToNextStep}
            disabled={currentStep === 4}
            className="flex items-center gap-2"
          >
            Suivant
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default StepNavigationExample;
