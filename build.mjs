// Builds ankergames.json (Hydra download-source format) from:
//  - BASE_FEED: a feed that has download links (may be outdated)
//  - CATALOG:   the current AnkerGames catalog (versions, no links)
//  - enlaces.json: links added by hand for newer versions
// Writes ankergames.json and pendientes.md. Never shrinks the feed abruptly.
import { readFile, writeFile } from "node:fs/promises";

const BASE_FEED = "https://wkeynhk.online/ankergames.json";
const CATALOG =
  "https://raw.githubusercontent.com/tutw/ankergames-catalogo/main/ankergames.json";
const OUTPUT = "ankergames.json";
const PENDING = "pendientes.md";
const MANUAL = "enlaces.json";
const SOURCE_NAME = "AnkerGames (al día)";
const BASE_HOSTS = ["datanodes.to", "gofile.io", "pixeldrain.com"];
const PLACEHOLDER = "PEGA_AQUI_EL_ENLACE";
const MAX_DROP = 0.8; // abort if the new feed has < 80 % of the previous one

const args = new Map(
  process.argv.slice(2).map((a) => a.replace(/^--/, "").split("="))
);

async function load(source) {
  if (/^https?:/.test(source)) {
    const res = await fetch(source, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(await readFile(source, "utf8"));
}

async function loadOptional(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

const slugOf = (entry) =>
  (entry.descriptionHtml?.match(/ankergames\.net\/game\/([^"/?#]+)/) || [])[1];
const sameTitle = (a, b) =>
  a.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toLowerCase() ===
  b.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
const pageOf = (slug) => `https://ankergames.net/game/${slug}`;
const descriptionOf = (slug) =>
  `<a href="${pageOf(slug)}">Website with instructions for launching the game</a>`;

const isHttps = (uri) => {
  try {
    return new URL(uri).protocol === "https:";
  } catch {
    return false;
  }
};
const fromBaseHost = (uri) =>
  isHttps(uri) && BASE_HOSTS.includes(new URL(uri).hostname.replace(/^www\./, ""));

const newest = (a, b) => ((b?.uploadDate || "") > (a?.uploadDate || "") ? b : a);

async function main() {
  const base = await load(args.get("base") || BASE_FEED);
  if (!Array.isArray(base?.downloads)) throw new Error("Base feed has no downloads");

  let catalog = [];
  try {
    catalog = (await load(args.get("catalog") || CATALOG)).downloads || [];
  } catch (error) {
    console.warn(`Catalog unavailable, building without it: ${error.message}`);
  }
  const manual = await loadOptional(args.get("manual") || MANUAL, {});
  const previous = await loadOptional(OUTPUT, null);

  const bySlug = new Map();
  const noSlug = [];
  const offer = (slug, entry) => {
    if (!slug) return noSlug.push(entry);
    bySlug.set(slug, newest(bySlug.get(slug), entry));
  };

  for (const entry of base.downloads) {
    const uris = (entry.uris || []).filter(fromBaseHost);
    if (!entry.title || !uris.length) continue;
    offer(slugOf(entry), { ...entry, uris });
  }

  for (const [slug, item] of Object.entries(manual)) {
    const uris = (item.enlaces || []).filter((u) => u !== PLACEHOLDER && isHttps(u));
    if (!item.titulo || !uris.length) continue;
    offer(slug, {
      title: item.titulo,
      uris,
      uploadDate: item.fecha || new Date().toISOString(),
      fileSize: item.tamano || "",
      descriptionHtml: descriptionOf(slug),
    });
  }

  const downloads = [...bySlug.values(), ...noSlug].sort((a, b) =>
    (b.uploadDate || "").localeCompare(a.uploadDate || "")
  );

  const previousCount = previous?.downloads?.length || 0;
  if (downloads.length < previousCount * MAX_DROP) {
    throw new Error(
      `New feed has ${downloads.length} games, previous had ${previousCount}; keeping the previous one`
    );
  }

  await writeFile(
    OUTPUT,
    JSON.stringify({ name: SOURCE_NAME, downloads }, null, 2) + "\n"
  );

  const outdated = [];
  const missing = [];
  for (const site of catalog) {
    const slug = slugOf(site);
    if (!slug || !site.title) continue;
    const ours = bySlug.get(slug);
    if (ours && sameTitle(ours.title, site.title)) continue;
    const snippet = JSON.stringify({
      [slug]: {
        titulo: site.title,
        fecha: site.uploadDate,
        tamano: site.fileSize,
        enlaces: [PLACEHOLDER],
      },
    }).slice(1, -1);
    (ours ? outdated : missing).push({ site, ours, slug, snippet });
  }
  const byDate = (a, b) => (b.site.uploadDate || "").localeCompare(a.site.uploadDate || "");
  outdated.sort(byDate);
  missing.sort(byDate);

  const lines = [
    "# Juegos pendientes",
    "",
    `Fuente: ${downloads.length} juegos con enlace. ` +
      `Desactualizados: ${outdated.length}. Sin enlace: ${missing.length}.`,
    "",
    "Para poner al día un juego: abre su página, copia el enlace de descarga,",
    "y pega su línea en `enlaces.json` cambiando PEGA_AQUI_EL_ENLACE por el enlace.",
    "",
    "## Con versión antigua en la fuente",
    "",
    ...outdated.flatMap(({ site, ours, slug, snippet }) => [
      `- [${site.title}](${pageOf(slug)}) — en la fuente: ${ours.title}`,
      `  \`${snippet}\``,
    ]),
    "",
    "## Sin enlace en la fuente",
    "",
    ...missing.flatMap(({ site, slug, snippet }) => [
      `- [${site.title}](${pageOf(slug)})`,
      `  \`${snippet}\``,
    ]),
    "",
  ];
  await writeFile(PENDING, lines.join("\n"));

  console.log(
    `${downloads.length} games written (previous ${previousCount}); ` +
      `${outdated.length} outdated, ${missing.length} without link`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
