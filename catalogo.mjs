// Keeps catalogo.json up to date with the public AnkerGames sitemap.
// Only game pages whose sitemap date changed are read, slowly, a few per run.
// Never touches /download/ or /torrent/ (forbidden by the site's robots.txt).
import { readFile, writeFile } from "node:fs/promises";

const SITE = "https://ankergames.net";
const SEED =
  "https://raw.githubusercontent.com/tutw/ankergames-catalogo/main/ankergames.json";
const CATALOG = "catalogo.json";
const MAX_SITEMAPS = 10;
const MAX_PAGES_PER_RUN = 40;
const DELAY_MS = 1500;
const UA = "Mozilla/5.0 (compatible; ankergames-hydra; +https://github.com/waylorr/ankergames-hydra)";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  return { status: res.status, text: res.ok ? await res.text() : "" };
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const slugOfUrl = (url) => (url.match(/\/game\/([^/?#]+)/) || [])[1];
const slugOfEntry = (entry) => slugOfUrl(entry.descriptionHtml || "");

async function readSitemaps() {
  const games = new Map();
  for (let n = 1; n <= MAX_SITEMAPS; n++) {
    const { status, text } = await get(`${SITE}/sitemap_post_${n}.xml`);
    if (status === 404) break;
    if (!text) throw new Error(`sitemap_post_${n}.xml: HTTP ${status}`);
    for (const [, block] of text.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1];
      const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || "";
      const slug = loc && slugOfUrl(loc);
      if (slug && (!games.has(slug) || lastmod > games.get(slug))) games.set(slug, lastmod.trim());
    }
    await sleep(DELAY_MS);
  }
  if (games.size < 500) throw new Error(`Sitemap only has ${games.size} games`);
  return games;
}

function parseGamePage(html) {
  const pick = (re) => (html.match(re) || [])[1];
  const name = decode((pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || "").replace(/<[^>]+>/g, " "));
  const description = decode(pick(/<meta\s+name="description"\s+content="([^"]*)"/i) || "");
  const pageTitle = decode(pick(/<title>([\s\S]*?)<\/title>/i) || "");
  const visible = decode(
    html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  );
  const versionMatch =
    description.match(/\((?:v|version)\s*([^,)]+)/i) || pageTitle.match(/\((?:v|version)\s*([^,)]+)/i);
  const version = versionMatch?.[1].split(/\s+\+\s*Co-?Op\b/i)[0].trim();
  const build = (visible.match(/\bB(?:uild)?\s+(\d{5,})\b/i) || [])[1];
  const size = ((description || visible).match(/\b\d+(?:[.,]\d+)?\s*(?:TB|GB|MB)\b/i) || [])[0];
  if (!name) return null;
  const parts = [version && `V ${version}`, build && `Build ${build}`].filter(Boolean);
  return {
    titulo: parts.length ? `${name} - ${parts.join(" / ")}` : name,
    tamano: size ? size.replace(",", ".").replace(/\s+/g, " ") : "",
  };
}

async function loadCatalog() {
  try {
    return JSON.parse(await readFile(CATALOG, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const seed = await (await fetch(SEED)).json();
  const catalog = {};
  for (const entry of seed.downloads || []) {
    const slug = slugOfEntry(entry);
    if (slug) catalog[slug] = { lastmod: entry.uploadDate, titulo: entry.title, tamano: entry.fileSize };
  }
  console.log(`Seeded ${Object.keys(catalog).length} games from tutw/ankergames-catalogo`);
  return catalog;
}

async function main() {
  const catalog = await loadCatalog();
  const sitemap = await readSitemaps();

  const changed = [...sitemap]
    .filter(([slug, lastmod]) => catalog[slug]?.lastmod !== lastmod)
    .sort((a, b) => b[1].localeCompare(a[1]));

  let updated = 0;
  for (const [slug, lastmod] of changed.slice(0, MAX_PAGES_PER_RUN)) {
    await sleep(DELAY_MS);
    const { status, text } = await get(`${SITE}/game/${slug}`);
    const parsed = text && parseGamePage(text);
    if (!parsed) {
      console.warn(`Skipped ${slug}: HTTP ${status}`);
      continue;
    }
    catalog[slug] = { lastmod, ...parsed };
    updated++;
  }

  const sorted = Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(CATALOG, JSON.stringify(sorted, null, 1) + "\n");
  console.log(
    `Catalog: ${Object.keys(sorted).length} games, ${changed.length} changed, ${updated} pages read`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
