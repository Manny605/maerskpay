// Contrôles de tri explicites (en plus du clic sur les en-têtes de colonnes),
// utilisés pour préparer l'ordre des lignes avant export CSV/PDF.
export default function SortControls({
  fields,
  sortField, sortDir, onFieldChange, onDirToggle,
  sortField2, sortDir2, onField2Change, onDir2Toggle,
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[11px] text-t3">Trier :</span>
      <select className="field-input w-auto" value={sortField} onChange={e => onFieldChange(e.target.value)}>
        {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
      <button type="button" className="btn btn-sm" onClick={onDirToggle} title="Inverser l'ordre">
        {sortDir === 'asc' ? '▲' : '▼'}
      </button>

      <span className="text-[11px] text-t3 ml-1">puis :</span>
      <select className="field-input w-auto" value={sortField2 || ''} onChange={e => onField2Change(e.target.value || null)}>
        <option value="">—</option>
        {fields.filter(f => f.key !== sortField).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
      {sortField2 && (
        <button type="button" className="btn btn-sm" onClick={onDir2Toggle} title="Inverser l'ordre secondaire">
          {sortDir2 === 'asc' ? '▲' : '▼'}
        </button>
      )}
    </div>
  )
}
