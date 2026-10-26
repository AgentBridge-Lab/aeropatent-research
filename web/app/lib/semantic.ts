import snapshot from './semantic-data.json';

export const SEMANTIC = snapshot;
export const SEMANTIC_SCOPE = '제목·초록이 저장된 대표 문헌 표본 기준 · 전체 특허 모집단 아님';
export const SEMANTIC_COLORS = ['#62cbb7', '#e3b66e', '#cd94be', '#82b4ec', '#c1cd78', '#e89683'];

const documents = new Map(snapshot.documents.map((doc) => [doc.id, doc]));
const membership: Record<string, string> = snapshot.membership;

export function semanticClusterId(patentId: string): string | undefined {
  return membership[patentId];
}

export function semanticColor(clusterId?: string): string {
  const index = snapshot.clusters.findIndex((cluster) => cluster.id === clusterId);
  return index < 0 ? '#7c8794' : SEMANTIC_COLORS[index % SEMANTIC_COLORS.length];
}

export function semanticNeighbors(patentId: string, availableIds: Set<string>, limit = 4) {
  const doc = documents.get(patentId);
  if (!doc) return [];
  return snapshot.edges.flatMap((edge) => {
    const family = edge.source_family === doc.family_id ? edge.target_family
      : edge.target_family === doc.family_id ? edge.source_family : null;
    if (!family) return [];
    const candidates = snapshot.documents.filter((item) => item.family_id === family && availableIds.has(item.id));
    const neighbor = candidates.find((item) => item.country === doc.country) ?? candidates[0];
    return neighbor ? [{ id: neighbor.id, similarity: edge.similarity }] : [];
  }).sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id)).slice(0, limit);
}

export function semanticSimilarity(source: string, target: string): number | undefined {
  const a = documents.get(source)?.family_id;
  const b = documents.get(target)?.family_id;
  if (!a || !b || a === b) return undefined;
  return snapshot.edges.find((edge) => (edge.source_family === a && edge.target_family === b)
    || (edge.source_family === b && edge.target_family === a))?.similarity;
}
