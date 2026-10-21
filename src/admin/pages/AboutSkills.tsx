import { useCms } from '../store'
import { Card, Grid, LinesInput, PageHeader, Repeater, Slider, TextArea, TextInput } from '../ui'

export default function AboutSkills() {
  const { draft, update } = useCms()
  const { about, skills } = draft

  return (
    <>
      <PageHeader title="About & Skills" description="The two cards that float in below the wheel." />
      <div className="space-y-6">
        <Card title="About me" description="Dark card on the left.">
          <LinesInput
            label="Headline"
            hint="Two lines — the second one is shown in italic terracotta."
            value={about.title}
            onChange={(v) => update((d) => void (d.about.title = v))}
          />
          <Repeater<string>
            items={about.paragraphs}
            onChange={(v) => update((d) => void (d.about.paragraphs = v))}
            create={() => ''}
            addLabel="Add paragraph"
            itemLabel={(_, i) => (i === 0 ? 'Paragraph (large serif)' : 'Paragraph')}
            render={(text, set, i) => <TextArea label={i === 0 ? 'Lead paragraph' : 'Text'} rows={3} value={text} onChange={set} />}
          />
          <div>
            <p className="mb-3 text-xs font-semibold text-ink/80">Quick facts</p>
            <Repeater
              items={about.facts}
              onChange={(v) => update((d) => void (d.about.facts = v))}
              create={() => ({ label: 'Label', value: 'Value' })}
              addLabel="Add fact"
              itemLabel={(f) => f.label}
              render={(f, set) => (
                <Grid>
                  <TextInput label="Label" value={f.label} onChange={(v) => set({ ...f, label: v })} />
                  <TextInput label="Value" value={f.value} onChange={(v) => set({ ...f, value: v })} />
                </Grid>
              )}
            />
          </div>
        </Card>

        <Card title="Skills & Expertise" description="Light card on the right — each skill gets a terracotta bar.">
          <LinesInput label="Headline" hint="Two lines — the second one is shown in italic terracotta." value={skills.title} onChange={(v) => update((d) => void (d.skills.title = v))} />
          <Repeater
            items={skills.items}
            onChange={(v) => update((d) => void (d.skills.items = v))}
            create={() => ({ name: 'New skill', level: 75 })}
            addLabel="Add skill"
            itemLabel={(s) => `${s.name} — ${s.level}%`}
            render={(s, set) => (
              <Grid>
                <TextInput label="Skill" value={s.name} onChange={(v) => set({ ...s, name: v })} />
                <Slider label="Level" value={s.level} onChange={(v) => set({ ...s, level: v })} />
              </Grid>
            )}
          />
        </Card>
      </div>
    </>
  )
}
