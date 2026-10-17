# Publications

`/publications/` lists Parth Suresh's papers from `_bibliography/papers.bib`, grouped by year, with a preview image and a PDF link.

## Sub-features

- `year-groups` shows 2026, 2025, 2024, 2023, 2020, and 2018.
- `brain-age` shows the 16th SIPAIM symposium and year 2020.
- `previews` load `/assets/img/publication_preview/` images for each entry.
- `no-repeated-year` does not print a venue year twice, such as "NeurIPS 2024, 2024".

## How to get to it (user POV)

- Open http://127.0.0.1:4000/publications/ directly.
- From the homepage, follow the navbar link whose text is `publications`.

## Driving it with curl

Preconditions: `doctor.sh` printed `doctor ok`.

- Request the page. `VERIFY_RUN_ID=pubs .cursor/skills/verify-parthsuresh/drive-publications.sh` exits 0, writes `publications.html`, and that file contains all seven titles plus `16th International Symposium on Medical Information Processing and Analysis`.
- Confirm the repeated-year regression is absent. The same command exits non-zero if the HTML contains `NeurIPS 2024, 2024` or `17th International Symposium`.

## Gotchas

- Passing `--baseurl /al-folio` makes this URL 404. Leave `baseurl` empty.
- Google Scholar citation badges are off. Do not require a citation count in the HTML.
- The cite key `lam2021brainage` stays even though the displayed year is 2020.
