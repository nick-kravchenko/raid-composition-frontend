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

## Docker

Docker images use Node 24 (`node:24-slim`). Runtime configuration is read from `.env`.

Create local environment values from the example file:

```bash
cp .env.example .env
```

Production SSR server:

```bash
docker compose up app --build
```

The production service is available at `http://localhost:4000` by default. Change `APP_HOST_PORT` and `APP_CONTAINER_PORT` in `.env` if you need a different port. `APP_ALLOWED_HOSTS` is passed to Angular SSR as `NG_ALLOWED_HOSTS`.

Development server with Compose Watch:

```bash
docker compose up --watch app-dev --build
```

The development service is available at `http://localhost:4200` by default. Compose Watch syncs source changes into `/app` and ignores `node_modules/`, `dist/`, `.angular/`, and `.git/`. If dependencies change, rebuild the dev image.

Stop containers:

```bash
docker compose down
```

### Environment Variables

| Variable             | Default               | Purpose                                                         |
| -------------------- | --------------------- | --------------------------------------------------------------- |
| `APP_PROTOCOL`       | `http`                | Public protocol metadata for the app container.                 |
| `APP_DOMAIN`         | `localhost`           | Public domain metadata for the production app container.        |
| `APP_NODE_ENV`       | `production`          | `NODE_ENV` value for the production app container.              |
| `APP_HOST_PORT`      | `4000`                | Host port mapped to the production container.                   |
| `APP_CONTAINER_PORT` | `4000`                | Port the SSR server listens on inside the production container. |
| `APP_ALLOWED_HOSTS`  | `localhost,127.0.0.1` | Angular SSR allowed hosts.                                      |
| `DEV_DOMAIN`         | `localhost`           | Public domain metadata for the dev container.                   |
| `DEV_HOST_PORT`      | `4200`                | Host port mapped to the dev container.                          |
| `DEV_CONTAINER_PORT` | `4200`                | Port Angular dev server listens on inside the dev container.    |
| `DEV_POLL_INTERVAL`  | `500`                 | File-watch polling interval in milliseconds.                    |

## CI/CD

Docker image publishing is handled by `.github/workflows/docker.yml`.

The workflow runs on:

- pushes to `main`
- pull requests targeting `main`
- published GitHub releases

Before building the Docker image, CI runs:

```bash
npm ci
npm test -- --watch=false
npm run build
```

Images are built for `linux/amd64` and published to:

- Docker Hub: `docker.io/<DOCKERHUB_USERNAME>/raid-composition-frontend`
- GHCR: `ghcr.io/<owner>/raid-composition-frontend`

Required repository secrets:

| Secret               | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub namespace and login username.                   |
| `DOCKERHUB_TOKEN`    | Docker Hub access token for publishing and PR tag cleanup. |

GHCR publishing uses the built-in `GITHUB_TOKEN`.

Published tags:

| Event                                  | Tags                                  |
| -------------------------------------- | ------------------------------------- |
| `push` to `main`                       | `latest`, `edge-main`, `sha-<commit>` |
| same-repository pull request           | `pr-<number>`                         |
| published release `vMAJOR.MINOR.PATCH` | `<version>`, `<major>.<minor>`        |

When a same-repository pull request is closed, the workflow removes the matching `pr-<number>` tag from Docker Hub and GHCR. Docker Scout reports high vulnerabilities and fails the workflow on critical vulnerabilities after publishing.

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
