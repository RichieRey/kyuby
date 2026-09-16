import { useState } from 'react'
import Modal from './Modal'

export default function PayModal({ item, onConfirm, onClose }) {
  const [amount, setAmount] = useState(item.amount || 0)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  function handleSubmit(e) {
    e.preventDefault()
    onConfirm({ paidAmount: Number(amount) || 0, paidDate: date })
  }

  return (
    <Modal title={`Marcar "${item.name}" como pagado`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="item-form">
        <label>
          Monto pagado
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </label>
        <label>
          Fecha de pago
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="submit" className="btn-primary">
            Confirmar pago
          </button>
        </div>
      </form>
    </Modal>
  )
}
