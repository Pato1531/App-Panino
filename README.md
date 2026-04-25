# Panino — Sistema de Gestión

App de control de stock para local gastronómico. Construida con Next.js 14 + Supabase.

## Módulos

- **Stock**: ingredientes, compras, ajustes rápidos, control parcial
- **Redes**: libretos de contenido para Instagram/TikTok

---

## Requisitos previos

- Node.js 18 o superior
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [GitHub](https://github.com) (para subir el repo)

---

## Instalación paso a paso

### 1. Crear el proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New Project**
2. Elegir nombre: `panino`, región: South America (São Paulo)
3. Esperar a que el proyecto se inicialice (~2 min)
4. Ir a **SQL Editor** → **New Query**
5. Pegar el contenido completo de `supabase/schema.sql`
6. Click **Run** — debería mostrar "Success"

### 2. Obtener las credenciales de Supabase

1. En el dashboard de tu proyecto: **Settings** → **API**
2. Copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local` con los valores copiados:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Instalar dependencias y correr

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Subir a GitHub

```bash
# Desde la carpeta del proyecto
git init
git add .
git commit -m "Initial commit — Panino app"

# Crear repo en GitHub (github.com → New repository → panino)
git remote add origin https://github.com/TU_USUARIO/panino.git
git branch -M main
git push -u origin main
```

**IMPORTANTE**: El archivo `.env.local` está en `.gitignore` y NO se sube a GitHub. Las credenciales quedan solo en tu máquina.

---

## Deploy en Vercel (opcional, para acceso desde el celular)

1. Ir a [vercel.com](https://vercel.com) → **New Project**
2. Importar el repo de GitHub
3. En **Environment Variables**, agregar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy** — en 2 minutos tenés una URL pública

---

## Estructura del proyecto

```
panino/
├── app/
│   ├── layout.tsx          # Navegación principal
│   ├── page.tsx            # Redirige a /stock
│   ├── stock/
│   │   └── page.tsx        # Dashboard de stock
│   └── social/
│       └── page.tsx        # Libretos de redes
├── components/
│   ├── ui/
│   │   ├── Modal.tsx       # Modal genérico
│   │   └── Toast.tsx       # Notificaciones
│   └── stock/
│       ├── IngredientCard.tsx
│       ├── PurchaseModal.tsx
│       ├── AdjustModal.tsx
│       ├── CheckModal.tsx
│       └── AddIngredientModal.tsx
├── lib/
│   ├── supabase.ts         # Cliente Supabase
│   ├── types.ts            # Tipos TypeScript
│   ├── stock-api.ts        # Operaciones de stock
│   ├── social-content.ts   # Libretos (del archivo HTML)
│   └── utils.ts            # Formateo de números y fechas
├── styles/
│   └── globals.css
├── supabase/
│   └── schema.sql          # Base de datos completa
├── .env.local.example      # Template de variables
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Flujo de datos

```
Compra → INSERT purchases → trigger SQL → stock_current actualizado
Ajuste → INSERT stock_adjustments → trigger SQL → stock_current actualizado  
Control → stock_check guardado → botón ajustar → fn_apply_stock_check() → stock corregido
```

El stock se actualiza solo mediante triggers en PostgreSQL. El frontend no hace cálculos de stock — solo lee y escribe.

---

## Tecnologías

- [Next.js 14](https://nextjs.org) — App Router
- [Supabase](https://supabase.com) — Base de datos + Auth + Real-time
- [Tailwind CSS](https://tailwindcss.com) — Estilos
- [TypeScript](https://www.typescriptlang.org) — Tipado
