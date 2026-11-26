# Mudanza a Cloudflare

El sitio se sirve desde **Cloudflare Workers** (sus archivos estáticos; Cloudflare recomienda Workers y no Pages para proyectos nuevos). Es un sitio estático: `npm run build` arma `dist/` y Cloudflare lo sirve tal cual, sin código propio en el servidor. Hasta noviembre de 2026 lo servía Netlify.

## Cómo está (26 de noviembre de 2026)

- **El Worker** se llama `algoparticular`, está conectado a `algoparticular/praxis` y cada push a `main` lo construye y lo despliega (Workers Builds). Su dirección propia: `algoparticular.juanmanuelynz.workers.dev`.
- **El dominio** sigue registrado en GoDaddy (lo tiene Pepi; vence el 14 de noviembre de 2027), con sus nameservers en Cloudflare (`bailey` y `rayden.ns.cloudflare.com`). `algoparticular.com` es un *Custom Domain* del Worker, y `www` (un `CNAME` con proxy) redirige a `algoparticular.com` con una *Redirect Rule* (`https://www.*` → `https://${1}`, 301, conserva la consulta).
- **HTTPS:** *Always Use HTTPS* prendido.
- **Robots de IA:** búsqueda y agentes permitidos (*Security → Settings → Bot traffic → AI Crawler and Agent access policies*). El entrenamiento va en *Disallow* con *Bot Preference Sync* prendido: así Cloudflare bloquea esos robots y agrega sus reglas al principio de nuestro `robots.txt` (`public/robots.txt` queda como está).
- **Netlify** todavía tiene el sitio conectado y sigue construyendo cada push, pero ya no recibe visitas: se borra cuando se confirme que Cloudflare despliega solo.

## Qué hay en el repositorio

| Archivo | Para qué |
|---|---|
| `wrangler.jsonc` | La configuración de Cloudflare: servir `dist/`, que toda dirección que no es un archivo abra la app (como el `/* /index.html 200` de Netlify) y las páginas sin barra final (`/card/3`, la dirección de su `canonical` y del sitemap; `/card/3/` redirige ahí). |
| `public/_headers` | Las cabeceras de respuesta (hoy, cuánto guardan los navegadores las ilustraciones de `/cards/*`). Lo leen Cloudflare y Netlify, así que sale de `netlify.toml`. |
| `.nvmrc` | La versión de Node para construir (22), la misma para Cloudflare y para quien trabaje en el proyecto. |

Todo lo demás se comporta igual que en Netlify: cada archivo se sirve con `Cache-Control: public, max-age=0, must-revalidate` y su `ETag` (una imagen que no cambió cuesta un 304), que es lo que espera el service worker (`vite.config.js`). Probado con `wrangler dev`, el mismo motor de Cloudflare en local: las páginas, las de cada carta con su `og:` para compartir, el service worker y sin errores.

## Cómo se hizo

### 1. Crear el Worker y conectarlo a GitHub

1. Crear una cuenta en Cloudflare (el plan gratuito alcanza: los pedidos de archivos estáticos son gratis y sin límite).
2. **Workers & Pages** → **Create** → importar un repositorio de GitHub → `algoparticular/praxis`.
3. Configuración del build:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy` (el que viene)
   - **Branch:** `main`
4. En **Settings → Build → Build variables and secrets**, las variables que hoy están en Netlify (Netlify → Site configuration → Environment variables): `VITE_POSTHOG_KEY` y, si está, `VITE_POSTHOG_HOST`. Sin ellas el sitio anda, pero la analítica queda apagada (`src/analytics.js`).
5. Desplegar y probar la dirección `*.workers.dev`, sobre todo en el teléfono: escenas, el mundo de Sid, el sonido, instalar la app.

### 2. Llevar el dominio a Cloudflare

Para que Cloudflare sirva `algoparticular.com`, el dominio tiene que ser una *zona* de la cuenta: Cloudflare pasa a manejar sus DNS. El orden importa para que el sitio no se caiga.

#### Cómo estaba (24 de noviembre de 2026)

- Comprado en **GoDaddy** (vence el 14 de noviembre de 2027), y sus DNS también están en GoDaddy (`ns31.domaincontrol.com` y `ns32.domaincontrol.com`). Netlify no maneja los DNS: solo recibe el tráfico.
- Registros: `algoparticular.com` → `A 75.2.60.5` (Netlify) y `www` → `CNAME algoparticular.com`. Netlify redirige `www` a `algoparticular.com`.
- Sin correo (ningún `MX`), sin `TXT` de verificación, sin DNSSEC.

#### Antes de empezar: anotar lo que hay

- **Dónde se compró el dominio** (el *registrar*). Si no se sabe: <https://lookup.icann.org/>.
- **Dónde están hoy sus DNS:** puede ser el mismo registrar o Netlify DNS (si en Netlify, en **Domains**, el dominio figura con sus nameservers de Netlify).
- **Todos los registros DNS actuales**, en especial:
  - los del correo, si se usa un correo `@algoparticular.com` (`MX` y los `TXT` de SPF, DKIM y DMARC). Si se pierden, el correo deja de llegar;
  - los `TXT` de verificación (Google Search Console u otros servicios).
- **Si el dominio tiene DNSSEC activo** en el registrar: hay que apagarlo **antes** de cambiar los nameservers o el dominio deja de resolver. Se puede volver a prender desde Cloudflare después.

#### Pasos

1. **Agregar el dominio:** Cloudflare → **Domains → Onboard a domain** → `algoparticular.com` → plan Free. Cloudflare escanea los registros DNS actuales y los copia.
2. **Revisar los registros copiados** contra la lista anotada: el escaneo no garantiza encontrarlos todos. Agregar a mano lo que falte (sobre todo el correo).
3. **Dejar el sitio apuntando a Netlify por ahora**, con los registros de `algoparticular.com` y `www` en **DNS only** (nube gris). Así, al cambiar los nameservers, todo sigue igual y Netlify sigue sirviendo el sitio con su certificado.
4. **Cambiar los nameservers** en el registrar por los dos que da Cloudflare, copiados exactos. Si el dominio usaba Netlify DNS, **no** borrarlo de Netlify todavía.
5. **Esperar a que la zona quede *Active*** en Cloudflare (Cloudflare avisa por correo; puede tardar de minutos a un día) y que su certificado (**SSL/TLS → Edge Certificates**) esté activo.
6. **Pasar el sitio a Cloudflare**, mejor en una hora tranquila:
   1. En **DNS → Records**, borrar el registro de `algoparticular.com` que apunta a Netlify (Cloudflare no deja crear el dominio del Worker sobre un `CNAME` existente).
   2. En el Worker: **Settings → Domains & Routes → Add → Custom Domain** → `algoparticular.com`. Cloudflare crea el registro y el certificado.
7. **`www` redirige a `algoparticular.com`**, como hoy:
   1. El registro de `www` en **Proxied** (nube naranja). Si no hay, uno `A` a `192.0.2.1` con proxy: el tráfico se redirige antes de llegar a esa dirección.
   2. **Rules → Redirect Rules**, con la plantilla *Redirect from WWW to root* (`https://www.*` → `https://${1}`, 301, conservando la consulta).
8. **Comprobar** (`curl -I https://algoparticular.com/` dice `server: cloudflare`): la portada, una carta, el mundo de Sid, `www`, compartir una carta (su vista previa) y la app instalada en el teléfono.
9. **Dejar Netlify unos días** sin tocar (por los DNS guardados en caché) y después borrar el sitio de Netlify, su dominio y, si se usaba, su DNS.

## Lo que queda

- **Confirmar el despliegue automático** con el próximo PR que llegue a `main`: en el Worker, *Deployments* muestra uno nuevo.
- **Borrar el sitio de Netlify** (y con él sus vistas previas y su build), después sacar `netlify.toml`.
- **Vistas previas de los PR** para probar en el teléfono, como las de Netlify: Workers Builds construye cada rama que no es `main` y corre `npx wrangler preview` (en beta abierta), que pide un bloque `previews` en `wrangler.jsonc` (está, vacío). Falta ver dónde publica su dirección.
- **Comprobar que `robots.txt` muestre el bloqueo** del entrenamiento (el bloque `# BEGIN Cloudflare Managed content`).
- **Apagar la analítica de Cloudflare** (*Web Analytics*, también llamada RUM, que inyecta un script de `static.cloudflareinsights.com` en las páginas que pide un navegador): medimos con PostHog (`docs/analitica.md`). Como no aparece en la lista de *Web Analytics* de la cuenta, se apaga con una *Configuration Rule* del dominio para todo pedido, con *Disable Real User Monitoring (RUM)*.
- **HSTS** (*SSL/TLS → Edge Certificates*), que Netlify enviaba: opcional.

Fuentes: [Netlify a Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/netlify-to-workers/), [SPA](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/), [barras finales](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [`_headers`](https://developers.cloudflare.com/workers/static-assets/headers/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [versión de Node](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/), [dominio propio](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [mover los DNS](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), [sin cortes](https://developers.cloudflare.com/fundamentals/performance/minimize-downtime/), [www a la raíz](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/).
