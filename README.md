### init project (public project)

```sh
pnpm create next-app@latest kbase --typescript --tailwind --eslint

git config --local commit.gpgsign false
git config --local user.email hareeshbabu82ns@gmail.com
```

```sh
pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add -a
```

```sh
npm i prisma -D

npm i next-auth @auth/core @prisma/client @auth/prisma-adapter
npm i @t3-oss/env-nextjs
npm i zod react-hook-form resend zustand
```

- Add Environment Variables to your `.env` can use `.env.sample` for ref
- google auth https://console.cloud.google.com/apis/credentials
- github auth https://github.com/settings/apps

- optional, if running local db

```sh
docker compose up -d
```

```sh
npm run db:gen # generates prisma client
npm run db:migrate # not valid for mongodb
npm run db:studio # opens db explorer

npm run dev:emails # email template designer

npm run dev
```

- Config Ref: https://github.com/Blazity/next-enterprise
- UI Ref
  - [shadcn-nextjs-boilerplate](https://github.com/horizon-ui/shadcn-nextjs-boilerplate)
  - [flowbite](https://flowbite.com/docs/components/pagination/)
  - [React Icons](https://react-icons.github.io/react-icons/search/#q=)

## Init SpecKit

```sh
# install UV package manager for python
curl -LsSf https://astral.sh/uv/install.sh | sh

vi ~/.bashrc
export PATH=$HOME/.local/bin:$PATH

# install spec kit
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# init kit
specify init --here --ai copilot
```

- sequence
  - /speckit.constitution - per project with essentials base rules
  - /speckit.specify - per functional requirement/functionality/feature
  - /speckit.clarify - optional - clarify or elaborate spec
  - /speckit.plan - to create technical requirements
  - /speckit.tasks - to create technical tasks
  - /speckit.analyze - optional - validate for consistency of tasks before implement
  - /speckit.implement - implement all tasks

## Icon Generation

- tool: https://icon.kitchen
- source image: `app-icon-original-512x512.png`
- Settings:
  - Icons Set: Web Icons
  - Scaling: Center
  - Mast: True
  - Color: #B4DBD4
  - Effect: Cast shadow
  - Padding: 15%
  - Bg Type: Gradient
  - Gradient: #497A6E, #36574E, 45deg
  - fav icon: Circle

### commit with tags

```sh
git add .
git commit -m "update instructions"
git push origin main

# push single tag
git tag -a v1.0.0 -m "tag instructions"
git push origin v1.0.0

# push multiple tags
git tag -a v1.0.0 -m "tag instructions"
git tag -a v1 -m "tag instructions"
git push origin --tags

pnpm run release:patch # pushes to origin and tags together
```

### mount path

```sh
docker ps
# instance id for 'coder-rrrrr-ws-test' is coder-xxxxxxx
docker inspect coder-rrrrr-ws-test

# go to mount folder
cd /_data/dev/home-hub/data
mkdir mnt_books

mount -t cifs //xxxxd.10/books /_data/books -o username=rrrrr,password=<XXX>,rw,vers=2.1

mount -t cifs //xxxxd.10/books /_data/books -o username=rrrrr,password=<XXX>,rw,vers=2.1

umount /_data/dev/home-hub/data/mnt_books

```

### TODOs

- TODO remove extra fetching of relation data from readEntity as relations are fetched using IDs in the edit mode
