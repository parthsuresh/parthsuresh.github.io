import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { decide, fromHtml, isPlainTextPath, markdownHeaders, markdownNotFound, siblingPath } = await import(
  pathToFileURL(path.join(here, "../src/negotiate.js")).href
);

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".md")) {
    return "text/markdown; charset=utf-8";
  }
  if (filePath.endsWith(".xml")) {
    return "application/xml; charset=utf-8";
  }
  if (filePath.endsWith(".txt")) {
    return "text/plain; charset=utf-8";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  return "application/octet-stream";
}

async function resolveFile(root, pathname) {
  const clean = pathname.replace(/\?.*$/, "");
  const candidates = [];
  if (clean.endsWith("/")) {
    candidates.push(path.join(root, clean, "index.html"));
  } else {
    candidates.push(path.join(root, clean));
    candidates.push(path.join(root, `${clean}.html`));
    candidates.push(path.join(root, clean, "index.html"));
  }
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) {
        return candidate;
      }
    } catch {
      // try next
    }
  }
  return null;
}

export function startServer({ root, port = 0 }) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
      const accept = req.headers.accept || "";
      if (decide(accept) === "markdown") {
        if (isPlainTextPath(url.pathname)) {
          const file = await resolveFile(root, url.pathname);
          if (!file) {
            const missing = markdownNotFound();
            res.writeHead(missing.status, missing.headers);
            res.end(missing.body);
            return;
          }
          const body = await readFile(file, "utf8");
          res.writeHead(200, markdownHeaders(body));
          res.end(body);
          return;
        }

        const sibling = await resolveFile(root, siblingPath(url.pathname));
        if (sibling) {
          const body = await readFile(sibling, "utf8");
          res.writeHead(200, markdownHeaders(body));
          res.end(body);
          return;
        }

        const htmlFile = await resolveFile(root, url.pathname === "/" ? "/index.html" : url.pathname);
        if (!htmlFile) {
          const missing = markdownNotFound();
          res.writeHead(missing.status, missing.headers);
          res.end(missing.body);
          return;
        }
        const converted = fromHtml(await readFile(htmlFile, "utf8"));
        res.writeHead(converted.status, converted.headers);
        res.end(converted.body);
        return;
      }

      const file = await resolveFile(root, url.pathname === "/" ? "/index.html" : url.pathname);
      if (!file) {
        res.writeHead(404, { "content-type": "text/html; charset=utf-8", vary: "Accept" });
        res.end("<h1>Page not found</h1>");
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": contentTypeFor(file), vary: "Accept" });
      res.end(body);
    } catch (error) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(String(error));
    }
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootArg = process.argv.find((arg) => arg.startsWith("--root="));
  const portArg = process.argv.find((arg) => arg.startsWith("--port="));
  const root = rootArg ? rootArg.slice("--root=".length) : path.resolve(" _site".trim());
  const port = portArg ? Number(portArg.slice("--port=".length)) : 4173;
  const started = await startServer({ root, port });
  process.stdout.write(`markdown negotiation listening on http://127.0.0.1:${started.port}\n`);
}
