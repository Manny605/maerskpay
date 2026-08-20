import { useState } from 'react'

export default function ColumnPicker({ columns, selected, onToggle }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button className="btn btn-sm" onClick={() => setOpen(o => !o)}>⚙ Colonnes</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border-hi rounded-lg p-2 w-[190px] shadow-lg">
            {columns.map(c => (
              <label key={c.key} className="flex items-center gap-2 px-2 py-[6px] text-xs text-t2 hover:bg-card-hover rounded cursor-pointer">
                <input type="checkbox" checked={selected.includes(c.key)} onChange={() => onToggle(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
