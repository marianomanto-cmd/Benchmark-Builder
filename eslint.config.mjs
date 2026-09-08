import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// eslint-config-next 16 ya exporta flat config: no hace falta FlatCompat.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // `.claude/` son skills del equipo, no código de la app.
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'public/**', '.claude/**'],
  },
]

export default eslintConfig
