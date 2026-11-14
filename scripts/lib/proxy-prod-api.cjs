/* Proxy API locali → produzione: la pagina sotto test è il build locale,
   i dati meteo arrivano dagli endpoint Vercel reali (evita i 429 di Open-Meteo in dev). */
const PROD = "https://la-meteo-dei-conigli.vercel.app";

async function proxyApiToProd(route) {
  const req = route.request();
  const u = new URL(req.url());
  if (u.searchParams.has("localbypass")) return route.continue();
  try {
    const resp = await route.fetch({ url: PROD + u.pathname + u.search });
    await route.fulfill({ response: resp });
  } catch {
    await route.continue();
  }
}

/** Installa su un BrowserContext il proxy di tutti gli /api/* verso la produzione. */
function installProdApiProxy(context, localOrigin) {
  return context.route(`${localOrigin}/api/**`, proxyApiToProd);
}

module.exports = { installProdApiProxy, PROD };
