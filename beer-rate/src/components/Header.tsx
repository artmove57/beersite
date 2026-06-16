import { useState } from 'react'

export type NavTarget = 'home' | 'top-rated' | 'breweries' | 'help'

interface HeaderProps {
  activeSection: NavTarget
  onNavigate: (target: NavTarget) => void
}

const links: Array<{ label: string; target: NavTarget }> = [
  { label: 'Home', target: 'home' },
  { label: 'Top Rated', target: 'top-rated' },
  { label: 'Breweries', target: 'breweries' },
  { label: 'Help', target: 'help' },
]

export function Header({ activeSection, onNavigate }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNavigate = (target: NavTarget) => {
    onNavigate(target)
    setMenuOpen(false)
  }

  return (
    <header className="header">
      <div className="header-inner">
        <a
          className="brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault()
            handleNavigate('home')
          }}
        >
          BeerRate
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          Menu
        </button>
        <nav id="main-nav" aria-label="Main navigation" data-open={menuOpen}>
          <ul className="nav-list">
            {links.map((link) => (
              <li key={link.target}>
                <a
                  className={activeSection === link.target ? 'active' : undefined}
                  href={`#${link.target}`}
                  onClick={(event) => {
                    event.preventDefault()
                    handleNavigate(link.target)
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
