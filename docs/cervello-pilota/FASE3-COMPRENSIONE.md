# FASE 3 — Test di comprensione: come ragionano i tre cervelli

Questa è la verifica richiesta prima di scrivere codice: tre modi DIVERSI di ragionare
sugli stessi numeri. Se il copilota mescola queste voci, produce i controsensi che il
progetto ha già visto (grafici da cross con scritta "discreto").

## 1. Come ragiona il PILOTA ricreativo

**Domanda primaria: "oggi posso volare in sereno?"** — non vuole numeri, vuole un si/no
con le condizioni d'uso.

1. Guarda il cielo e la bandiera del decollo PRIMA di qualsiasi previsione: il campo vince sulla carta.
2. Verifica il vento in TRE modi: anemometro/bandiera (suolo), raffiche (disordine), windgram (quota).
   — se suolo calmo ma quota forte: si fida della quota, non del suolo (non è il suo sito "certificato").
3. Pensa in termini di SITUAZIONI, non di parametri: "vento frontale 12 con raffiche 18 e sole" = sereno;
   "stesso vento ma cielo che si incolla" = attenzione.
4. Confronta con i suoi LIMITI PERSONALI: la soglia è sua (per esperienza/vela/hours), non del manuale.
5. Decide con una gerarchia di salvataggio: la sicurezza > il divertimento; se il margine è sottile,
   vola cortissimo vicino al decollo o non vola.
6. In volo è reattivo: quota che scende → cerca termica o atterraggio; vela che si placa → esci dalla zona.
7. A fine giornata valuta se il verdetto della mattina era giusto: aggiusta i suoi limiti (apprendimento).

**Per il copilota**: voce breve, soglie prudenziali, sempre "perché" in una riga, mai jargon CAPE/LCL senza traduzione.

## 2. Come ragiona l'ISTRUTTORE

**Domanda primaria: "posso portare QUESTO allievo, QUESTO giorno, su QUESTO sito?"** —
ragiona per altrui sicurezza, con margine amplificato.

1. Prima il LUOGO poi il tempo: esposizione del decollo, fondovalle per l'atterraggio, zone di rotor conosciute.
   Il sito "certifica" un certo range di condizioni: fuori range, no, anche se il meteo è "bello".
2. Poi lo STUDENTE: esperienza totale e sul sito, vela di classe, attitudine del giorno (stanchezza, pressione).
3. Poi il METEO con soglie PRUDENZIALI (metà di quelle da pilota esperto): vento ≤ 15-20, nessun shear,
   nessuna convettiva carica, nessun girare di brezza nel mezzo della lezione.
4. Costruisce un PIANO con fallback: obiettivo della lezione, area di volo delimitata, atterraggi di
   alternativa, segnali di interruzione ("se la bandiera fa X, tutti a terra").
5. Insegna la DECISIONE, non la risposta: fa dire all'allievo cosa vede (vento, ciclo, cielo) prima di dirglielo.
6. Non negozia mai i veti: "anche se gli altri volano" — la pressione del gruppo è il primo nemico (R10).
7. Rinuncia frequentemente e lo spiega: la rinuncia è un risultato didattico.

**Per il copilota**: SafetyAgent + InstructorAgent parlano questa lingua: veti assoluti, soglie più
prudenziali per profili allievo/ricreativo, briefing sempre con piano di fuga.

## 3. Come ragiona il PILOTA XC

**Domanda primaria: "quanta strada posso fare, con che margine, e dove esco se va storta?"** —
ragiona in TERMINI DI ROUTE, MARGINI E TEMPO.

1. Prende dati IL GIORNO PRIMA (windgram, atmosfera, strade di cumuli) e sceglie il SITO dalla rotta,
   non viceversa: decollo giùvento rispetto all'obiettivo, valle che "spinge" verso l'area XC.
2. Compra la giornata con TRE valute: rateo medio atteso, base (sopra i crinali da attraversare?),
   finestra temporale (quante ore di picco restano?).
3. Dichiara il PEGGIORAMENTO in avanti come piano, non come sorpresa: "se i cumuli si incollano,
   salto alto qui e atterro lì" (D2). Il margine è SPAZIALE (atterraggi sotto ogni tratto — D1),
   TEMPORALE (finestra residua) e VERTICALE (quota sopra il terreno).
4. In volo calcola costantemente: glide reale col vento in quota (R8), velocità di crociera fra
   termiche, quando è "puntuale" per la prossima cresta.
5. Il suo rischio non è il decollo (sa aspettare) ma LA DISTANZA: si impegna solo con atterraggi
   raggiungibili e cielo ordinato avanti; dà retta ai segnali (base che scende, celle che si incollano,
   vento che gira) più che ai suoi desideri.
6. Dopo il volo ridiscute la giornata: il rateo reale vs il previsto alimenta la fiducia nella previsione.

**Per il copilota**: XCAgent parla questa lingua: soglie termica/vento in quota/OD, margine glide,
finestra residua, atterraggi — e la regola d'oro "si vola solo dove si vede un campo atterrabile".

## Verifica incrociata: le 7 domande del pilota risposte dai tre cervelli

| Domanda | Pilota ricreativo | Istruttore | Pilota XC |
|---|---|---|---|
| Posso volare? | "oggi si, mattino, frontale 12" | "con un allievo: no oggi, shear in quota" | "per cross: no, per locale: si" |
| Quando decollo? | "nel minimo del ciclo raffiche" | "dopo che l'inversione si è aperta, 11:30" | "finestra 12-15, decollo alle 11" |
| Quanto salgono? | "fino a +2,8 a mezzogiorno" | "sufficiente per l'obiettivo del corso" | "media 2 m/s: paga il vento" |
| Qual è la base? | "2790 m, soglia 1050: comoda" | "sopra il crinale del sito: ok" | "bassa per la rotta nord: cambia area" |
| Posso fare cross? | "non oggi, base scarpa" | "non in corso" | "sì verso sud: atterraggi e vento ok" |
| Rischio temporale? | "celle a ovest: vigila" | "no OD nel briefing: ok" | "OD in avvicinamento: rientro" |
| Vento favorevole? | "frontale sul decollo" | "girare previsto alle 14: piano breve" | "in quota 25 km/h a favore: spinge" |

**Conclusione del test**: le tre voci NON devono fondersi in un unico giudizio generico:
ognuna vota con le proprie soglie e priorità, e il Decision Engine (Fase 5) compone —
con veto assoluto di sicurezza e spiegazione della catena vincente.
