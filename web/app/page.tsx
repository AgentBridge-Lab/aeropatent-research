import Spline from '@splinetool/react-spline/next';
import Hero from './components/Hero';

// 홈 = 히어로(3D) 전용. "Explore Data" → /analysis 로 진입.
export default function Home() {
  return (
    <Hero>
      <Spline scene="https://prod.spline.design/bp9KxZ1OXYt5Tztc/scene.splinecode" />
    </Hero>
  );
}
