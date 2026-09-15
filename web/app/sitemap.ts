import type { MetadataRoute } from 'next';
import { FIELDS, SUBFIELDS, COUNTRIES, PATENTS, APPLICANTS, KEYWORDS } from './lib/data';

export const dynamic = 'force-static';
const SITE_URL = 'https://agentbridge-lab.github.io/aeropatent-research';

export default function sitemap(): MetadataRoute.Sitemap {
  const sections = ['', '/analysis', '/countries', '/graph', '/patents', '/reports',
    '/deepdive', '/deepdive/launch', '/deepdive/satellite', '/deepdive/satellite-apps',
    '/deepdive/aviation', '/exploration'];
  // Match all report and patent routes exported by generateStaticParams.
  const reportIds = new Set([
    ...FIELDS.map((field) => `field.${field.id}`),
    ...SUBFIELDS.map((subfield) => `subfield.${subfield.id}`),
    ...COUNTRIES.map((country) => `country.${country.code}`),
    ...PATENTS.map((patent) => patent.id),
    ...APPLICANTS.map((applicant) => `applicant.${applicant.id}`),
    ...KEYWORDS.map((keyword) => `keyword.${keyword}`),
  ]);
  return [
    ...sections.map((section) => ({
      url: `${SITE_URL}${section}/`,
      changeFrequency: 'monthly' as const,
      priority: section === '' ? 1 : 0.8,
    })),
    ...FIELDS.map((field) => ({
      url: `${SITE_URL}/analysis/${encodeURIComponent(field.id)}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...Array.from(reportIds).map((id) => ({
      url: `${SITE_URL}/reports/${encodeURIComponent(id)}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...PATENTS.map((patent) => ({
      url: `${SITE_URL}/patents/${encodeURIComponent(patent.publication_number)}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
