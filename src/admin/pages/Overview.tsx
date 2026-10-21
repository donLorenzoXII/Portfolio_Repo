import { Link } from 'react-router-dom'
import { useCms } from '../store'
import { Card, Chevron, PageHeader } from '../ui'

export default function Overview() {
  const { draft } = useCms()
  const sections = [
    { to: '/admin/projects', title: 'Projects', text: `${draft.projects.length} projects in the wheel — texts, covers, teaser videos and the project pages.` },
    { to: '/admin/about', title: 'About & Skills', text: `Your bio, quick facts and ${draft.skills.items.length} skills with their levels.` },
    { to: '/admin/contact', title: 'Contact', text: `${draft.contact.email} · ${draft.contact.phone} · ${draft.contact.location}` },
    { to: '/admin/general', title: 'General', text: 'Role, menu wordmark, entry screen, showreel video and footer headline.' },
  ]
  return (
    <>
      <PageHeader title="Welcome back" description="Pick what you want to edit. Nothing goes live until you press Save." />
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra/50">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl">{s.title}</h2>
                  <p className="mt-1 text-sm text-stone">{s.text}</p>
                </div>
                <span className="mt-1 text-stone transition-transform group-hover:translate-x-1 group-hover:text-terra">
                  <Chevron dir="right" />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 mt-12 text-xs font-semibold uppercase tracking-[0.18em] text-stone">Projects</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {draft.projects.map((p, i) => (
          <Link key={p.slug + i} to={`/admin/projects/${i}`} className="group overflow-hidden rounded-xl border border-[#E7E1D7] bg-white">
            <div className="aspect-[3/4] overflow-hidden bg-[#EFEAE2]">
              {p.cover && <img src={p.cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium">{p.title}</p>
              <p className="text-xs text-stone">
                {p.category} · {p.year}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
