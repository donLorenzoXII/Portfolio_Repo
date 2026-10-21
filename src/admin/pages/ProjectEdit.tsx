import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import type { GalleryItem, Project } from '../../content/projects'
import { useCms } from '../store'
import { Button, Card, ExternalIcon, Grid, isVideo, MediaInput, PageHeader, ParagraphsInput, Repeater, Select, TextArea, TextInput } from '../ui'
import { slugify } from './ProjectsList'

export default function ProjectEdit() {
  const { index } = useParams()
  const i = Number(index)
  const { draft, update } = useCms()
  const navigate = useNavigate()
  const p = draft.projects[i]
  if (!p) return <Navigate to="/admin/projects" replace />

  const set = <K extends keyof Project>(key: K, value: Project[K]) =>
    update((d) => {
      d.projects[i][key] = value
    })

  const slugTaken = draft.projects.some((x, j) => j !== i && x.slug === p.slug)

  const remove = () => {
    if (!window.confirm(`Delete “${p.title}”? You can still discard before saving.`)) return
    update((d) => {
      d.projects.splice(i, 1)
    })
    navigate('/admin/projects')
  }

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link to="/admin/projects" className="hover:text-ink">
              Projects
            </Link>{' '}
            / <span className="text-ink">{p.title || 'Untitled'}</span>
          </>
        }
        title={p.title || 'Untitled project'}
        actions={
          <>
            <a href={`/projects/${p.slug}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-stone hover:bg-[#F1ECE4] hover:text-ink">
              <ExternalIcon /> View page
            </a>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card title="Basics" description="Shown on the card in the wheel and at the top of the project page.">
            <TextInput
              label="Title"
              value={p.title}
              onChange={(v) =>
                update((d) => {
                  const wasAuto = d.projects[i].slug === slugify(d.projects[i].title) || d.projects[i].slug.startsWith('new-project')
                  d.projects[i].title = v
                  if (wasAuto) d.projects[i].slug = slugify(v)
                })
              }
            />
            <Grid>
              <TextInput label="Category" value={p.category} onChange={(v) => set('category', v)} placeholder="e.g. Branding" />
              <TextInput label="Year" value={p.year} onChange={(v) => set('year', v)} placeholder="2025" />
            </Grid>
            <TextInput
              label="Page address"
              hint={slugTaken ? '⚠ Another project already uses this address.' : `yoursite.com/projects/${p.slug}`}
              value={p.slug}
              onChange={(v) => set('slug', slugify(v))}
            />
          </Card>

          <Card title="Project page" description="The text on the project's own page.">
            <TextArea label="Intro sentence" hint="The large serif line at the top of the page." rows={2} value={p.excerpt} onChange={(v) => set('excerpt', v)} />
            <ParagraphsInput label="Description" value={p.description} onChange={(v) => set('description', v)} />
            <Grid>
              <TextInput label="Client" value={p.client ?? ''} onChange={(v) => set('client', v || undefined)} placeholder="optional" />
              <TextInput label="Role" value={p.role ?? ''} onChange={(v) => set('role', v || undefined)} placeholder="e.g. Concept, Design" />
            </Grid>
          </Card>

          <Card title="Gallery" description="Images and videos shown in a grid on the project page. Videos play muted on loop.">
            <Repeater<GalleryItem>
              items={p.gallery}
              onChange={(g) => set('gallery', g)}
              create={() => ({ src: '', alt: '', span: 'square', type: 'image' })}
              addLabel="Add image or video"
              itemLabel={(g) => g.alt || (g.src ? g.src.split('/').pop()! : 'Empty')}
              render={(g, setG) => (
                <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                  <MediaInput label="File" accept="any" aspect="aspect-[4/3]" value={g.src} onChange={(src, type) => setG({ ...g, src, type })} />
                  <div className="space-y-4">
                    <TextInput label="Description (alt text)" hint="Describes the image for screen readers and search engines." value={g.alt} onChange={(v) => setG({ ...g, alt: v })} />
                    <Select
                      label="Layout"
                      value={g.span ?? 'square'}
                      onChange={(v) => setG({ ...g, span: v })}
                      options={[
                        { value: 'wide', label: 'Wide — full row' },
                        { value: 'tall', label: 'Tall — half row, portrait' },
                        { value: 'square', label: 'Square — half row' },
                      ]}
                    />
                    {g.src && <p className="text-xs text-stone">{isVideo(g.src) ? 'Video' : 'Image'}</p>}
                  </div>
                </div>
              )}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Card in the wheel">
            <MediaInput label="Cover image" hint="Portrait, about 3:4." aspect="aspect-[3/4]" value={p.cover} onChange={(v) => set('cover', v)} />
            <MediaInput label="Teaser video" hint="Plays on hover. Short (4–6 s) MP4, ideally under 2 MB." accept="video" value={p.teaser} onChange={(v) => set('teaser', v)} />
          </Card>
          <Card title="Page header">
            <MediaInput label="Header image" hint="Landscape, at least 1920 px wide." value={p.hero} onChange={(v) => set('hero', v)} />
          </Card>
        </div>
      </div>
    </>
  )
}
