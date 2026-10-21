import { useCms } from '../store'
import { Card, Grid, LinesInput, MediaInput, PageHeader, TextArea, TextInput } from '../ui'

export default function General() {
  const { draft, update } = useCms()
  const { site, work, showreel, footer } = draft

  return (
    <>
      <PageHeader title="General" description="Texts that appear across the landing page." />
      <div className="space-y-6">
        <Card title="Landing page">
          <Grid>
            <TextInput label="Role" hint="Top-left caption on the landing page." value={site.role} onChange={(v) => update((d) => void (d.site.role = v))} />
            <TextInput label="Menu wordmark" hint="Top-left of the navigation." value={site.navTitle} onChange={(v) => update((d) => void (d.site.navTitle = v))} />
          </Grid>
          <LinesInput label="Wheel title" hint="Inside the circle under the wheel — two lines, the second in italic." value={work.title} onChange={(v) => update((d) => void (d.work.title = v))} />
        </Card>

        <Card title="Entry screen" description="The lettering visitors uncover with the ink before entering.">
          <Grid>
            <LinesInput label="Wide screens" value={site.introEnter.wide} onChange={(v) => update((d) => void (d.site.introEnter.wide = v))} />
            <LinesInput label="Phones (portrait)" value={site.introEnter.narrow} onChange={(v) => update((d) => void (d.site.introEnter.narrow = v))} />
          </Grid>
        </Card>

        <Card title="Showreel">
          <Grid>
            <LinesInput label="Headline" value={showreel.title} onChange={(v) => update((d) => void (d.showreel.title = v))} />
            <TextInput label="Year" value={showreel.year} onChange={(v) => update((d) => void (d.showreel.year = v))} />
          </Grid>
          <Grid>
            <MediaInput label="Video" hint="MP4, landscape. Plays muted until the visitor unmutes it." accept="video" value={showreel.src} onChange={(v) => update((d) => void (d.showreel.src = v))} />
            <MediaInput label="Poster image" hint="Shown before the video loads." value={showreel.poster} onChange={(v) => update((d) => void (d.showreel.poster = v))} />
          </Grid>
        </Card>

        <Card title="Footer">
          <Grid>
            <TextInput label="Headline" value={footer.headline.lead} onChange={(v) => update((d) => void (d.footer.headline.lead = v))} />
            <TextInput label="Headline accent" hint="Second line, in italic terracotta." value={footer.headline.accent} onChange={(v) => update((d) => void (d.footer.headline.accent = v))} />
          </Grid>
          <TextArea label="Text under the headline" rows={2} value={footer.sub} onChange={(v) => update((d) => void (d.footer.sub = v))} />
        </Card>
      </div>
    </>
  )
}
