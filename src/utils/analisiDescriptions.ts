"use client";

interface CurrentData {
  temp?: number;
  tempFeel?: number;
  humidity?: number;
  windSpeed?: number;
  windGust?: number;
  windDir?: string;
  clouds?: number;
  precip?: number;
  thermalStrength?: number;
  thermalDelta?: number;
  liftingIndex?: number;
  cape?: number;
  rainProb?: number;
}

interface DayData {
  tempMax?: number;
  tempMin?: number;
  windMax?: number;
  thermalMax?: number;
  thermalAvg?: number;
  rainProb?: number;
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
}

function getQualitativeDescription(value: number, thresholds: number[], labels: string[]): string {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return labels[i];
  }
  return labels[labels.length - 1];
}

export function generateSituazioneGenerale(currentData: CurrentData, dayData?: DayData): string[] {
  const lines: string[] = [];

  // Temperatura
  if (currentData.temp != null) {
    const tempDesc = getQualitativeDescription(
      currentData.temp,
      [5, 12, 18, 25, 30, 35],
      ["molto fredda", "fredda", "fresca", "mite", "calda", "molto calda", "torrida"]
    );
    let tempText = `Temperatura al suolo: intorno ai ${Math.round(currentData.temp)} °C, temperatura ${tempDesc}.`;
    if (dayData?.tempMin != null && dayData?.tempMax != null) {
      tempText += ` Il range giornaliero è compreso tra ${Math.round(dayData.tempMin)}°C e ${Math.round(dayData.tempMax)}°C`;
      const range = dayData.tempMax - dayData.tempMin;
      if (range > 15) tempText += ", con un'escursione termica significativa che favorisce lo sviluppo di termiche.";
      else if (range > 8) tempText += ", escursione termica moderata, buona per attività di volo.";
      else tempText += ", bassa escursione termica, termiche potenzialmente deboli.";
    }
    lines.push(tempText + ".");
  } else {
    lines.push("Temperatura al suolo: dati non disponibili.");
  }

  // Umidità
  if (currentData.humidity != null) {
    const umiditaDesc = getQualitativeDescription(
      currentData.humidity,
      [30, 50, 65, 80, 90],
      ["molto secca, ottima visibilità", "secca, buona visibilità", "moderata, visibilità discreta", "umida, visibilità ridotta", "molto umida, possibile foschia", "estremamente umida, scarsa visibilità"]
    );
    lines.push(`Umidità relativa: ${currentData.humidity}% — aria ${umiditaDesc}.`);
  }

  // Vento
  if (currentData.windSpeed != null) {
    let windText = `Vento: ${currentData.windSpeed} km/h`;
    if (currentData.windDir) windText += ` da ${currentData.windDir}`;
    
    const windDesc = getQualitativeDescription(
      currentData.windSpeed,
      [3, 8, 15, 25, 35, 50],
      ["calma di vento o brezza leggera, condizioni ideali per decollo",
       "vento leggero, condizioni favorevoli per volo libero",
       "vento moderato, buone condizioni per veleggiamento",
       "vento sostenuto, richiesta esperienza in quota",
       "vento forte, sconsigliato per piloti meno esperti",
       "vento molto forte, condizioni potenzialmente pericolose",
       "vento estremamente forte, attività sconsigliata"]
    );
    windText += ` — ${windDesc}`;
    if (currentData.windGust != null && currentData.windGust > currentData.windSpeed * 1.5) {
      windText += `. Attenzione alle raffiche: fino a ${currentData.windGust} km/h, con possibili turbolenze in prossimità delle creste.`;
    } else if (currentData.windGust != null) {
      windText += `. Raffiche contenute (${currentData.windGust} km/h).`;
    }
    lines.push(windText + ".");
  } else {
    lines.push("Vento: dati non disponibili.");
  }

  // Nuvolosità
  if (currentData.clouds != null) {
    let cloudText = `Cielo: `;
    const cloudDesc = getQualitativeDescription(
      currentData.clouds,
      [5, 20, 40, 60, 80],
      ["sereno o quasi sereno, condizioni ottimali per il volo",
       "poco nuvoloso, qualche velatura innocua",
       "parzialmente nuvoloso, possibile sviluppo di cumuli pomeridiani",
       "molto nuvoloso, possibili ombreggiature che riducono le termiche",
       "coperto, termiche deboli o assenti",
       "cielo molto coperto, condizioni sfavorevoli per il volo libero"]
    );
    cloudText += cloudDesc;
    
    // Aggiungi dettagli specifici basati sulla nuvolosità
    if (currentData.clouds >= 20 && currentData.clouds < 60) {
      if (currentData.rainProb != null && currentData.rainProb < 20) {
        cloudText += ", ma senza rischio di precipitazioni significative.";
      } else if (currentData.rainProb != null && currentData.rainProb < 40) {
        cloudText += ", con bassa probabilità di precipitazioni (" + currentData.rainProb + "%).";
      } else if (currentData.rainProb != null) {
        cloudText += " — probabilità di pioggia: " + currentData.rainProb + "%, consigliata cautela.";
      }
    }
    lines.push(cloudText + ".");
  }

  return lines;
}

export function generateProfiloTermico(currentData: CurrentData, dayData?: DayData): string[] {
  const lines: string[] = [];

  // Lifted Index
  if (currentData.liftingIndex != null) {
    const li = currentData.liftingIndex;
    let liText = `L'indice Lifted Index (LI) è ${li}`;
    if (li <= -6) liText += ", indicando atmosfera estremamente instabile ⚠️. Forte rischio di temporali e turbolenza severa. Volo sconsigliato.";
    else if (li <= -4) liText += ", atmosfera molto instabile ⚠️. Possibili temporali pomeridiani. Massima cautela.";
    else if (li <= -2) liText += ", atmosfera instabile. Possibile sviluppo di cumulonembi, valutare attentamente le condizioni.";
    else if (li <= 0) liText += ", atmosfera leggermente instabile. Qualche cumulo pomeridiano possibile ma senza rischi particolari.";
    else if (li <= 2) liText += ", atmosfera stabile. Scarsa probabilità di temporali, buone condizioni per il volo.";
    else if (li <= 4) liText += ", atmosfera molto stabile. Cielo generalmente sereno, termiche deboli.";
    else liText += ", atmosfera estremamente stabile. Termiche molto deboli o assenti, condizioni di volo平静e.";
    lines.push(liText + ".");
  } else if (currentData.stabilityIndex) {
    lines.push(`Indice di stabilità: ${currentData.stabilityIndex}.`);
  }

  // Termiche
  if (currentData.thermalStrength != null) {
    const ts = currentData.thermalStrength;
    let thermalText = `Termiche: ${ts.toFixed(1)} m/s`;
    if (ts < 0.3) thermalText += " — termiche assenti o debolissime, non sufficienti per sostenere il volo librato.";
    else if (ts < 0.8) thermalText += " — termiche deboli, necessaria esperienza per sfruttarle al meglio.";
    else if (ts < 1.5) thermalText += " — termiche deboli-moderate, buone per piloti esperti.";
    else if (ts < 2.5) thermalText += " — termiche moderate, condizioni gradevoli per il volo libero.";
    else if (ts < 4) thermalText += " — termiche forti, ottime per chi vuole guadagnare quota rapidamente.";
    else if (ts < 6) thermalText += " — termiche molto forti, richiesta esperienza per gestire le ascendenze.";
    else thermalText += " — termiche estremamente forti ⚠️, condizioni potenzialmente turbolente. Sconsigliato per piloti meno esperti.";

    if (dayData?.thermalMax != null) {
      thermalText += ` Massimo giornaliero previsto: ${dayData.thermalMax} m/s`;
      if (dayData.thermalMax > 5) thermalText += ", potenzialmente molto intenso.";
      else if (dayData.thermalMax > 3) thermalText += ", buona intensità.";
      else thermalText += ", intensità moderata.";
    }
    lines.push(thermalText + ".");
  } else if (currentData.thermalDelta != null) {
    const delta = currentData.thermalDelta;
    let deltaText = `Gradiente termico (ΔT): ${delta.toFixed(2)}°C`;
    if (delta < 0.3) deltaText += " — gradiente debolissimo, termiche poco probabili.";
    else if (delta < 0.6) deltaText += " — gradiente debole, termiche deboli ma possibili.";
    else if (delta < 0.9) deltaText += " — gradiente moderato, termiche discrete.";
    else if (delta < 1.2) deltaText += " — buon gradiente, termiche ben sviluppate.";
    else deltaText += " — ottimo gradiente termico, condizioni favorevoli per termiche forti.";
    lines.push(deltaText + ".");
  }

  // CAPE
  if (currentData.cape != null) {
    let capeText = `CAPE: ${currentData.cape} J/kg`;
    if (currentData.cape < 100) capeText += " — energia convettiva molto bassa, temporali improbabili.";
    else if (currentData.cape < 300) capeText += " — energia convettiva bassa, sviluppo di cumuli possibile ma limitato.";
    else if (currentData.cape < 600) capeText += " — energia convettiva moderata, possibili temporali isolati.";
    else if (currentData.cape < 1000) capeText += " — energia convettiva significativa, possibile attività temporalesca.";
    else if (currentData.cape < 2000) capeText += " — energia convettiva elevata ⚠️, rischio di temporali forti.";
    else capeText += " — energia convettiva molto elevata ⚠️, pericolo di temporali violenti.";
    lines.push(capeText + ".");
  }

  return lines;
}

export function generateVentoQuota(currentData: CurrentData): string[] {
  const lines: string[] = [];

  if (currentData.windDir) {
    let text = `Il profilo del vento mostra direzione prevalente da ${currentData.windDir}`;
    
    if (currentData.windSpeed != null) {
      if (currentData.windSpeed < 5) {
        text += ", con vento molto debole in superficie. In quota il vento potrebbe essere più sostenuto, ma generalmente gestibile.";
      } else if (currentData.windSpeed < 12) {
        text += ", vento leggero in superficie. Condizioni favorevoli per volo libero su tutte le quote.";
      } else if (currentData.windSpeed < 20) {
        text += ", vento moderato in superficie. In quota l'intensità aumenta, ma rimane gestibile per piloti esperti.";
      } else if (currentData.windSpeed < 30) {
        text += ", vento sostenuto. Si consiglia attenzione in quota, specialmente sopra i 2000 m.";
      } else {
        text += ", vento forte. Sconsigliato il volo per piloti meno esperti, specialmente in quota.";
      }
    }

    // Turbolenza potenziale
    if (currentData.windGust != null && currentData.windSpeed != null) {
      const gustFactor = currentData.windGust / currentData.windSpeed;
      if (gustFactor > 2) {
        text += " Attenzione: le raffiche sono molto intense rispetto al vento medio, segno di possibile turbolenza meccanica.";
      } else if (gustFactor > 1.5) {
        text += " Possibile turbolenza moderata in prossimità delle creste e dei versanti esposti.";
      }
    }

    lines.push(text + ".");
  } else {
    lines.push("Direzione del vento: dati non disponibili.");
  }

  // Inversione termica
  if (currentData.temp != null && currentData.clouds != null && currentData.clouds < 30) {
    lines.push("Non si osservano condizioni di inversione termica significativa: la temperatura segue il gradiente adiabatico secco, segno di buon rimescolamento atmosferico e termiche ben sviluppate.");
  } else if (currentData.clouds != null && currentData.clouds > 70) {
    lines.push("La copertura nuvolosa potrebbe limitare il riscaldamento solare e ridurre lo sviluppo di termiche. Possibile inversione termica in quota.");
  }

  return lines;
}

export function generateInterpretazione(currentData: CurrentData): string[] {
  const lines: string[] = [];

  // Condizioni generali
  const conditions: string[] = [];
  if (currentData.windSpeed != null) {
    if (currentData.windSpeed < 12) conditions.push("vento ideale");
    else if (currentData.windSpeed < 20) conditions.push("vento gestibile");
    else if (currentData.windSpeed < 30) conditions.push("vento sostenuto");
    else conditions.push("vento forte");
  }

  if (currentData.clouds != null) {
    if (currentData.clouds < 30) conditions.push("cielo sereno");
    else if (currentData.clouds < 60) conditions.push("cielo parzialmente nuvoloso");
    else conditions.push("cielo coperto");
  }

  if (currentData.thermalStrength != null) {
    if (currentData.thermalStrength > 2) conditions.push("termiche attive");
    else if (currentData.thermalStrength > 0.5) conditions.push("termiche deboli");
    else conditions.push("termiche assenti");
  }

  if (conditions.length > 0) {
    lines.push(`Condizioni: ${conditions.join(", ")}.`);
  }

  // Rischio pioggia/temporali
  if (currentData.rainProb != null) {
    let rainText = "";
    if (currentData.rainProb < 10) {
      rainText = "Nessun rischio di precipitazioni. Condizioni ideali per attività outdoor.";
    } else if (currentData.rainProb < 30) {
      rainText = `Bassa probabilità di pioggia (${currentData.rainProb}%). Rischio minimo, ma tenere d'occhio l'evoluzione.`;
    } else if (currentData.rainProb < 50) {
      rainText = `Probabilità moderata di pioggia (${currentData.rainProb}%). Possibili rovesci isolati, consigliata cautela.`;
    } else {
      rainText = `Alta probabilità di pioggia (${currentData.rainProb}%). Si sconsiglia il volo in caso di precipitazioni.`;
    }
    lines.push(rainText);
  }

  // Raccomandazioni
  if (currentData.windGust != null && currentData.windGust > 30) {
    lines.push("Attenzione: vento forte in quota. Si consiglia di rimanere a quote moderate o valutare l'opportunità del volo.");
  } else if (currentData.windSpeed != null && currentData.windSpeed > 25) {
    lines.push("Vento sostenuto: consigliata esperienza e attenzione nelle manovre di atterraggio.");
  }

  return lines;
}