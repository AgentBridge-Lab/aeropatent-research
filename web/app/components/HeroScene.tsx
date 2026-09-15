'use client';

import { Component, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false });

// The decorative remote scene must never prevent access to the site's navigation.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function HeroScene() {
  return <SceneBoundary><Spline scene="https://prod.spline.design/bp9KxZ1OXYt5Tztc/scene.splinecode" /></SceneBoundary>;
}
