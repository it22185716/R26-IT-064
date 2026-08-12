import Navbar from '@/components/home/Navbar';
import Hero from '@/components/home/Hero';
import FeatureSection from '@/components/home/FeatureSection';
import StatsStrip from '@/components/home/StatsStrip';
import Footer from '@/components/home/Footer';
import ScrollBackground from '@/components/home/ScrollBackground';
import { ACCENTS } from '@/components/home/content';

export default function HomePage() {
  return (
    <main className="relative min-h-screen text-slate-900">
      <ScrollBackground />
      <Navbar />

      {/* A sticky box is constrained by its containing block, so this wrapper is
          what makes the stacking-panel effect end here. Without it the panels'
          containing block would be <main> — spanning the whole document — and
          they'd stay pinned over the stats/footer all the way down the page. */}
      <div className="relative isolate">
        <Hero />
        <FeatureSection id="nutrition" index={1} align="right" accent={ACCENTS.nutrition} />
        <FeatureSection id="math" index={2} align="left" accent={ACCENTS.math} />
        <FeatureSection id="reading" index={3} align="right" accent={ACCENTS.reading} />
        <FeatureSection id="adaptive" index={4} align="left" accent={ACCENTS.adaptive} pinned={false} />
      </div>

      <StatsStrip />
      <Footer />
    </main>
  );
}
