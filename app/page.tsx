import { Navbar } from "@/components/Navbar";
import { Preloader } from "@/components/Preloader";
import { Cursor } from "@/components/Cursor";
import { ScrollProgress } from "@/components/ScrollProgress";
import { GlobalVideoCanvas } from "@/components/GlobalVideoCanvas";
import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { SolutionSection } from "@/components/sections/SolutionSection";
import { ViewerDemoSection } from "@/components/sections/ViewerDemoSection";
import { ToolsSection } from "@/components/sections/ToolsSection";
import { IntelligenceEngineSection } from "@/components/sections/IntelligenceEngineSection";
import { VisiumScoreSection } from "@/components/sections/VisiumScoreSection";
import { FunnelSection } from "@/components/sections/FunnelSection";
import { PlataformaSection } from "@/components/sections/PlataformaSection";
import { DashboardSection } from "@/components/sections/DashboardSection";
import { RoadmapSection } from "@/components/sections/RoadmapSection";
import { FutureSection } from "@/components/sections/FutureSection";
import { CTASection } from "@/components/sections/CTASection";
import { Footer } from "@/components/Footer";
import { DemoModalProvider } from "@/components/DemoSimulationModal";

export default function Home() {
  return (
    <DemoModalProvider>
      <Preloader />
      <Cursor />
      <ScrollProgress />
      <Navbar />
      {/* Lienzo cinemático continuo — corre debajo de toda la página */}
      <GlobalVideoCanvas />
      <main className="relative">
        {/* Grano global */}
        <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.02] noise mix-blend-overlay" />

        {/* 01 */} <Hero />
        {/* 02 */} <ProblemSection />
        {/* 03 */} <SolutionSection />
        {/* 03b */} <ViewerDemoSection />
        {/* Herramientas */} <ToolsSection />
        {/* Motor de inteligencia */} <IntelligenceEngineSection />
        {/* 04 */} <VisiumScoreSection />
        {/* De señales a ventas */} <FunnelSection />
        {/* 05 */} <PlataformaSection />
        {/* 06 */} <DashboardSection />
        {/* 08 */} <RoadmapSection />
        {/* 09 */} <FutureSection />
        {/* 10 */} <CTASection />
      </main>
      <Footer />
    </DemoModalProvider>
  );
}
