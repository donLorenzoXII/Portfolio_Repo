// ─────────────────────────────────────────────────────────────
// Your projects. Edit freely — order here = order in the wheel.
// Media lives in /public/media/projects/<slug>/ .
// TODO: every cover, teaser, gallery image and description below is a PLACEHOLDER.
// ─────────────────────────────────────────────────────────────

export type GalleryItem = {
  src: string
  alt: string
  /** 'video' plays muted on loop in the gallery */
  type?: 'image' | 'video'
  /** layout hint for the grid */
  span?: 'wide' | 'tall' | 'square'
}

export type Project = {
  slug: string
  title: string
  category: string
  year: string
  client?: string
  role?: string
  cover: string
  /** Muted looping clip shown on hover in the wheel (mp4, ideally < 1 MB, ~4–6 s) */
  teaser: string
  /** Wide image used as header media on the project page */
  hero: string
  excerpt: string
  description: string[]
  gallery: GalleryItem[]
}

const media = (slug: string) => `/media/projects/${slug}`

const gallery = (slug: string, title: string): GalleryItem[] => [
  { src: `${media(slug)}/g1.webp`, alt: `${title} — detail 1`, span: 'wide' },
  { src: `${media(slug)}/g2.webp`, alt: `${title} — detail 2`, span: 'tall' },
  { src: `${media(slug)}/g3.webp`, alt: `${title} — detail 3`, span: 'tall' },
  { src: `${media(slug)}/g4.webp`, alt: `${title} — detail 4`, span: 'wide' },
  { src: `${media(slug)}/g5.webp`, alt: `${title} — detail 5`, span: 'square' },
  { src: `${media(slug)}/g6.webp`, alt: `${title} — detail 6`, span: 'square' },
]

const make = (p: Omit<Project, 'cover' | 'teaser' | 'hero' | 'gallery'>): Project => ({
  ...p,
  cover: `${media(p.slug)}/cover.webp`,
  teaser: `${media(p.slug)}/teaser.mp4`,
  hero: `${media(p.slug)}/hero.webp`,
  gallery: gallery(p.slug, p.title),
})

export const projects: Project[] = [
  make({
    slug: 'brand-identity',
    title: 'Brand Identity',
    category: 'Branding',
    year: '2025',
    client: 'Placeholder Client',
    role: 'Concept, Logo, Visual System',
    excerpt: 'A modular identity system for a Swiss design studio.',
    description: [
      'TODO: Describe the brief. What did the client need, and why did it matter?',
      'TODO: Describe your process and the outcome — logo, typography, colour system, applications.',
    ],
  }),
  make({
    slug: 'social-media-campaign',
    title: 'Social Media Campaign',
    category: 'Social Media',
    year: '2025',
    role: 'Strategy, Content, Art Direction',
    excerpt: 'A six-week launch campaign across Instagram and TikTok.',
    description: [
      'TODO: Campaign goal and target audience.',
      'TODO: Key results — reach, engagement, growth.',
    ],
  }),
  make({
    slug: 'web-design',
    title: 'Web Design',
    category: 'Web',
    year: '2024',
    role: 'UX, UI, Webflow Build',
    excerpt: 'An editorial website for a boutique hospitality brand.',
    description: [
      'TODO: What was the site for, and what problem did the design solve?',
      'TODO: Highlights — structure, interactions, results.',
    ],
  }),
  make({
    slug: 'motion-design',
    title: 'Motion Design',
    category: 'Motion',
    year: '2024',
    role: 'Animation, Sound Design',
    excerpt: 'Animated brand assets and product explainers.',
    description: ['TODO: Describe the motion language and where it was used.', 'TODO: Tools and outcome.'],
  }),
  make({
    slug: 'photography',
    title: 'Photography',
    category: 'Photography',
    year: '2024',
    role: 'Photography, Retouching',
    excerpt: 'Portrait and product series shot across Switzerland.',
    description: ['TODO: The story behind the series.', 'TODO: Locations, equipment, editing approach.'],
  }),
  make({
    slug: 'content-strategy',
    title: 'Content Strategy',
    category: 'Strategy',
    year: '2023',
    role: 'Research, Editorial Planning',
    excerpt: 'A content framework that tripled organic reach.',
    description: ['TODO: Starting point and research insights.', 'TODO: The framework and its impact.'],
  }),
  make({
    slug: 'packaging',
    title: 'Packaging',
    category: 'Packaging',
    year: '2023',
    role: 'Packaging Design, Print Production',
    excerpt: 'Premium packaging for a small-batch chocolate maker.',
    description: ['TODO: Product and brand context.', 'TODO: Materials, print finishes, shelf result.'],
  }),
  make({
    slug: 'ad-campaign',
    title: 'Ad Campaign',
    category: 'Advertising',
    year: '2023',
    role: 'Concept, Copy, Design',
    excerpt: 'An out-of-home and digital ad campaign.',
    description: ['TODO: Campaign idea and key message.', 'TODO: Media mix and results.'],
  }),
]

export const getProject = (slug?: string) => projects.find((p) => p.slug === slug)
export const getNextProject = (slug: string) => {
  const i = projects.findIndex((p) => p.slug === slug)
  return projects[(i + 1) % projects.length]
}
