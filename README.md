# AnkerGames (al día) para Hydra

Fuente de descargas para Hydra Launcher con la versión más reciente que haya de cada juego de AnkerGames.

**URL para Hydra:** `https://raw.githubusercontent.com/waylorr/ankergames-hydra/main/ankergames.json`

## Cómo funciona

Dos veces al día, GitHub ejecuta `build.mjs`, que junta:

1. La fuente comunitaria `wkeynhk.online/ankergames.json` (tiene enlaces, pero a veces va atrasada).
2. El catálogo de la web de AnkerGames de [tutw/ankergames-catalogo](https://github.com/tutw/ankergames-catalogo) (versiones al día, sin enlaces).
3. Los enlaces que se añaden a mano en `enlaces.json`.

De cada juego queda solo la versión más nueva que tenga enlace. `pendientes.md` lista los juegos que van atrasados o que no tienen enlace.

## Poner al día un juego

1. Busca el juego en `pendientes.md` y abre su página.
2. Copia el enlace de descarga desde la web.
3. En GitHub, edita `enlaces.json` y pega la línea del juego (dentro de las llaves `{ }`, separando con comas), cambiando `PEGA_AQUI_EL_ENLACE` por el enlace.
4. Guarda. En unos minutos la fuente se actualiza sola.
