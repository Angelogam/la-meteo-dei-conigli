# 6. CASI REALI — documentati, con fonte

Usati come test di regressione: il copilota DEVE sconsigliare/avvisare in queste situazioni.

## C1. Ewa Wiśnierska — risucchiata da un cumulonembo (2007)
Circostanza: campionessa tedesca in allenamento durante i Mondiali in Australia; risucchiata da un cumulonembo sviluppatosi rapidamente fino a ~10.000 m, con formazione di ghiaccio e fulmini attorno; è sopravvissuta.
Lezione per il copilota: il sovrasviluppo non avvisa chi è in volo basso; l'unico tempo di reazione è PRIMA — l'app deve allertare OD quando i cumuli si incollano, non quando il cielo è nero. (Fonte: ricostruzione ampiamente documentata; scheda su reddit/r/todayilearned e stampa di settore.)
Verifica del copilota: situazione E5/R5 → verdetto atteso: allerta tempesta quando la cella è a 15 km, non a 2 km.

## C2. Risucchio in cumulonembo raccontato dalla pilota (2024)
Circostanza: pilota statunitense risucchiata in un Cb mentre volava; racconto diretto dell'evento (People, 18/9/2024) — "inghiottita dalla nube nera, lampi attorno".
Lezione: lo stesso meccanismo del 2007 si ripete oggi; la regola "c'è un Cb in formazione → non si vola l'area" non ammette eccezioni. (Fonte: https://people.com/woman-survived-getting-sucked-into-storm-while-paragliding-exclusive-8699609 )
Verifica: E4 → atterraggio preventivo.

## C3. Statistica DHV — 48 incidenti mortali (2018-2022)
Circostanza: analisi DHV sui piloti tedeschi, ~10 morti l'anno, casa ed estero.
Lezione: la fatalità media è bassa ma costante; le catene di errori (R10) pesano più dei singoli parametri: il copilota deve pesare il contesto (pressione del gruppo, sito sconosciuto) oltre ai numeri. (Fonte: analisi DHV citata da articoli di settore, es. "Is paragliding safe?" 2026.)
Verifica: G4 → il verdetto dichiara il bias quando l'utente insiste.

## C4. Studio lesioni (Canbek 2015)
Circostanza: caratterizzazione clinica degli infortuni da parapendio: fratture nel 42-89% dei casi, prevalentemente arti inferiori (29-56%).
Lezione: gli atterraggi forzati sono la lesione tipica → le regole su rotor, gradiente, campo sottovento (R2/R9/F2) sono le più "frequenti" da far rispettare, non solo le più drammatiche. (Fonte: Characteristic injuries paragliding accidents, Canbek et al. 2015.)
Verifica: R9 → il copilota avvisa su finali sottovento a ostacoli.

## C5. Vento del Maloja — brezza di valle che supera il passo
Circostanza: la brezza di valle d'inverno/pomeriggio spinge oltre il Maloja fino a Samedan/Zuoz con raffiche 30-50 km/h (MeteoSvizzera).
Lezione: le brezze non si fermano al passo: il girare del vento in valle è prevedibile e locale → l'app deve leggere l'orologia della brezza, non solo il vento istantaneo. (Fonte: MeteoSvizzera, brezza di monte e di valle.)
Verifica: R7/F3 → avviso "il campo sarà sottovento alle 15".

## C6. Inversione invalicabile (Brianza, 23/4/1987)
Circostanza: caso reale analizzato nel manuale di volo libero: inversione 2400-2600 m che ferma ogni ascendenza.
Lezione: la base LCL da spread può essere MENTITRICE se c'è un'inversione più bassa → l'app deve dichiarare il tetto reale dai profili di temperatura (ha i dati). (Fonte: manualedivololibero meteo04.)
Verifica: B7 → "tetto reale 2400 m (inversione), base di carta 2900 m".

## C7. Foehn/vento valicante con suolo calmo (prassi alpina, FAA AC 00-57)
Circostanza: categoria di incidenti/ quasi-incidenti documentati in aviazione e volo libero: suolo calmo, vento forte e onde in quota; rotori severi di sottovento (SKYbrary mountain waves; FAA Advisory Circular 00-57 "Hazardous Mountain Winds").
Lezione: il suolo calmo NON certifica l'aria di sopra; il windgram ai livelli di volo è l'autorità. (Fonti: skybrary.aero/articles/mountain-waves; FAA AC 00-57.)
Verifica: A7/R4 → veto con vento in quota > 40-50 km/h.
