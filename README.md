# Raid Composition Frontend

Angular 21 frontend for building and managing raid compositions.

## Authentication

The frontend talks to the backend at `http://localhost:8000/api/v1` during local development.

- Click `Login with Discord` in the header to start OAuth.
- Discord returns to `/auth/discord/callback`.
- After sign-in, the header shows the Discord profile and exposes a logout action in the user menu.
- Session and OAuth requests use browser credentials so the backend can manage cookie-backed auth.

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

## Guild Management

Authenticated users can create and manage guilds.

### Routes

| Route | Description |
| --- | --- |
| `/guilds` | List guilds the current user belongs to; inline create form |
| `/guilds/:id` | Guild detail — metadata, invite link, member list with promotion |
| `/guild-invites/:code` | Auto-accept an invite and join a guild as applicant |

### Roles

| Role | Permissions |
| --- | --- |
| `admin` | Create invites, promote applicants to raider or officer, update/delete guild |
| `officer` | View guild and member list |
| `raider` | View guild and member list |
| `applicant` | View guild |

### Create a guild

`POST /api/v1/guilds` — requires authentication. Fields: `name`, `realm`, `region` (`us`/`eu`/`kr`/`tw`/`cn`), `faction` (`alliance`/`horde`), `game_version` (`classic1x`/`classic`/`classicann`).

### Invite flow

1. Admin clicks **Generate Invite** on the guild detail page — calls `POST /api/v1/guilds/:id/invites`.
2. The full invite URL is displayed and can be shared.
3. Recipient visits the URL (`/guild-invites/:code`) while authenticated — auto-accepted as applicant.

### Member promotion

Admin sees **Promote to Raider** / **Promote to Officer** buttons next to each applicant. Calls `PATCH /api/v1/guilds/:id/members/:user_id`.

## Project Structure

```
src/
├── app/
│   ├── guild.models.ts      # shared guild interfaces and union types
│   ├── guild.service.ts     # guild API client (GuildService)
│   ├── csrf.interceptor.ts  # attaches X-CSRF-Token to mutating requests
│   ├── guilds/              # /guilds and /guilds/:id components
│   ├── guild-invites/       # /guild-invites/:code accept component
│   ├── layout/              # shell layout with header/footer
│   └── pages/
│       ├── home/            # landing page
│       └── style-demo/      # component/style showcase
├── assets/
└── styles/                  # global SCSS
```

## Code Generation

```bash
ng generate component component-name
ng generate --help       # full list of schematics
```
