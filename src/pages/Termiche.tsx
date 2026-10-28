"use client";

import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import CartinaMeteo from "@/components/CartinaMeteo";
import { useThreeSourceWeather } from "@/hooks/useThreeSourceWeather";
import "./termiche-page.css";

/**
 * TERMICHE — la pagina della CARTINA AEROLOGICA, a tutto schermo, come
 * meteo-parapente.com: campo termico sul terreno reale, vento animato
 * alle quote del sounding, timeline della giornata e scheda di volo
 * di ogni decollo. Niente distrazioni: la mappa è la protagonista.
 */
export default function Termiche() {
  const { mergedDecolli, updating, error } = useThreeSourceWeather();

  return (
    <div className="thm-shell min-h-screen">
      <Header />
      <main className="thm-main">
        <header className="thm-head">
          <p className="thm-kicker">CARTINA AEROLOGICA · SISTEMA METEO-PARAPENTE</p>
          <h1>Dove nascono le termiche, ora per ora</h1>
          <p className="thm-sub">
            Il campo di ascendenze è calcolato sul terreno reale (DEM) con il sole dell'ora:
            tocca «Riproduci» per vedere la giornata animarsi, passa al livello Vento per le
            correnti alle quote del sounding, tocca un decollo per la scheda di volo completa.
          </p>
          {(updating || error) && (
            <p className={"thm-status" + (error ? " is-error" : "")}>
              {updating ? "Carico il modello dei 24 decolli…" : "Modello non disponibile: riprovo a breve."}
            </p>
          )}
        </header>
        <CartinaMeteo decolli={mergedDecolli} />
        <section className="thm-manual" aria-label="Elementi di meteorologia applicata al volo">
          <h2>Leggere la cartina come un pilota</h2>
          <div className="thm-manual-grid">
            <article>
              <h3><span>01</span>Il ciclo del sole</h3>
              <p>
                Le bolle nascono dove il sole scalda il pendio: al mattino i versanti Est e Sud-Est,
                a mezzogiorno i Sud, nel pomeriggio gli Ovest e Sud-Ovest. Muovi la timeline e guarda
                il campo colorato ruotare con il sole: è la regola più affidabile per scegliere l'ora
                e il decollo giusto.
              </p>
            </article>
            <article>
              <h3><span>02</span>Pendenza e crinali</h3>
              <p>
                I generatori migliori sono i versanti tra 15° e 40° prativi e esposti: le zone in
                giallo e arancio della cartina. Le bolle si staccano vicino ai crinali e vengono
                spinte sottovento: cerca le ascendenze un po' a valle del rilievo, non esattamente sopra.
              </p>
            </article>
            <article>
              <h3><span>03</span>Vento metasto</h3>
              <p>
                Sul livello Vento, quota dopo quota, vedi il vento libero del modello. Se in quota
                spinge contro la brezza di valle si forma il vento metasto: raffiche disordinate e
                zone di caduta. Più le due correnti sono allineate, più il giorno è volabile.
              </p>
            </article>
            <article>
              <h3><span>04</span>Nuvole e base</h3>
              <p>
                La base dei cumuli (pannello del decollo) è il tetto delle bolle: sopra quella quota
                la termica muore e inizia la nuvoletta. Con copertura sopra il 70% il sole non scalda
                più il suolo e la convezione si spegne: nelle giornate blu della cartina resta a terra.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
