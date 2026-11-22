# 5. DECISIONI — playbook del copilota

I playbook sono sequenze di domande/controlli che gli agenti eseguiranno (Fase 4/5).
Ogni playbook termina con una **decisione + motivi in ordine di importanza**.

## P1. "Posso volare?" — briefing pre-decollo (ordine di verifica, il primo veto vince)

1. **Temporale?** WMO 95/96/99 o CAPE>1500+pioggia → STOP (E1/E2).
2. **Vento al decollo?** media/raffiche/spread vs soglie A1/A2, relazione esposizione A3/A4 → STOP o CAUTELA.
3. **Rotore/onda?** vento sopra cresta > 25-30, lenticolari, fumo che gira (A6) → CAUTELA con briefing cresta.
4. **Pioggia in arrivo?** precipitazioni/probabilità e radar → CAUTELA finestra corta.
5. **Aria in quota?** shear fra livelli (D-soglie), Foehn > 40-50 km/h (A7) → CAUTELA/NO.
6. **Termica e base?** rateo, base LCL, inversione reale (B1-B7) → definisce IL TIPO di volo.
7. **Verdetto finale**: SI VOLA (tutto verde + termica valida), POSSIBILE CON CAUTELA (almeno un giallo con mitigazione chiara), RESTA A TERRA (veto Safety).
Output obbligatorio: verdetto + i 3 motivi principali + la finestra.

## P2. "Quando decollo?" — finestra

1. Fase della brezza: mattina (pendio), mezzogiorno (termiche), pomeriggio (valle + picco convettivo), sera (calma di monte).
2. Picco convettivo: finestra 12-15 se cielo ordinato (D5).
3. Ciclo di raffiche: si decolla nel minimo del ciclo (A5).
4. Girare previsto: rientrare prima del girare della brezza (F3).
Output: finestra oraria + perché quella finestra (motivo fisico) + scadenza della finestra.

## P3. "Quanto salgono / qual è la base?" — quota

1. Rateo atteso da spread+CAPE+copertura (già in app) + distribuzione oraria (picco a mezzogiorno-pomeriggio).
2. Base LCL = spread × 125; **tetto reale** = min(base LCL, inversione documentata) (B1/B7).
3. Soglia = base − quota decollo → classifica volo: scorribila (< 300 m), locale (300-900), allungabile (900-1200), cross (≥ 1200 + rateo ≥ 2).
Output: base, tetto, soglia, orario del picco, giudizio una riga.

## P4. "Posso fare cross?" — adattabilità

1. Termica: rateo ≥ 2 e soglia ≥ 900 (B4/B5).
2. Vento in quota sulla rotta: contrarie ≤ 25-30 km/h (D3).
3. Atterraggi: tratti con campi raggiungibili (D1).
4. Peggioramento: OD in avvicinamento? (D2/E3).
5. Finestra residua: ore rimaste di picco.
Output: adattabile / volo locale / non oggi — con il motivo limitante (termica? vento? atterraggi? meteo?).

## P5. "C'è rischio temporale?" — convettiva profonda

1. Indici: WMO, CAPE, Lifted Index (negativo marcato = attenzione).
2. Segnali di OD: cumuli torretti, incollatura, scurimento, anvil (E3).
3. Fronte di raffiche: distanza cella → tempo di fuga (E4/E5).
Output: nessuno / avviso OD / allerta tempesta + distanza-tempo.

## P6. "Il vento è favorevole?" — vento

1. Esposizione: frontale/diagonale/laterale/coda (soglie §decollo).
2. Giornata: girare della brezza previsto (R7).
3. Quota: vento sopra cresta (rotor/onda), Foehn (A7).
4. Locale: canalloni allineati (Venturi, C6), campi sottovento a ostacoli (F2).
Output: favorevole / condizionato (girare alle h, venturi in zona X) / sfavorevole.

## P7. "Sono in volo, che faccio ora?" — in-flight (futuro: apprendere dai log)

1. Quota vs margine: sotto i 500 m sopra il terreno? → pianifica atterraggio adesso.
2. Deriva: groundspeed in calo → ricalcola glide verso atterraggi (R8).
3. Cielo avanti: si incolla → salita alta + decisione (D2).
4. Cresta: deriva verso il pendio → granchio + virate controvento (C5).
Output: continua / risalisci / rientra / atterra — un solo verbo, un solo motivo.
