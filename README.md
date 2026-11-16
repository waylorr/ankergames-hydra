# AnkerGames (al día) para Hydra

Fuente de descargas para Hydra Launcher con la versión más reciente que haya de cada juego de AnkerGames.

**URL para Hydra:** `https://raw.githubusercontent.com/waylorr/ankergames-hydra/main/ankergames.json`

## Cómo funciona

Cada hora, GitHub:

1. Mira el índice público de la web de AnkerGames y lee solo las páginas de los juegos que han cambiado (`catalogo.mjs` → `catalogo.json`). Nunca entra en `/download/` ni `/torrent/`.
2. Junta la fuente comunitaria `wkeynhk.online/ankergames.json` (tiene enlaces, pero a veces va atrasada) con los enlaces añadidos a mano en `enlaces.json` (`build.mjs`).
3. De cada juego deja solo la versión más nueva que tenga enlace, y apunta en `pendientes.md` los juegos que van atrasados o sin enlace.

## Poner al día un juego

1. En la web de AnkerGames, abre el juego y pulsa «Download». Copia la dirección a la que te lleva.
2. Aquí, en **Issues → New issue → Añadir enlace**, pega la página del juego y ese enlace, y pulsa «Create».
3. En un par de minutos el formulario se cierra solo con el mensaje «Ya está en la fuente».

Solo el dueño del repositorio puede añadir enlaces.
