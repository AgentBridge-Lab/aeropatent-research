import HeroScene from './components/HeroScene';
import Hero from './components/Hero';

// 홈 = 히어로(3D) 전용. "Explore Data" → /analysis 로 진입.
export default function Home() {
  return (
    <Hero>
      <HeroScene />
    </Hero>
  );
}
