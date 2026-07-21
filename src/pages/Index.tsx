// ... existing code ...

            {!hasData && (
              <div className="text-center py-12 text-slate-400">
                {weatherError ? (
                  <p className="text-red-400 text-sm font-semibold">
                    Connessione fallita — impossibile ottenere i dati meteo
                  </p>
                ) : (
                  <p className="text-yellow-400 text-sm">
                    Nessun dato meteo disponibile per {site?.name || "questo decollo"}.
                    Verifica la connessione o riprova.
                  </p>
                )}
              </div>
            )}

  // ... existing code ...