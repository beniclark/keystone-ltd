import { Link } from 'react-router-dom'
import { Globe, Mail, Rss, Share2 } from 'lucide-react'
import Logo from './Logo.jsx'

const columns = [
  {
    title: 'Products',
    links: [
      { label: 'Investments', to: '/services' },
      { label: 'Retirement', to: '/services' },
      { label: 'Insurance', to: '/services' },
      { label: 'Financial Planning', to: '/services' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', to: '/about' },
      { label: 'Leadership', to: '/about' },
      { label: 'Careers', to: '/about' },
      { label: 'Newsroom', to: '/about' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Retirement calculator', to: '/services' },
      { label: 'Market insights', to: '/services' },
      { label: 'Education center', to: '/services' },
      { label: 'Help center', to: '/about' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/about' },
      { label: 'Terms of use', to: '/about' },
      { label: 'Form CRS', to: '/about' },
      { label: 'Accessibility', to: '/about' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-navy-100/80">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-14 border-b border-white/10">
          <div className="md:col-span-4">
            <Logo dark />
            <p className="mt-5 text-sm leading-relaxed text-navy-100/70 max-w-sm">
              Keystone Financial helps 2.3 million people invest, protect, and retire with
              confidence. Advice that fits, investments that work, coverage that matters.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {[Globe, Mail, Rss, Share2].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:bg-white/10 hover:border-white/40 transition"
                  aria-label="social link"
                >
                  <Icon size={16} className="text-white" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-white text-sm font-semibold tracking-wide uppercase mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-navy-100/70 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-navy-100/50">
          <p>© 2026 Keystone Financial Group, Inc. All rights reserved.</p>
          <p className="max-w-3xl leading-relaxed">
            Securities offered through Keystone Brokerage Services, LLC, Member FINRA/SIPC.
            Insurance products issued by Keystone Life &amp; Annuity Co. Investment advisory
            services offered through Keystone Advisors, a registered investment adviser. Not FDIC
            insured. Not a deposit. May lose value.
          </p>
        </div>
      </div>
    </footer>
  )
}
