import { Link } from 'react-router-dom'
import { Page } from '../components/layout/Transitions'
import { Arrow } from '../components/ui/Icons'

export default function NotFound() {
  return (
    <Page className="container-x flex min-h-[100svh] flex-col items-start justify-center gap-8">
      <p className="label text-terra">Error 404</p>
      <h1 className="font-serif text-[var(--fs-h1)] leading-[0.9]">Page not found</h1>
      <Link to="/" className="label link-draw flex items-center gap-4">
        <Arrow direction="left" className="w-10" /> Back home
      </Link>
    </Page>
  )
}
