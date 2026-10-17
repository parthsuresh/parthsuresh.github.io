# Agent-friendly plan for parthsuresh.com

This site is an al-folio v1 fork. Agents edit publications, roles, and news, and open pull requests. The weekly sync already did that for the brain-age venue ([PR 20](https://github.com/parthsuresh/parthsuresh.github.io/pull/20)). The goal is that a wrong edit fails a check, so review can stay thin.

Evidence is the commit and pull request history on `parthsuresh/parthsuresh.github.io`. No other repo is in scope.

## What is already true

Publications render from `_bibliography/papers.bib`. News renders from `_news/*.md` with `inline: true`, which is what `news.liquid` uses to print the sentence. The about page is hand-written prose in `_pages/about.md`. `_config.yml` has an empty `baseurl` because the site is https://parthsuresh.com/. Demo collections `_posts/`, `_projects/`, `_books/`, and `_teachings/` stay excluded. `_news/` is not excluded.

`AGENTS.md` currently says the opposite about `baseurl` and about `_news/` being excluded. An agent that follows it will break production links or skip news.

Template workflows such as `unit-tests.yml` and `broken-links.yml` run only when `github.repository == 'alshedivat/al-folio'`. `deploy.yml` builds pull requests but does not check links. Link checking runs after deploy.

## What will change

Four pull requests, each from latest `main`, none of them draft.

1. This plan, under `docs/agent-friendly-plan.md`.
2. Content checks. `bin/check_site_content.rb` reads the files the site already renders. `_data/experience.yml` records role facts that must appear in the about-page prose. Tests feed the pre-fix venue bib and the pre-fix em-dash news and require a failure. The current tree must pass. A workflow runs the checker on pull requests.
3. Build and link CI. A workflow that is not limited to the template repo runs `npm run lint:style-contract`, a production `jekyll build`, and offline lychee on `_site` HTML. That catches a broken build, a starter-owned `_layouts` or `_sass` path, and a broken local link before merge.
4. `AGENTS.md` plus `.cursor/skills/verify-parthsuresh/`. The doc tells the truth about `baseurl` and which collections publish, and pairs each rule with the check that enforces it. The skill launches the site and drives one page.

## Checks, and the mistake each one guards

| Check                                                                                               | Guards against                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Venue `booktitle` or `journal` must not contain the `year` value                                    | "NeurIPS 2024, 2024", the bug in [PR 13](https://github.com/parthsuresh/parthsuresh.github.io/pull/13)                                                         |
| `title: about` on `_pages/about.md`                                                                 | Homepage navbar showing the job title, [PR 9](https://github.com/parthsuresh/parthsuresh.github.io/pull/9)                                                     |
| News body has no em dash or en dash, and `inline: true`                                             | The CRAG-MM dash revert, and a news row that renders as a title link                                                                                           |
| An `arxiv.org/abs/` id in news also appears in `papers.bib`                                         | A news link to a paper the publications page does not list                                                                                                     |
| `google_scholar_id` on every paper, and every id in `_data/citations.yml` exists in the bib         | A new paper the citation job cannot match, and another Einstein leftover like [`6449d64`](https://github.com/parthsuresh/parthsuresh.github.io/commit/6449d64) |
| `preview` file exists when the field is set                                                         | A publications image 404                                                                                                                                       |
| Author includes `Suresh, Parth`, and `pdf` is set                                                   | An imported entry that is not his, or a paper with no link                                                                                                     |
| Exactly one current role in `_data/experience.yml`, and each role string appears in the about prose | A LinkedIn sync that updates only one of the two places                                                                                                        |
| `baseurl` empty, demo dirs still excluded, `_news/` not excluded                                    | Following the stale `AGENTS.md` and shipping `/al-folio` links or the demo blog                                                                                |
| Style contract, production build, offline lychee                                                    | A path the starter must not own, a red build, a broken local link that today is caught only after deploy                                                       |

The checker error names the file and the edit to make.

## What will not change

- Visible wording, CSS, and layout. `_data/experience.yml` is not rendered.
- The about page is not generated from data. Commit [`647fd74`](https://github.com/parthsuresh/parthsuresh.github.io/commit/647fd74) rewrote that prose so it would sound less like a resume.
- Bib year is not required to equal `_data/citations.yml`. CRAG-MM is year 2026 in the bib and 2025 in the snapshot, and that is intentional. Brain-age was a real symposium mismatch. The weekly sync still has to compare Scholar or Crossref. CI cannot tell those cases apart.
- Cite keys stay as they are. `lam2021brainage` kept its key when the year became 2020.
- Demo collections stay excluded. The seven template integration tests stay off on this repo. They need pages this site does not build.
- No new publications format beside `papers.bib`. Generating bib from YAML would give agents two files to edit.
- No gem repos, and no repo other than this one.
- No push to `main`.

## How to re-check

From the repo root, after the content PR:

```bash
bundle exec ruby test/site_content_check.rb
bundle exec ruby bin/check_site_content.rb
```

After the CI PR, the same production build the workflow uses:

```bash
npm run lint:style-contract
JEKYLL_ENV=production bundle exec jekyll build
```

Local links are what lychee checks with `--offline` on `_site/**/*.html`.
