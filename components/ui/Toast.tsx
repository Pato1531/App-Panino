'use client'
import { useState, useCallback } from 'react'

interface Toast { id: number; message: string; type: 'success' | 'error' }
let toastFn: ((msg: string, type?: 'success' | 'error') => void) | null = null

export function showToast(msg: string, type: 'success' | 'error' = 'success') { toastFn?.(msg, type) }

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const add = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message: msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }, [])
  toastFn = add
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg text-white ${t.type === 'success' ? 'bg-gray-900' : 'bg-red-500'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
