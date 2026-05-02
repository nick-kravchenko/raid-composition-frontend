# Raid Composition Frontend

Angular 21 frontend for building and managing raid compositions.

## Stack

- **Angular 21** with SSR (`@angular/ssr`)
- **TypeScript 5.9**
- **Vitest** for unit tests
- **Prettier** for formatting

## Development

```bash
npm start        # dev server at http://localhost:4200
npm run build    # production build → dist/
npm test         # run unit tests with Vitest
```

SSR server (after build):

```bash
npm run serve:ssr:raid-composition-frontend
```

## Project Structure

```
src/
├── app/
│   ├── layout/          # shell layout with header/footer
│   └── pages/
│       ├── home/        # landing page
│       └── style-demo/  # component/style showcase
├── assets/
└── styles/              # global SCSS
```

## Code Generation

```bash
ng generate component component-name
ng generate --help       # full list of schematics
```