export const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(n)

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export const fmtDateShort = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
