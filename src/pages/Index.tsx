import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ProjectsGallery } from "@/components/ProjectsGallery";
import { About } from "@/components/About";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ProjectsGallery />
      <About />
      <ContactForm />
      <Footer />
    </div>
  );
};

export default Index;
