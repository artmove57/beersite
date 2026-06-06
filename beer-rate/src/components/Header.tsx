const links = ['Blog', 'Top Rated', 'Breweries', 'Help', 'Login', 'Sign Up']

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <a className="brand" href="#">BeerRate</a>
        <nav aria-label="Main navigation">
          <ul className="nav-list">
            {links.map((link) => (
              <li key={link}>
                <a href="#">{link}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
