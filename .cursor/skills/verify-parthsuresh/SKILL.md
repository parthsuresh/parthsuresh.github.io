---
name: verify-parthsuresh
description: Launch Parth Suresh's site locally and prove the homepage, publications, and news pages over HTTP. Use after edits to the about page, papers.bib, _news, or the production build.
---

# Verify parthsuresh.com

The site is a Jekyll site served at the domain root. `baseurl` in `_config.yml` is empty. Local URLs are `http://127.0.0.1:4000/`, `http://127.0.0.1:4000/publications/`, and `http://127.0.0.1:4000/news/`. Do not pass `--baseurl /al-folio`.

One server owns port 4000. Do not start a second one. A second build would share `_site` with the first.

## Launch

From the repo root, with Ruby on `PATH` (`eval "$(~/.local/bin/mise activate bash)"` when `bundle` is missing):

```bash
.cursor/skills/verify-parthsuresh/launch.sh
```

Ready means `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/` prints `200` and the homepage navbar label is `about`. The launcher waits for that. Jekyll also prints `Server address: http://127.0.0.1:4000` in `/tmp/parthsuresh-verify-evidence/jekyll.log`.

The first boot runs ImageMagick. Later boots are faster. The launcher refuses to start when port 4000 is already taken.

## Doctor

```bash
.cursor/skills/verify-parthsuresh/doctor.sh
```

Doctor is read-only. It checks that port 4000 returns the personal site (navbar label `about`, and the publications and news routes return 200). Run it before the first drive, and again after a drive that behaved unexpectedly. If doctor fails, stop. Do not drive a different process that happens to answer on 4000.

## Drive

The harness is `curl` against the local server. Playwright visual specs in `test/visual/` compare against a v0.16.3 baseline and are not this skill.

```bash
VERIFY_RUN_ID="$(date +%Y%m%d%H%M%S)" .cursor/skills/verify-parthsuresh/drive-publications.sh
```

That drives the publications page. Home and news have the same shape in `features/`. Use the feature file for the page you changed. A proof that only opens `/` is incomplete when the change is on `/publications/` or `/news/`.

## Evidence

Each drive writes under `/tmp/parthsuresh-verify-evidence/<VERIFY_RUN_ID>/`. Keep the response headers, the HTML, and the command's exit status. The proof is the action plus the resulting HTML, not a claim that the server started.

External paper URLs (arXiv, DOI) are not fetched. The check is that the built page links to them and that local preview images and routes exist.

## Cleanup

```bash
.cursor/skills/verify-parthsuresh/cleanup.sh
```

Cleanup kills the pid recorded in `/tmp/parthsuresh-verify-evidence/jekyll.pid`. It does not delete `/tmp/parthsuresh-verify-evidence`. After cleanup, the evidence directory must still be there.

## Helpers

| Script                  | Invocation                                                                   |
| ----------------------- | ---------------------------------------------------------------------------- |
| `launch.sh`             | `.cursor/skills/verify-parthsuresh/launch.sh`                                |
| `doctor.sh`             | `.cursor/skills/verify-parthsuresh/doctor.sh`                                |
| `drive-publications.sh` | `VERIFY_RUN_ID=run1 .cursor/skills/verify-parthsuresh/drive-publications.sh` |
| `cleanup.sh`            | `.cursor/skills/verify-parthsuresh/cleanup.sh`                               |
