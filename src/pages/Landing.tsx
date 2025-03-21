import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Shield, FileBarChart, BrainCircuit, Lock, ArrowRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-primary/90 to-primary relative overflow-hidden">
        <div className="app-container py-12 md:py-24 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2 space-y-6 text-white z-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Simplifiez votre conseil de classe avec <span className="text-primary-foreground">ClassReviewMaster</span>
            </h1>
            
            <p className="text-lg md:text-xl">
              Gagnez du temps, obtenez des analyses détaillées et rédigez des appréciations de qualité en quelques clics.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/dashboard">
                <Button size="lg" className="w-full sm:w-auto font-medium">
                  Essayer gratuitement
                </Button>
              </Link>
              <a href="#fonctionnalites">
                <Button variant="outline" size="lg" className="w-full sm:w-auto font-medium bg-white/10 hover:bg-white/20 border-white/20">
                  Découvrir les fonctionnalités
                </Button>
              </a>
            </div>
          </div>
          
          <div className="md:w-1/2 relative">
            <div className="relative bg-foreground/5 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden border border-white/10">
              <img 
                src="/dashboard-screenshot.png" 
                alt="ClassReviewMaster Dashboard" 
                className="w-full h-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 -skew-x-12 transform origin-top-right"></div>
      </header>

      {/* Benefits Section */}
      <section id="benefices" className="py-20 bg-secondary/30">
        <div className="app-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Pourquoi choisir ClassReviewMaster ?</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Notre application est conçue spécifiquement pour les enseignants responsables des conseils de classe, 
              offrant des outils puissants pour simplifier votre travail.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <Card className="border-primary/10 hover:shadow-md transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4 p-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Gain de temps considérable</h3>
                  <p className="text-muted-foreground">
                    Réduisez de 70% le temps consacré à l'analyse des résultats et à la rédaction des appréciations.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Benefit 2 */}
            <Card className="border-primary/10 hover:shadow-md transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4 p-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FileBarChart className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Analyses détaillées</h3>
                  <p className="text-muted-foreground">
                    Obtenez des visualisations claires et des rapports complets sur les performances de votre classe.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Benefit 3 */}
            <Card className="border-primary/10 hover:shadow-md transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4 p-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">IA intelligente</h3>
                  <p className="text-muted-foreground">
                    Générez des appréciations personnalisées et adaptées à chaque élève grâce à notre technologie d'IA.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-20">
        <div className="app-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Fonctionnalités principales</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Découvrez comment ClassReviewMaster peut transformer votre expérience des conseils de classe.
            </p>
          </div>
          
          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2 relative">
                <div className="glass-panel overflow-hidden rounded-lg shadow-xl">
                  <img 
                    src="/analytics-screenshot.png" 
                    alt="Analyse détaillée des résultats"
                    className="w-full h-auto rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                </div>
              </div>
              
              <div className="lg:w-1/2 space-y-6">
                <h3 className="text-2xl font-bold">Analyse approfondie des résultats</h3>
                <p className="text-lg text-muted-foreground">
                  Importez simplement vos fichiers de notes depuis PRONOTE et obtenez instantanément des visualisations 
                  claires et des statistiques pertinentes sur les performances de votre classe.
                </p>
                <ul className="space-y-3">
                  {[
                    "Graphiques de distribution des notes",
                    "Identification des élèves en difficulté",
                    "Comparaison avec les périodes précédentes",
                    "Analyse des tendances par matière"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="flex flex-col-reverse lg:flex-row items-center gap-12">
              <div className="lg:w-1/2 space-y-6">
                <h3 className="text-2xl font-bold">Génération d'appréciations intelligentes</h3>
                <p className="text-lg text-muted-foreground">
                  Rédigez des appréciations de qualité en un temps record, avec des suggestions 
                  personnalisées basées sur les performances et le profil de chaque élève.
                </p>
                <ul className="space-y-3">
                  {[
                    "Appréciations générales de classe",
                    "Appréciations individuelles adaptées",
                    "Choix du ton (de exigeant à très bienveillant)",
                    "Suggestions d'encouragements et d'axes d'amélioration"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="lg:w-1/2 relative">
                <div className="glass-panel overflow-hidden rounded-lg shadow-xl">
                  <img 
                    src="/appreciation-screenshot.png" 
                    alt="Génération d'appréciations"
                    className="w-full h-auto rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2 relative">
                <div className="glass-panel overflow-hidden rounded-lg shadow-xl">
                  <img 
                    src="/report-screenshot.png" 
                    alt="Rapport final complet"
                    className="w-full h-auto rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                </div>
              </div>
              
              <div className="lg:w-1/2 space-y-6">
                <h3 className="text-2xl font-bold">Rapport final prêt à l'emploi</h3>
                <p className="text-lg text-muted-foreground">
                  Générez un rapport complet pour le conseil de classe, intégrant toutes les analyses 
                  et appréciations en un document structuré et professionnel.
                </p>
                <ul className="space-y-3">
                  {[
                    "Format PDF téléchargeable",
                    "Mise en page soignée et professionnelle",
                    "Inclusion des graphiques et statistiques clés",
                    "Compatible avec tous les formats institutionnels"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-16 bg-primary/5">
        <div className="app-container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex p-3 bg-primary/10 rounded-full mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Sécurité et confidentialité garanties</h2>
            <p className="text-lg mb-8">
              La protection des données des élèves est notre priorité absolue. Nous avons conçu ClassReviewMaster 
              avec les plus hauts standards de sécurité.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Traitement local des données</h3>
                  <p className="text-muted-foreground">
                    Vos fichiers sont traités directement sur votre navigateur et ne sont jamais stockés sur nos serveurs.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="shrink-0">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Aucune conservation de données</h3>
                  <p className="text-muted-foreground">
                    Une fois votre session terminée, toutes les données sont automatiquement supprimées.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="shrink-0">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Chiffrement de bout en bout</h3>
                  <p className="text-muted-foreground">
                    Toutes les communications entre votre navigateur et notre application sont sécurisées.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="shrink-0">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Conformité RGPD</h3>
                  <p className="text-muted-foreground">
                    Notre application est entièrement conforme aux réglementations européennes sur la protection des données.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="app-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Ce que disent nos utilisateurs</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Découvrez comment ClassReviewMaster a transformé l'expérience des conseils de classe pour de nombreux enseignants.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Marie Durand",
                role: "Professeure principale, Lycée Victor Hugo",
                quote: "Avant ClassReviewMaster, je passais des heures à analyser les résultats et à rédiger les appréciations. Maintenant, je peux me concentrer sur l'essentiel : l'accompagnement de mes élèves."
              },
              {
                name: "Thomas Martin",
                role: "Professeur de mathématiques, Collège Jules Ferry",
                quote: "L'analyse détaillée des résultats m'a permis d'identifier rapidement les points faibles de ma classe et d'adapter mon enseignement. Un gain de temps et d'efficacité remarquable !"
              },
              {
                name: "Sophie Leclerc",
                role: "Professeure d'histoire-géographie, Lycée Pasteur",
                quote: "Les appréciations générées sont d'une qualité impressionnante, parfaitement adaptées à chaque élève. Pour la première fois, je trouve du plaisir à préparer mes conseils de classe !"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="border-primary/10">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="text-primary">
                      {Array(5).fill(0).map((_, i) => (
                        <span key={i} className="text-xl">★</span>
                      ))}
                    </div>
                    <p className="italic">" {testimonial.quote} "</p>
                    <div className="pt-4">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="app-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Prêt à révolutionner vos conseils de classe ?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Rejoignez des milliers d'enseignants qui ont déjà simplifié leur travail grâce à ClassReviewMaster.
          </p>
          
          <Link to="/">
            <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90 border-white">
              <span>Commencer maintenant</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          
          <p className="mt-6 text-white/80">
            Essai gratuit de 14 jours, aucune carte de crédit requise.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-secondary/50">
        <div className="app-container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <span className="bg-primary text-primary-foreground p-1 rounded flex items-center justify-center">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="text-xl font-medium ml-2">ClassReviewMaster</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Politique de confidentialité</a>
            </div>
          </div>
          
          <div className="border-t border-border/40 mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} ClassReviewMaster — Tous droits réservés</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

