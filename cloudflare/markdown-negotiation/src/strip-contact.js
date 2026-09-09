// Strip harvestable mailto: handlers from origin HTML.
// Keep the one published public address so /contact/ is not destroyed if a
// renderer emits mailto:parth@parthsuresh.com. Other mailtos still become "#".
export const PUBLIC_EMAIL = "parth@parthsuresh.com";

function mailtoAddress(value) {
  const raw = String(value)
    .replace(/^mailto:/i, "")
    .split("?")[0];
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function stripHarvestableContact(html) {
  // Stop at quotes, whitespace, or ")" so window.open("mailto:...") handlers
  // are a single match. Use \s (whitespace), not a literal "s".
  return html.replace(/mailto:[^"'\s)]+/gi, (match) => (mailtoAddress(match) === PUBLIC_EMAIL ? match : "#"));
}
