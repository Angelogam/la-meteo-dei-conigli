# bang-motion — skill collegato alla repo

Vendored da https://github.com/bangtutorial/bang-motion (MIT © Bang Tutorial), versione 1.19.0.

Serve per creare contenuti motion (opener, promo, bumper, kinetic typography, explainer)
come **singolo `index.html`** con GSAP — che gioca come un video, non come una slide.

## Come si usa
1. Leggere `SKILL.md` (leggi anti-PPT, flusso di lavoro, checklist).
2. Leggere `references/opener-konsep.md` PRIMA del rundown, `references/techniques.md`
   durante la costruzione, `references/anti-ppt.md` prima di progettare le scene.
3. Partire dall'architettura in `assets/starter-opener.html` (o starter explainer).
4. Verificare con snapshot ai secondi chiave (`scripts/snap.mjs` o Playwright + `?clean=1` + `OPENER.seek(t)`).

## Esempio nella repo
`public/promo/index.html` — promo opener «la meteo dei conigli» costruito con questo skill:
concept «tanya→jawab diegetik», calotta del logo come oggetto-relay, foto reali della repo,
dati del bollettino reale (fonte Open-Meteo).

Aggiornare: ricopiare le cartelle da una nuova clone dell'upstream ( licence MIT, mantieni questo file ).
