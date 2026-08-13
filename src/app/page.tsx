import Navbar from '@/components/home/Navbar';
import Hero from '@/components/home/Hero';
import FeatureSection from '@/components/home/FeatureSection';
import StatsStrip from '@/components/home/StatsStrip';
import Footer from '@/components/home/Footer';
import ScrollBackground from '@/components/home/ScrollBackground';
import { ACCENTS } from '@/components/home/content';
import NutritionIllustration from '@/components/home/illustrations/NutritionIllustration';
import MathIllustration from '@/components/home/illustrations/MathIllustration';
import ReadingIllustration from '@/components/home/illustrations/ReadingIllustration';
import AdaptiveContentIllustration from '@/components/home/illustrations/AdaptiveContentIllustration';

export default function HomePage() {
  return (
    <main className="relative min-h-screen text-slate-900">
      <ScrollBackground />
      <Navbar />
      <Hero />
      <FeatureSection id="nutrition" index={1} align="right" accent={ACCENTS.nutrition} Illustration={NutritionIllustration} />
      <FeatureSection id="math" index={2} align="left" accent={ACCENTS.math} Illustration={MathIllustration} />
      <FeatureSection id="reading" index={3} align="right" accent={ACCENTS.reading} Illustration={ReadingIllustration} />
      <FeatureSection id="adaptive" index={4} align="left" accent={ACCENTS.adaptive} Illustration={AdaptiveContentIllustration} />
      <StatsStrip />
      <Footer />
    </main>
  );
}
