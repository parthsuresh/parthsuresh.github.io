# Home

`/` is the about page. The first navbar label is the word `about`. The page shows the bio, selected papers, and the latest news rows.

## Sub-features

- `navbar` shows `about`, `publications`, and `news`.
- `bio` names Member of Technical Staff at Datology AI.
- `selected-papers` lists the papers marked selected in the bibliography.
- `news-rows` shows the latest news sentences.

## How to get to it (user POV)

- Open http://127.0.0.1:4000/.
- Follow the navbar brand or the `about` link.

## Driving it with curl

Preconditions: `doctor.sh` printed `doctor ok`.

- Request the page. `curl -fsS -D /tmp/parthsuresh-verify-evidence/home.headers -o /tmp/parthsuresh-verify-evidence/home.html http://127.0.0.1:4000/` exits 0.
- Confirm the navbar. `grep -q 'nav-link" href="/">about' /tmp/parthsuresh-verify-evidence/home.html` exits 0.
- Confirm the current role is in the prose. `grep -q 'Member of Technical Staff at Datology AI' /tmp/parthsuresh-verify-evidence/home.html` exits 0.
- Confirm the job title is not the navbar label. `grep -q 'href="/">Member of Technical Staff' /tmp/parthsuresh-verify-evidence/home.html` exits 1.

## Gotchas

- `page.title` is the navbar label. Setting it to the job title hides `about`. That is the bug from the SEO edit, not a content improvement.
- The profile image is square. `image_circular` is false. Do not switch it back to a circle.
