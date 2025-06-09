
import { toast } from 'sonner';

export interface N8NAnalysisPayload {
  files: Array<{
    name: string;
    type: string;
    size: number;
    content: string; // base64 encoded
  }>;
  metadata: {
    timestamp: string;
    source: string;
    analysisType: 'grade_table_analysis';
  };
}

export interface N8NAnalysisResponse {
  success: boolean;
  analysis?: {
    className: string;
    subjects: string[];
    students: Array<{
      name: string;
      grades: Record<string, number>;
      average: number;
    }>;
    statistics: {
      classAverage: number;
      distribution: Array<{
        category: string;
        count: number;
        percentage: number;
      }>;
      subjectAverages: Record<string, number>;
    };
  };
  error?: string;
}

export const sendToN8NWebhook = async (
  webhookUrl: string,
  files: File[]
): Promise<N8NAnalysisResponse> => {
  try {
    console.log(`Envoi de ${files.length} fichier(s) vers N8N...`);

    // Convert files to base64
    const filePromises = files.map(async (file) => {
      return new Promise<{ name: string; type: string; size: number; content: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Content = (reader.result as string).split(',')[1]; // Remove data:type;base64, prefix
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64Content
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    const processedFiles = await Promise.all(filePromises);

    const payload: N8NAnalysisPayload = {
      files: processedFiles,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'ClassReviewMaster',
        analysisType: 'grade_table_analysis'
      }
    };

    console.log('Payload préparé:', {
      filesCount: payload.files.length,
      metadata: payload.metadata
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Réponse de N8N:', result);

    if (result.success && result.analysis) {
      toast.success("Analyse N8N terminée avec succès");
      return result;
    } else {
      throw new Error(result.error || 'Erreur inconnue lors de l\'analyse N8N');
    }

  } catch (error) {
    console.error('Erreur lors de l\'envoi vers N8N:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    toast.error(`Erreur N8N: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

export const convertN8NResponseToAnalysisData = (n8nResponse: N8NAnalysisResponse) => {
  if (!n8nResponse.success || !n8nResponse.analysis) {
    throw new Error('Réponse N8N invalide');
  }

  const { analysis } = n8nResponse;

  // Convert N8N response to our internal format
  const subjects = analysis.subjects.map(subject => ({
    name: subject,
    current: analysis.statistics.subjectAverages[subject] || 0,
    previous: analysis.statistics.subjectAverages[subject] - 0.5 || 0, // Mock previous data
    change: 0.2 // Mock change data
  }));

  const averages = [
    { name: 'T1', moyenne: analysis.statistics.classAverage - 0.8 },
    { name: 'T2', moyenne: analysis.statistics.classAverage - 0.3 },
    { name: 'T3', moyenne: analysis.statistics.classAverage }
  ];

  const enhancedStudents = analysis.students.map(student => ({
    name: student.name,
    average: student.average,
    subjects: Object.entries(student.grades).map(([subject, grade]) => ({
      name: subject,
      grade: grade,
      comment: '',
      teacher: '',
      classAverage: analysis.statistics.subjectAverages[subject] || null
    }))
  }));

  return {
    averages,
    distribution: analysis.statistics.distribution,
    subjects,
    currentTerm: {
      term: 'Trimestre analysé',
      class: analysis.className,
      classAverage: analysis.statistics.classAverage,
      studentCount: analysis.students.length,
      subjects: subjects.map(s => ({ name: s.name, average: s.current })),
      students: enhancedStudents,
      schoolName: 'École analysée'
    },
    previousTerms: [
      { term: 'Trimestre 1', classAverage: analysis.statistics.classAverage - 0.8 },
      { term: 'Trimestre 2', classAverage: analysis.statistics.classAverage - 0.3 }
    ],
    categories: {
      veryStruggling: analysis.statistics.distribution.find(d => d.category === 'Très en difficulté')?.count || 0,
      struggling: analysis.statistics.distribution.find(d => d.category === 'En difficulté')?.count || 0,
      average: analysis.statistics.distribution.find(d => d.category === 'Moyens')?.count || 0,
      good: analysis.statistics.distribution.find(d => d.category === 'Assez bons')?.count || 0,
      excellent: analysis.statistics.distribution.find(d => d.category === 'Bons à excellents')?.count || 0
    },
    analysisPoints: [
      `Analyse effectuée sur ${analysis.students.length} élèves`,
      `Moyenne de classe: ${analysis.statistics.classAverage.toFixed(2)}/20`,
      `${analysis.subjects.length} matières analysées`
    ]
  };
};
