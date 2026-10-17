# News

`/news/` is a table of dated sentences. Each row is a file in `_news/` with `inline: true`.

## Sub-features

- `datology` announces joining Datology AI.
- `crag-award` announces the KDD 2026 Best Paper.
- `arxiv-links` point at papers that also exist in the bibliography.

## How to get to it (user POV)

- Open http://127.0.0.1:4000/news/.
- From the homepage, follow the navbar link whose text is `news`.

## Driving it with curl

Preconditions: `doctor.sh` printed `doctor ok`.

- Request the page. `curl -fsS -D /tmp/parthsuresh-verify-evidence/news.headers -o /tmp/parthsuresh-verify-evidence/news.html http://127.0.0.1:4000/news/` exits 0.
- Confirm the Datology row. `grep -q 'Joined' /tmp/parthsuresh-verify-evidence/news.html` and `grep -q 'Datology AI' /tmp/parthsuresh-verify-evidence/news.html` both exit 0.
- Confirm the award row. `grep -q 'Best Paper Award at KDD 2026' /tmp/parthsuresh-verify-evidence/news.html` exits 0.
- Confirm Plan, Watch, Recover links to arXiv. `grep -q 'https://arxiv.org/abs/2606.04970' /tmp/parthsuresh-verify-evidence/news.html` exits 0.

## Gotchas

- A news file without `inline: true` renders a title link instead of the sentence. The table will look empty of the update text.
- An em dash in the sentence is a content failure even when the page returns 200. The CRAG-MM row uses a hyphen.
- `_news/` is not in `_config.yml` `exclude`. Do not add it there.
