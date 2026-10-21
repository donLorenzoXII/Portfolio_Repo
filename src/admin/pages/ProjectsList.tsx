import { Link, useNavigate } from 'react-router-dom'
import type { Project } from '../../content/projects'
import { useCms } from '../store'
import { Button, Chevron, IconButton, PageHeader, PlusIcon, TrashIcon } from '../ui'

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (é → e)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'project'

function newProject(existing: Project[]): Project {
  let slug = 'new-project'
  for (let n = 2; existing.some((p) => p.slug === slug); n++) slug = `new-project-${n}`
  return {
    slug,
    title: 'New project',
    category: 'Category',
    year: String(new Date().getFullYear()),
    cover: '',
    teaser: '',
    hero: '',
    excerpt: '',
    description: [''],
    gallery: [],
  }
}

export default function ProjectsList() {
  const { draft, update } = useCms()
  const navigate = useNavigate()

  const add = () => {
    update((d) => {
      d.projects.push(newProject(d.projects))
    })
    navigate(`/admin/projects/${draft.projects.length}`)
  }

  const move = (from: number, to: number) =>
    update((d) => {
      d.projects.splice(to, 0, d.projects.splice(from, 1)[0])
    })

  const remove = (i: number) => {
    if (!window.confirm(`Delete “${draft.projects[i].title}”? You can still discard before saving.`)) return
    update((d) => {
      d.projects.splice(i, 1)
    })
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="The cards in the Selection of contents wheel, in this order. Each one opens its own project page."
        actions={
          <Button variant="primary" onClick={add}>
            <PlusIcon /> New project
          </Button>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-[#E7E1D7] bg-white">
        <ul className="divide-y divide-[#EFEAE2]">
          {draft.projects.map((p, i) => (
            <li key={p.slug + i} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[#FBFAF7]">
              <span className="w-6 text-right font-serif text-sm text-terra">{String(i + 1).padStart(2, '0')}</span>
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-[#EFEAE2]">{p.cover && <img src={p.cover} alt="" className="h-full w-full object-cover" />}</div>
              <Link to={`/admin/projects/${i}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium hover:text-terra">{p.title}</p>
                <p className="truncate text-xs text-stone">
                  {p.category} · {p.year} · /projects/{p.slug}
                </p>
              </Link>
              <div className="flex items-center">
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <Chevron dir="up" />
                </IconButton>
                <IconButton label="Move down" disabled={i === draft.projects.length - 1} onClick={() => move(i, i + 1)}>
                  <Chevron dir="down" />
                </IconButton>
                <IconButton label={`Delete ${p.title}`} onClick={() => remove(i)}>
                  <TrashIcon />
                </IconButton>
                <Link to={`/admin/projects/${i}`} className="ml-2 hidden rounded-lg border border-[#E2DBD0] px-3 py-1.5 text-xs font-medium hover:bg-[#F7F4EF] sm:block">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {draft.projects.length === 0 && <p className="px-6 py-12 text-center text-sm text-stone">No projects yet — add your first one.</p>}
      </div>
    </>
  )
}
