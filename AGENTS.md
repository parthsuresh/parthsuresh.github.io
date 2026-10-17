# Agent Guidelines for al-folio (v1.x)

**This file is the authoritative entry point for coding agents working in this repo.** Read it before making any change. It is intentionally short and tool-neutral; it links to the one place each longer-form fact lives.

`al-folio` v1.x is a **thin Jekyll starter, not a theme**. This repo owns starter wiring, example content, docs, and cross-plugin tests. All runtime — layouts, includes, Sass, Liquid tags, filters, feature JS — lives in versioned gems published under [`al-org-dev`](https://github.com/al-org-dev).

## This personal site

This checkout is https://parthsuresh.com, not the al-folio demo. When a template rule below disagrees with this section, follow this section.

`_config.yml` `baseurl` is empty. `bundle exec jekyll build` is the production-shaped command. Do not pass `--baseurl /al-folio`. The dev server is http://127.0.0.1:4000/.

Publications live in `_bibliography/papers.bib`. News items live in `_news/*.md` with `inline: true`. Role facts live in `_data/experience.yml` and must use the same words as the about-page prose. Do not generate that prose from the YAML. `_posts/`, `_projects/`, `_books/`, and `_teachings/` stay excluded. `_news/` is published. Do not exclude it.

The homepage navbar label is `_pages/about.md` `title`. That title stays `about`.

The only committed theme overrides are `_layouts/about.liquid` and `_sass/_themes.scss`. Do not add `_includes`, `_scripts`, `assets/tailwind`, `tailwind.config.js`, `assets/webfonts`, or another file under `_layouts` or `_sass`.

| Rule                                                                    | Enforced by                                                                                                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Venue text does not repeat `year`                                       | `bundle exec ruby bin/check_site_content.rb`                                                                                                      |
| Homepage `title` is `about`                                             | same checker                                                                                                                                      |
| News uses a hyphen, `inline: true`, and arXiv ids that exist in the bib | same checker                                                                                                                                      |
| Role strings match the about prose                                      | same checker, reading `_data/experience.yml`                                                                                                      |
| `baseurl` stays empty and demo collections stay excluded                | same checker                                                                                                                                      |
| No extra theme override                                                 | same checker                                                                                                                                      |
| Production build succeeds and local links resolve                       | `.github/workflows/site-check.yml` and `bin/check_local_links.rb`                                                                                 |
| Do not require the bib year to equal the Scholar snapshot               | No check. CRAG-MM is 2026 in the bib and 2025 in `_data/citations.yml` on purpose. The weekly sync still compares Scholar for real venue mistakes |

To prove a page in the browser's place, follow `.cursor/skills/verify-parthsuresh/SKILL.md`. The plan for these checks is [`docs/agent-friendly-plan.md`](docs/agent-friendly-plan.md).

## Route your change

Find your change on the left; edit only what is on the right.

| Your change                                                                                                              | Goes in                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Dependency pin, plugin activation, feature flag                                                                          | this repo: `Gemfile` **and** `_config.yml` (both — see below)                                                 |
| Example/demo content, bibliography, data files                                                                           | this repo: `_pages`, `_posts`, `_projects`, `_news`, `_teachings`, `_books`, `_data`                          |
| Documentation                                                                                                            | this repo: `docs/` (long-form) or this file (agent rules)                                                     |
| Cross-plugin integration test, visual parity test                                                                        | this repo: `test/integration_*.sh`, `test/visual/`                                                            |
| Plugin catalog metadata                                                                                                  | this repo: `_data/featured_plugins.yml`                                                                       |
| A layout, include, or Sass partial                                                                                       | the owning gem — start with `al_folio_core`                                                                   |
| A Liquid tag or filter, or what a tag renders                                                                            | the gem that registers it — see the [delegation table](docs/ARCHITECTURE.md#wrapper-to-tag-to-gem-delegation) |
| Feature behavior (search, math, charts, comments, cookies, icons, CV, distill, analytics, images, newsletter, citations) | that feature's gem — see [`docs/BOUNDARIES.md`](docs/BOUNDARIES.md)                                           |
| Component/unit test for gem-owned behavior                                                                               | the owning gem, not here                                                                                      |
| A feature with no existing owner                                                                                         | open a plugin proposal issue first, then a standalone plugin repo                                             |

[`docs/BOUNDARIES.md`](docs/BOUNDARIES.md) is the authoritative area-to-gem table. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) explains how the pieces connect.

## Stop sign

**If your change would create any of these paths in this repo, it belongs in a gem instead:**

```
_layouts/   _includes/   _sass/   _scripts/   assets/tailwind/   tailwind.config.js   assets/webfonts/
```

`npm run lint:style-contract` fails CI when any of them exists here, and it also rejects `build:css` / `build:tailwind` npm scripts. Do not add a starter-local Tailwind or CSS build pipeline.

This restriction applies to **this repo only**. A user's own site created from this template _may_ legally shadow gem-owned files — see [local overrides: your site vs. this repo](docs/ARCHITECTURE.md#local-overrides-your-site-vs-this-repo).

## Three failures that produce no error message

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#failure-modes-that-produce-no-error-message) for the full explanation. The short version:

1. **Features fail silently.** A feature renders only when its gem is loaded _and_ its flag is on _and_ the page opts in. Otherwise the Liquid tag emits an empty string — no warning, no error.
2. **`Gemfile` and `_config.yml` are two lists that must agree.** A plugin in only one of them is inert. Adding or removing a plugin means editing both. Repo dirs use hyphens (`al-folio-core`); gem/plugin ids use underscores (`al_folio_core`).
3. **This site's `baseurl` is empty.** See [This personal site](#this-personal-site). Passing `--baseurl /al-folio` prefixes every URL and breaks https://parthsuresh.com/.

## Validated local command set

Run from the repo root, in this order:

```bash
bundle install
npm ci
npm run lint:prettier
npm run lint:style-contract
JEKYLL_ENV=production bundle exec jekyll build
bash test/integration_comments.sh
bash test/integration_plugin_toggles.sh
bash test/integration_distill.sh
bash test/integration_bootstrap_compat.sh
bash test/integration_upgrade_cli.sh
bash test/integration_css_minify.sh
bash test/integration_new_plugins.sh
npx playwright install chromium webkit
npm run test:visual
bundle exec al-folio upgrade audit
bundle exec al-folio upgrade overrides audit
bundle exec al-folio upgrade report
docker compose up -d
curl -fsS http://127.0.0.1:8080/al-folio/ >/dev/null
docker compose logs --tail=80
docker compose down
```

On this personal site, do not treat that block as the gate. `npm run lint:style-contract` fails because `_layouts/about.liquid` and `_sass/_themes.scss` are committed overrides. `comments`, `distill`, and `new_plugins` fail because demo posts are excluded. `unit-tests.yml` does not run here. Use the checks in [This personal site](#this-personal-site). The docker URL in the block is the template path. This site's `baseurl` is empty, so a local server is http://127.0.0.1:4000/.

## Before you open a PR

- Keep starter work here; route runtime behavior to the owning plugin repo.
- Run `npm run lint:prettier` (Prettier with `@shopify/prettier-plugin-liquid`, `printWidth: 150`). `npx prettier . --write` fixes formatting.
- Keep docs aligned with v1 ownership, and keep each fact in one place — link rather than restate.
- If you create or keep local overrides of plugin-owned files, run `bundle exec al-folio upgrade overrides audit` and commit `.al-folio-overrides.yml` after review.

## Further reading

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the starter and gems fit together, silent failure modes, the v1 config contract, local overrides.
- [`docs/BOUNDARIES.md`](docs/BOUNDARIES.md) — authoritative area-to-gem ownership table and PR triage playbook.
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — contributor workflow and agent tooling.
- [`docs/README.md`](docs/README.md) — index of all user and maintainer guides.
- `.agents/skills/al-folio-bootstrap/SKILL.md` — new-site setup workflow.
- `.agents/skills/al-folio-v1-migration/SKILL.md` — customized-fork migration and override drift auditing.
- `.codex/skills` and `.claude/skills` are symlinks to `.agents/skills` for agent-specific discovery.

## Cursor Cloud specific instructions

The VM startup update script already runs `bundle install` and `npm ci`; you do not need to re-run them unless you change `Gemfile`/`package.json`. Standard build/serve/lint/test commands live in the "Validated local command set" above — use those; the notes here are only the non-obvious cloud gotchas.

- **Toolchains are version-manager managed.** Ruby 3.3.5 (+ Bundler 4.0.6) comes from `mise`; Node comes from `nvm`. An interactive shell already activates both via `~/.bashrc`. In a non-interactive shell, activate them first (`eval "$(~/.local/bin/mise activate bash)"` and source `~/.nvm/nvm.sh`) or `ruby`/`bundle`/`node` will appear missing.
- **Native C++ gems build with gcc, not clang.** `cc`/`c++` are pinned to gcc/g++ via `update-alternatives`; the default clang cannot find libstdc++ headers and fails to compile native extensions like `eventmachine`. Do not switch these back to clang.
- **This checkout is Parth Suresh's site, not the demo template.** `_config.yml` `exclude` lists `_posts/`, `_projects/`, `_books/`, `_teachings/`, and several `_pages/*.md`. It does not list `_news/`. News is published. The template integration tests `comments`, `distill`, and `new_plugins` fail because the demo posts are excluded. Do not re-include those collections in the committed `_config.yml` to make the template tests pass.
- **Visual parity tests need a baseline.** The `parity.spec.js` tests skip unless `BASELINE_URL` points at a served `v0.16.3` baseline (see `.github/workflows/visual-regression.yml`); Playwright browsers and their system deps are already installed. Reuse a running dev server with `NO_WEBSERVER=1 npm run test:visual`.
- **`jekyll serve` prints a harmless watch warning.** "directory is already being watched" for `.claude/skills` / `.agents/skills` is just the symlinked skills dirs. The server still runs at http://127.0.0.1:4000/. Launch and drive it with `.cursor/skills/verify-parthsuresh/SKILL.md`.
- **Jupyter notebook posts** render via `jupyter-nbconvert` installed under `~/.local/bin` (on `PATH` in interactive shells); if it is missing the build only warns and skips notebook rendering.
