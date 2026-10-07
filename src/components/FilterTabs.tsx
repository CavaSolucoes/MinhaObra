export function FilterTabs({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return <div className="tabs">{options.map(o => <button key={o} className={`chip ${value === o ? 'on' : ''}`} onClick={() => onChange(o)}>{o}</button>)}</div>
}
