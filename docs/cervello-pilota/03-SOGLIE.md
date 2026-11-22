# 3. SOGLIE — i numeri del copilota

Ogni soglia: **valore → fonte → confidenza**. "Prassi" = consenso operativo della comunità/istruzione, non legge fisica.
Dove l'app la-meteo-dei-conigli codifica già un valore è indicato `[app: file]`.

## Decollo e vento al suolo

| Parametro | Soglia | Lettura | Fonte | Confidenza |
|---|---|---|---|---|
| Vento medio al decollo | ≤ 5-15 km/h | confortevole | prassi comunità (reddit/fb ricorrenti) + manuali | alta come prassi |
| Vento medio al decollo | 15-25 km/h | impegnativo, valutare esperienza | idem | alta come prassi |
| Vento medio al decollo | > 25-30 km/h | non volabile (decollo) | prassi; vela trimata 30-37 km/h | alta |
| Raffiche | > 35-40 km/h | non volabile | prassi `[app: indiceVolabilita windGusts>40]` | alta |
| Spread raffiche (max−media) | > 10-15 km/h | aria disordinata: cautela | prassi; paragone con FAA gust factor | media-alta |
| Relazione vento-esposizione | ≤ 45° frontale / ≤ 90° diagonale / ≤ 135° laterale / > 135° coda | ottimo / ok / attenzione / pericoloso | geometria standard del sito `[app: indiceVolabilita]` | alta |

## Termiche e base

| Parametro | Soglia | Lettura | Fonte | Confidenza |
|---|---|---|---|---|
| Eccesso termico per il distacco bolla | ≈ +2-3 °C | bolla parte | manuale volo libero meteo04 (es. 18 vs 15 °C) | alta |
| Adiabatica secca | 1 °C/100 m | salita bolla | idem | alta (fisica) |
| Adiabatica satura | 0,5-0,8 °C/100 m | sopra la base | idem | alta (fisica) |
| Base cumuli (LCL) | spread × 125 m | formula semplificata `[app: indiceVolabilita calcCloudBase]`; il manuale usa ×100 nell'esempio | manuale + prassi meteo | alta come stima |
| Rateo max | < 1 m/s | scorribila | prassi XC | alta come prassi |
| Rateo max | 1-2 m/s | volo locale | prassi | alta |
| Rateo max | ≥ 2 m/s + soglia ≥ 900 m | cross possibile `[app: reportGiornata crossOk]` | prassi XC alpina | media-alta |
| Rateo max | ≥ 3 m/s + soglia ≥ 1200 m | giornata da cross | prassi XC alpina | media |
| Sink inter-termica | −1 ÷ −3 m/s | pianificazione glide | prassi | alta |
| Altezza minima sotto la base | ≥ 100 m sotto la base | non limare la base | manuale volo libero | alta |
| Inversione in quota tipica | 2400-2600 m (o 2700-3000) | tetto invalicabile | manuale (caso Brianza 1987; curva di stato tipo) | media-alta |

## Veleggiata / pendio

| Parametro | Soglia | Lettura | Fonte | Confidenza |
|---|---|---|---|---|
| Vento sul pendio | 20-30 km/h in fronte | dinamica piena | manuale volo libero veleg03 | alta |
| Vento sul pendio | 10-19 km/h | spinta + termo-dinamica `[app: reportGiornata MEDIATE]` | derivato dal manuale | media-alta |
| Vento sul pendio | < 10 km/h o coda | pendio senza sostegno | idem | alta |
| Vento sul crinale | ≥ 35 km/h | veleggiato scarto (turbolenza/deriva) `[app: reportGiornata SCARSE ≥35]` | prassi | media-alta |
| Virate sul pendio | sempre controvento | regola assoluta | manuale veleg03 ("non ammette eccezioni") | alta |

## Vento in quota, rotor, shear

| Parametro | Soglia | Lettura | Fonte | Confidenza |
|---|---|---|---|---|
| Vento in quota sui livelli di volo | > 40-50 km/h | rischio Foehn/valicante: rinunciare | prassi alpina | media |
| Vento sopra la cresta | > 25-30 km/h | rotor/onda probabili anche con suolo calmo | prassi + SKYbrary mountain waves | media-alta |
| Delta vento fra livelli adiacenti (shear) | > 20-25 km/h | aria mossa `[app: reportGiornata MARCATA ≥25]` | prassi su windgram | media |
| Effetto Venturi | 400 m+ sopra i bordi del canalone | depressione che tira giù | manuale veleg03 | alta |
| Rotore di sottovento | fino a ~2-5× altezza ostacolo, forte sotto onda | evitare la zona | SKYbrary, FAA AC 00-57 | alta come principio |

## Temporali / convettiva profonda

| Parametro | Soglia | Lettura | Fonte | Confidenza |
|---|---|---|---|---|
| WMO weather code | 95/96/99 | temporale in atto: NON VOLABILE `[app: indiceVolabilita]` | WMO | alta |
| CAPE | > 1500 J/kg + pioggia > 0,5 mm | NON VOLABILE `[app: indiceVolabilita]` | prassi meteo | media-alta |
| CAPE | > 1200 J/kg | penalizza l'indice `[app: indiceVolabilita]` | prassi | media |
| Fronte di raffiche | corre 30-60 km/h davanti alla cella | atterrare PRIMA che arrivi | prassi temporali volo libero | media-alta |
| Distanza di allerta Cb | cella a < 10-15 km o cielo che scurisce | uscire dall'area di volo | prassi XC | media |

## Atterraggio

| Parametro | Soglia | Lettura | Fonte | Confidenza |
|---|---|---|---|---|
| Flare | ~2-3 m dal suolo | timing tipico | paragliding-lessons flare timing | alta come prassi |
| Mani alte in vento nullo | da ~4-5 m | progressiva | paraglidingforum (no-wind landings) | media come prassi |
| Gradiente basso | ultimi 10-30 m | perdita apparente di vento | manuale + prassi | alta |
| Campo sottovento a ostacoli | sempre vietato | rotor/conca | manuale veleg03 | alta |

## Sicurezza (contesto numerico)

| Parametro | Valore | Fonte |
|---|---|---|
| Fatalità DHV Germania | 48 incidenti mortali 2018-2022 (~10/anno) | analisi DHV citata da fonti di settore |
| Lesioni tipiche | fratture nel 42-89% dei casi, prevalentemente arti inferiori | Canbek et al. 2015 |
| Soccorso | si decide PRIMA della quota minima utile, non "quando serve" | prassi SIV/istruzione |

## Gap app ↔ banca dati (da Fase 4/5)

| Domanda del pilota | Oggi l'app | Mancanza |
|---|---|---|
| Posso volare? | indice + verdetto report | un solo "giudice" per tutto: mancano i voti separati di sicurezza/istruttore/XC |
| Quando decollo? | finestra da indice medio | non modella ciclo raffiche né girare della brezza |
| Quanto salgono? | rateo da spread+CAPE | non usa deldi vero gradiente verticale (T-skew), non distingue mattina/pomeriggio |
| Qual è la base? | LCL × 125 | non dichiara il tetto d'inversione reale (profili T disponibili) |
| Posso fare cross? | crossOk (rateo+base) | mancano vento in quota sulla rotta, atterraggi, peggioramento in avanti |
| Rischio temporale? | WMO+CAPE binario | niente avviso OD graduale né fronte di raffiche |
| Vento favorevole? | relazione esposizione | niente Venturi, rotor (segnali), girare della brezza, vento in quota vs cresta |
