import { useState } from 'react'
import Modal from './Modal'
import { CATEGORIES } from '../lib/billing'

const empty = { name: '', category: 'servicio', amount: '', dueDay: '5', notes: '' }

export default function ItemFormModal({ initial, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(initial ? { ...initial } : empty)
  const isEdit = Boolean(initial)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    const dueDay = Math.min(31, Math.max(1, Number(form.dueDay) || 1))
    onSave({
      name: form.name.trim(),
      category: form.category,
      amount: Number(form.amount) || 0,
      dueDay,
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
            placeholder="Ej. Energía, Netflix..."
            autoFocus
            required
          />
        </label>

        <label>
          Categoría
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {Object.entries(CATEGORIES).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>

        <div className="form-row">
          <label>
            Monto aproximado
            <input
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Día de vencimiento
            <input
              type="number"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={(e) => set('dueDay', e.target.value)}
              required
            />
          </label>
        </div>

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
