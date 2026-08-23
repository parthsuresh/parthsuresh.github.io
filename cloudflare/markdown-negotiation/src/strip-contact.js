export function stripHarvestableContact(html) {
  return html.replace(/mailto:[^"'\\s)]+/gi, "#");
}
