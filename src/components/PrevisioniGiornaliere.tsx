// ... existing code ...

      {/* Finestre meteo con tutti i campi */}
      <div className="space-y-4">
        <FinestraSemplice
          titolo="Mattina — Malanotte (21/07)"
          giudizio="Buono per volo tranquillo"
          vento="NW 9 km/h"
          temperatura="16–17°C"
          termiche="0.3 m/s (deboli)"
          finestra="9:30 – 11:30"
          base="~2000 m"
          top="~2400 m"
          umidita="55%"
          pressione="1015 hPa"
          cielo="Cumuli sparsi"
          note="Base intorno ai 2000 m, possibili cumuli sparsi."
        />
        <FinestraSemplice
          titolo="Pomeriggio — Malanotte (21/07)"
          giudizio="Giornata stabile, aria secca"
          vento="S 6 km/h"
          temperatura="19–20°C"
          termiche="0.1 m/s (molto deboli)"
          finestra="14:00 – 17:00"
          base="~2100 m"
          top="~2400 m"
          umidita="45%"
          pressione="1016 hPa"
          cielo="Sereno"
          note="Base 2100–2400 m, condizioni regolari."
        />
        <FinestraSemplice
          titolo="Sera — Malanotte (21/07)"
          giudizio="Buono per restituzione"
          vento="NW 8 km/h"
          temperatura="17–19°C"
          termiche="0.2 m/s (residue)"
          finestra="18:00 – 20:00"
          base="~2000 m"
          top="~2300 m"
          umidita="50%"
          pressione="1015 hPa"
          cielo="Poco nuvoloso"
          note="Base 2000–2300 m, aria più umida."
        />
      </div>
    </div>
  );
}