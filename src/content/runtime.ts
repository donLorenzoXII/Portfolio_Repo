// Bridges the editable content (CMS) and the content modules in this folder.
// On start-up the site fetches the saved content (/api/index.php?r=content) and writes it *into* the existing exported objects,
// so every component keeps importing `site`, `about`, `projects`… exactly as before.
// When the API isn't there (e.g. a static deploy) the defaults in these files are used.
import { about, footer, showreel, site, skills, work } from './site'
import { contact } from './contact'
import { projects, type Project } from './projects'

export type EditableContent = {
  site: { role: string; navTitle: string; introEnter: { wide: string[]; narrow: string[] } }
  contact: typeof contact
  work: typeof work
  about: typeof about
  skills: typeof skills
  showreel: typeof showreel
  footer: typeof footer
  projects: Project[]
}

/** A deep copy of everything the CMS can edit, as currently shown on the site. */
export function snapshot(): EditableContent {
  return structuredClone({
    site: { role: site.role, navTitle: site.navTitle, introEnter: site.introEnter },
    contact,
    work,
    about,
    skills,
    showreel,
    footer,
    projects,
  })
}

/** Write saved content over the defaults (field by field, so new default fields survive old saves). */
export function applyContent(c: Partial<EditableContent>) {
  if (c.site) Object.assign(site, c.site)
  if (c.contact) {
    Object.assign(contact, c.contact)
    site.location = contact.location
  }
  if (c.work) Object.assign(work, c.work)
  if (c.about) Object.assign(about, c.about)
  if (c.skills) Object.assign(skills, c.skills)
  if (c.showreel) Object.assign(showreel, c.showreel)
  if (c.footer) Object.assign(footer, c.footer)
  if (Array.isArray(c.projects) && c.projects.length) projects.splice(0, projects.length, ...c.projects)
}

export async function loadContent(timeoutMs = 2500) {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch('/api/index.php?r=content', { signal: ctrl.signal, cache: 'no-store' })
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) applyContent(await res.json())
  } catch {
    /* offline / static hosting: keep the defaults */
  } finally {
    window.clearTimeout(timer)
  }
}
