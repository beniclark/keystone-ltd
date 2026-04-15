import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

export default function Layout() {
  const { pathname } = useLocation()
  const mainRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand-emerald focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
