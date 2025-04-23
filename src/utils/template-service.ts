
/**
 * Service de gestion des templates de mapping pour les bulletins
 */
interface MappingTemplate {
  id: string;
  name: string;
  description?: string;
  dateCreated: string;
  lastUsed?: string;
  sourceType: 'pdf' | 'excel' | 'csv';
  mappingConfig: Record<string, any>;
}

export const TemplateService = {
  /**
   * Récupère tous les templates de mapping sauvegardés
   */
  getAllTemplates(): MappingTemplate[] {
    try {
      const templatesJson = localStorage.getItem('bulletin-mapping-templates');
      return templatesJson ? JSON.parse(templatesJson) : [];
    } catch (error) {
      console.error("Erreur lors de la récupération des templates:", error);
      return [];
    }
  },

  /**
   * Récupère un template spécifique par son ID
   */
  getTemplateById(id: string): MappingTemplate | null {
    const templates = this.getAllTemplates();
    return templates.find(template => template.id === id) || null;
  },

  /**
   * Sauvegarde un nouveau template ou met à jour un template existant
   */
  saveTemplate(template: Omit<MappingTemplate, 'id' | 'dateCreated'> & { id?: string }): MappingTemplate {
    const templates = this.getAllTemplates();
    
    const newTemplate: MappingTemplate = {
      id: template.id || crypto.randomUUID(),
      name: template.name,
      description: template.description,
      dateCreated: template.id ? 
        (templates.find(t => t.id === template.id)?.dateCreated || new Date().toISOString()) : 
        new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      sourceType: template.sourceType,
      mappingConfig: template.mappingConfig
    };
    
    const updatedTemplates = template.id ? 
      templates.map(t => t.id === template.id ? newTemplate : t) : 
      [...templates, newTemplate];
    
    localStorage.setItem('bulletin-mapping-templates', JSON.stringify(updatedTemplates));
    return newTemplate;
  },

  /**
   * Supprime un template par son ID
   */
  deleteTemplate(id: string): boolean {
    const templates = this.getAllTemplates();
    const filteredTemplates = templates.filter(template => template.id !== id);
    
    if (filteredTemplates.length < templates.length) {
      localStorage.setItem('bulletin-mapping-templates', JSON.stringify(filteredTemplates));
      return true;
    }
    
    return false;
  },

  /**
   * Met à jour la date de dernière utilisation d'un template
   */
  updateLastUsed(id: string): void {
    const templates = this.getAllTemplates();
    const updatedTemplates = templates.map(template => 
      template.id === id ? 
        { ...template, lastUsed: new Date().toISOString() } : 
        template
    );
    
    localStorage.setItem('bulletin-mapping-templates', JSON.stringify(updatedTemplates));
  }
};
