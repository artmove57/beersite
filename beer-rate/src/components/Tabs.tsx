type TabKey = 'beers' | 'breweries'

interface TabsProps {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

export function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Content sections">
      <button
        className={activeTab === 'beers' ? 'tab active' : 'tab'}
        type="button"
        role="tab"
        aria-selected={activeTab === 'beers'}
        onClick={() => onChange('beers')}
      >
        Top Beers
      </button>
    </div>
  )
}
