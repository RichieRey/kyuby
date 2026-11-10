import { useState } from 'react'
import Modal from './Modal'
import { CATEGORIES, PERIODICIDADES, PROVEEDORES_SUGERIDOS, toISODate } from '../lib/billing'

function emptyForm() {
  return {
    name: '',
    tipo: 'servicio',
    proveedor: '',
    amount: '',
    periodicidad: 'mensual',
    vencimiento: toISODate(new Date()),
    notes: '',
  }
}

export default function ItemFormModal({ initial, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => (initial ? { ...emptyForm(), ...initial } : emptyForm()))
  const isEdit = Boolean(initial)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.vencimiento) return
    onSave({
      name: form.name.trim(),
      tipo: form.tipo,
      proveedor: form.proveedor.trim(),
      amount: Number(form.amount) || 0,
      periodicidad: form.periodicidad,
      vencimiento: form.vencimiento,
      notes: form.notes?.trim() || '',
      active: true,
    })
  }

  return (
    <Modal title={isEdit ? 'Editar' : 'Agregar servicio o suscripción'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="item-form">
        <label>
          Nombre
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej. Gas, Netflix, Arriendo..."
            autoFocus
            required
          />
        </label>

        <div className="form-row">
          <label>
            Tipo
            <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {Object.entries(CATEGORIES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Proveedor
            <input
              type="text"
              list="proveedores-sugeridos"
              value={form.proveedor}
              onChange={(e) => set('proveedor', e.target.value)}
              placeholder="Ej. Vanti"
            />
            <datalist id="proveedores-sugeridos">
              {PROVEEDORES_SUGERIDOS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="form-row">
          <label>
            Valor aproximado
            <input
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Se paga
            <select value={form.periodicidad} onChange={(e) => set('periodicidad', e.target.value)}>
              {Object.entries(PERIODICIDADES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Próximo vencimiento
          <input
            type="date"
            value={form.vencimiento}
            onChange={(e) => set('vencimiento', e.target.value)}
            required
          />
          <span className="field-hint">
            Las fechas siguientes se calculan según cada cuánto se paga.
          </span>
        </label>

        <label>
          Notas (opcional)
          <input
            type="text"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Número de cuenta, referencia..."
          />
        </label>

        <div className="modal-actions">
          {isEdit && (
            <button
              type="button"
              className="btn-danger-outline"
              onClick={() => onDelete(initial.id)}
            >
              Eliminar
            </button>
          )}
          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}
