# parthsuresh.com verification map

Read this index, then the feature file for the page you changed. Drive that page on the server `launch.sh` started. Do not treat a different URL as a substitute.

## Baseline preconditions

- One Jekyll server at `http://127.0.0.1:4000`. `baseurl` is empty.
- Run `.cursor/skills/verify-parthsuresh/doctor.sh` and require `doctor ok`.
- Do not start a second server. Port 4000 and `_site` are shared.
- Leave `/tmp/parthsuresh-verify-evidence` in place after cleanup.

## Driving conventions

- Use the `curl` commands in the feature file. Keep the paths unchanged.
- Save headers and HTML under `/tmp/parthsuresh-verify-evidence/<VERIFY_RUN_ID>/`.
- A 200 with the wrong sentence is a failure.

## Features

- [Home](./home.md) is `/`, the about page, the navbar label, and the five latest news rows.
- [Publications](./publications.md) is `/publications/`, the seven papers, and their local preview images.
- [News](./news.md) is `/news/`, the dated sentences, and their paper links.
