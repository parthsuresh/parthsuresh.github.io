function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function strip(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ""),
  );
}

function extractMain(html) {
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (article) {
    return article[1];
  }
  const post = html.match(/<div class="post"[\s\S]*?>[\s\S]*$/i);
  if (post) {
    return post[0];
  }
  return html;
}

function convertFragment(html) {
  let text = html;
  text = text.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_, inner) => `\n# ${inner.replace(/<[^>]+>/g, "").trim()}\n\n`);
  text = text.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, inner) => `\n## ${inner.replace(/<[^>]+>/g, "").trim()}\n\n`);
  text = text.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner) => `\n### ${inner.replace(/<[^>]+>/g, "").trim()}\n\n`);
  text = text.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const label = inner.replace(/<[^>]+>/g, "").trim();
    return `[${label}](${href})`;
  });
  text = text.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `- ${inner.replace(/<[^>]+>/g, "").trim()}\n`);
  text = text.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => `${inner.replace(/<[^>]+>/g, "").trim()}\n\n`);
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

export function htmlToMarkdown(html) {
  return convertFragment(extractMain(strip(html)));
}

export function tokenCount(markdown) {
  return Math.max(1, Math.ceil(markdown.length / 4));
}
