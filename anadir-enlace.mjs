// Adds a download link from an "Añadir enlace" issue to enlaces.json.
// The game's title, date and size come from catalogo.json (the current version).
// Prints the line to show in the issue comment; exits 1 with a reason on error.
import { readFile, writeFile } from "node:fs/promises";

const body = process.env.ISSUE_BODY || "";

const field = (label) => {
  const match = body.match(new RegExp(`###\\s*${label}[^\\r\\n]*[\\r\\n]+([^\\r\\n]+)`, "i"));
  return match ? match[1].trim() : "";
};

function fail(message) {
  console.log(message);
  process.exit(1);
}

const page = field("P[aá]gina del juego");
const link = field("Enlace de descarga");

const slug = (page.match(/^https:\/\/(?:www\.)?ankergames\.net\/game\/([a-z0-9-]+)\/?$/i) || [])[1];
if (!slug) fail(`La página no es de un juego de AnkerGames: «${page}»`);

let url;
try {
  url = new URL(link);
} catch {
  fail(`El enlace de descarga no es una dirección válida: «${link}»`);
}
if (url.protocol !== "https:") fail("El enlace de descarga tiene que empezar por https://");

const catalog = JSON.parse(await readFile("catalogo.json", "utf8"));
const game = catalog[slug.toLowerCase()];
if (!game) fail(`No encuentro «${slug}» en el catálogo. Prueba de nuevo dentro de una hora.`);

const links = JSON.parse(await readFile("enlaces.json", "utf8"));
links[slug.toLowerCase()] = {
  titulo: game.titulo,
  fecha: game.lastmod,
  tamano: game.tamano,
  enlaces: [url.href],
};
await writeFile("enlaces.json", JSON.stringify(links, null, 2) + "\n");
console.log(`Añadido: ${game.titulo} (${game.tamano || "tamaño desconocido"})`);
