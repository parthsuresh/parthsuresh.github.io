/**
 * HTTP Accept parsing for markdown content negotiation.
 * Matches Cloudflare Markdown for Agents:
 *   text/markdown                         -> markdown
 *   text/markdown, text/html;q=0.9        -> markdown
 *   text/*                                -> markdown
 *   star/star                             -> HTML
 * If markdown is not explicitly preferred, HTML wins.
 */

function parseAccept(header) {
  if (!header) {
    return [];
  }

  return header
    .split(",")
    .map((part) => {
      const segments = part.split(";").map((item) => item.trim());
      const [rawType, ...params] = segments;
      if (!rawType) {
        return null;
      }
      const [type, subtype = "*"] = rawType.toLowerCase().split("/");
      let q = 1;
      for (const param of params) {
        const [key, value] = param.split("=").map((item) => item.trim());
        if (key === "q" && value !== undefined) {
          const parsed = Number.parseFloat(value);
          q = Number.isFinite(parsed) ? parsed : 0;
        }
      }
      return { type, subtype, q };
    })
    .filter(Boolean);
}

function quality(parts, type, subtype, { allowTypeStar, allowStarStar }) {
  let best = -1;
  for (const part of parts) {
    const exact = part.type === type && part.subtype === subtype;
    const typeStar = allowTypeStar && part.type === type && part.subtype === "*";
    const starStar = allowStarStar && part.type === "*" && part.subtype === "*";
    if (exact || typeStar || starStar) {
      best = Math.max(best, part.q);
    }
  }
  return best;
}

export function prefersMarkdown(acceptHeader) {
  const parts = parseAccept(acceptHeader);
  if (parts.length === 0) {
    return false;
  }

  const markdownQ = quality(parts, "text", "markdown", {
    allowTypeStar: true,
    allowStarStar: false,
  });
  const htmlQ = quality(parts, "text", "html", {
    allowTypeStar: true,
    allowStarStar: true,
  });

  if (markdownQ <= 0) {
    return false;
  }
  return markdownQ >= htmlQ;
}
