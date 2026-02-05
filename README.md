# Screna AI - Interview Preparation Platform

A React + TypeScript + Vite application for AI-powered interview preparation.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development

1. Clone the repository
```bash
git clone <repository-url>
cd moyi-screna-web-candidate
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp env.example .env
```

Edit `.env` and set your API URL:
```
VITE_API_URL=http://localhost:3000/api
```

4. Start development server
```bash
npm run dev
```

## 📦 Deployment

This project is configured for dual Vercel deployments:
- **Staging**: Deploys from `staging` branch
- **Production**: Deploys from `master` branch

For detailed deployment instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### Build Information Display

In the staging environment, a build version indicator appears in the bottom-right corner of all pages:
- Format: `build-{git-hash}`
- Example: `build-a1b2c3d`
- Only visible in staging (determined by `VITE_API_URL`)
- Helps identify deployed version for debugging

For more details, see [BUILD_INFO.md](./BUILD_INFO.md)

### Quick Deployment Guide

#### Staging Environment
- Branch: `staging`
- Set in Vercel: `VITE_API_URL=http://api-staging/api/v1`

#### Production Environment
- Branch: `master`
- Set in Vercel: `VITE_API_URL=<your-production-api-url>`

## 🛠️ Tech Stack

- React 19
- TypeScript
- Vite
- TailwindCSS
- Radix UI Components
- React Router
- Axios
- LiveKit (for video interviews)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
