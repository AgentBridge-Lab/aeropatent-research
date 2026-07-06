import { Suspense } from 'react';
import GraphView from '../../components/graph/GraphView';

export const metadata = { title: 'Graph View · AEROPATENT' };

export default function GraphPage() {
  return (
    <Suspense fallback={null}>
      <GraphView />
    </Suspense>
  );
}
