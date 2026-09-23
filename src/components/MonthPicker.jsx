import { useState } from 'react'
import { MONTHS } from '../lib/supabase'

const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3))

export default function MonthPicker({ month, year, onSelect }) {
  const [open, setOpen]         = useState(false)
  const [viewYear, setViewYear] = useState(year)
  const now = new Date()

  function openPicker() {
    setViewYear(year)
    setOpen(true)
  }

  function pick(m) {
    onSelect(m, viewYear)
    setOpen(false)
  }

  function jumpToday() {
    onSelect(now.getMonth(), now.getFullYear())
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="font-display text-xl font-semibold text-heading min-w-[130px] sm:min-w-[160px] text-center
                   px-2 py-1 rounded-lg hover:bg-card-hover transition-colors"
      >
        {MONTHS[month]} {year}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 bg-surface border border-border-hi rounded-xl p-3 w-[240px] shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <button type="button" className="btn btn-sm" onClick={() => setViewYear(y => y - 1)}>←</button>
              <span className="text-xs font-semibold text-text">{viewYear}</span>
              <button type="button" className="btn btn-sm" onClick={() => setViewYear(y => y + 1)}>→</button>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {MONTHS_SHORT.map((m, i) => {
                const isSelected = i === month && viewYear === year
                const isToday    = i === now.getMonth() && viewYear === now.getFullYear()
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pick(i)}
                    className={`relative text-[11px] px-1 py-[6px] rounded-lg transition-colors ${
                      isSelected ? 'bg-brand text-navy font-semibold' : 'text-t2 hover:bg-card-hover'
                    }`}
                  >
                    {m}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                    )}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={jumpToday}
              className="w-full text-[11px] text-accent hover:underline py-1"
            >
              Aujourd'hui
            </button>
          </div>
        </>
      )}
    </div>
  )
}
