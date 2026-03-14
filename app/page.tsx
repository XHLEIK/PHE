import CallToActionSection from '@/components/landing/CallToActionSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import Footer from '@/components/landing/Footer';
import HeroSection from '@/components/landing/HeroSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import Navbar from '@/components/landing/Navbar';
import WhyPlatformSection from '@/components/landing/WhyPlatformSection';

export default function Home() {
  return (
    <main className="min-h-screen bg-gov-neutral-50 font-sans text-slate-900">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <WhyPlatformSection />
      <CallToActionSection />
      <Footer />
    </main>
  );
}
