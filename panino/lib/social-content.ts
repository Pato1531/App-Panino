import type { ContentScript } from './types'

// ============================================================
// LIBRETOS DE REDES SOCIALES — PANINO
// Extraídos de libretos_redes_panino.html
// ============================================================

export const CONTENT_SCRIPTS: ContentScript[] = [
  {
    id: 'formato-1',
    format: 'hook',
    title: '¿Sabías que hay una lomitería en [nombre del barrio]?',
    duration: '30 seg',
    scheduled_day: 'viernes',
    script: `[Cámara desde afuera del local, vos hablando a cámara]

"Si vivís en [barrio] y todavía no nos conocés, te estás perdiendo el mejor lomito del barrio. Somos Panino, estamos en [calle], abrimos todos los días al mediodía y a la noche. Pasá a conocernos o pedí por PedidosYa. Te esperamos."`,
    tip: 'La gente del barrio reacciona cuando escucha el nombre de su zona. Altísimo share orgánico entre vecinos.',
  },
  {
    id: 'formato-2',
    format: 'detras',
    title: 'Así se hace el lomito de Panino',
    duration: '45 seg',
    scheduled_day: 'lunes',
    script: `[Plano sobre la plancha, sin hablar, solo el sonido de la carne]

[Voz en off o texto en pantalla]: "5 de la tarde. Empieza la preparación."

[Plano de la carne fileteada, el pan, los ingredientes]

[Plano del lomito armado]

[Texto final]: "Todos los días, desde las [horario]. Panino, [barrio]."`,
    tip: 'No necesitás hablar. El sonido de la plancha hace todo el trabajo. Este formato tiene altísima retención en reels.',
  },
  {
    id: 'formato-3',
    format: 'social',
    title: 'Le preguntamos a nuestros clientes',
    duration: '30 seg',
    scheduled_day: 'viernes',
    script: `[Cuando venga un cliente habitual, pedirle permiso y grabar 15 segundos]

Pregunta única: "¿Qué es lo que más te gusta del lomito de Panino?"

[Dejar que responda naturalmente, sin editar demasiado]

[Texto final con logo y dirección]`,
    tip: 'Un vecino recomendando a otro vecino vale más que cualquier publicidad paga. Un solo video de este tipo bien ejecutado puede traer 10 clientes nuevos del barrio.',
  },
  {
    id: 'formato-4',
    format: 'producto',
    title: 'El lomito que no para de pedir la gente',
    duration: '20 seg',
    scheduled_day: 'miercoles',
    script: `[Primer plano del lomito más vendido siendo armado]

[Texto en pantalla mientras se arma]: "El más pedido. Todos. Los. Días."

[Plano final del producto terminado]

[Texto]: "¿Ya lo probaste? Panino, [barrio]. PedidosYa / al paso."`,
    tip: 'Usar el producto más vendido genera validación social ("si todos lo piden, debe ser bueno"). Nombrarlo como "el más pedido" sin dar números igual funciona.',
  },
]

export const CALENDAR = [
  { day: 'Lunes', content: 'Detrás del mostrador (preparación del día)', format: 'detras' as const },
  { day: 'Miércoles', content: 'Producto estrella o promoción de la semana', format: 'producto' as const },
  { day: 'Viernes', content: 'Hook de barrio o testimonio de cliente', format: 'hook' as const },
]

export const FORMAT_META = {
  hook: {
    label: 'Hook fuerte',
    badgeClass: 'badge-hook',
    color: '#3C3489',
    bg: '#EEEDFE',
    description: 'Gancho de barrio',
  },
  detras: {
    label: 'Detrás de escena',
    badgeClass: 'badge-detras',
    color: '#085041',
    bg: '#E1F5EE',
    description: 'Proceso y cocina',
  },
  social: {
    label: 'Prueba social',
    badgeClass: 'badge-social',
    color: '#633806',
    bg: '#FAEEDA',
    description: 'Testimonios de clientes',
  },
  producto: {
    label: 'Producto',
    badgeClass: 'badge-producto',
    color: '#712B13',
    bg: '#FAECE7',
    description: 'El producto estrella',
  },
} as const
