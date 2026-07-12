import type { MetadataRoute } from 'next';
import { FIELDS, SUBFIELDS, COUNTRIES } from './lib/data';

export const dynamic = 'force-static';

const SITE_URL = 'https://agentbridge-lab.github.io/aeropatent-research';

export default function sitemap(): MetadataRoute.Sitemap {
  const sections = ['', '/analysis', '/countries', '/graph', '/patents', '/reports'];
  const reportIds = [
    ...FIELDS.map((field) => `field.${field.id}`),
    ...SUBFIELDS.map((subfield) => `subfield.${subfield.id}`),
    ...COUNTRIES.map((country) => `country.${country.code}`),
  ];
  return [
    ...sections.map((section) => ({
      url: `${SITE_URL}${section}/`,
      changeFrequency: 'monthly' as const,
      priority: section === '' ? 1 : 0.8,
    })),
    ...reportIds.map((id) => ({
      url: `${SITE_URL}/reports/${encodeURIComponent(id)}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
