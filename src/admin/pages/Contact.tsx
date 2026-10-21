import { useCms } from '../store'
import { Card, Grid, PageHeader, Repeater, Select, TextInput } from '../ui'

export default function Contact() {
  const { draft, update } = useCms()
  const c = draft.contact

  return (
    <>
      <PageHeader title="Contact" description="Shown in the footer of every page and in the menu." />
      <div className="space-y-6">
        <Card title="Details">
          <Grid>
            <TextInput label="Email" type="email" value={c.email} onChange={(v) => update((d) => void (d.contact.email = v))} />
            <TextInput label="Phone" type="tel" hint="Write it as it should appear, e.g. +41 79 123 45 67." value={c.phone} onChange={(v) => update((d) => void (d.contact.phone = v))} />
          </Grid>
          <TextInput label="Location" value={c.location} onChange={(v) => update((d) => void (d.contact.location = v))} />
        </Card>

        <Card title="Social profiles" description="LinkedIn and Instagram get their matching icon.">
          <Repeater
            items={c.socials}
            onChange={(v) => update((d) => void (d.contact.socials = v))}
            create={() => ({ label: 'Instagram', handle: '@', href: 'https://www.instagram.com/' })}
            addLabel="Add profile"
            itemLabel={(s) => s.label}
            render={(s, set) => (
              <div className="space-y-4">
                <Grid>
                  <Select
                    label="Network"
                    value={s.label}
                    onChange={(v) => set({ ...s, label: v })}
                    options={[
                      { value: 'LinkedIn', label: 'LinkedIn' },
                      { value: 'Instagram', label: 'Instagram' },
                    ]}
                  />
                  <TextInput label="Shown as" value={s.handle} onChange={(v) => set({ ...s, handle: v })} placeholder="@yourname" />
                </Grid>
                <TextInput label="Link" type="url" value={s.href} onChange={(v) => set({ ...s, href: v })} placeholder="https://…" />
              </div>
            )}
          />
        </Card>
      </div>
    </>
  )
}
