# Avvio di llamafile su Windows e collegamento a Vercel

Questa guida completa la PR #20. Il codice dell'app è predisposto, ma il servizio AI deve essere avviato e raggiungibile prima che il pulsante funzioni online.

## Importante: cosa posso configurare dal repository

Posso preparare codice e istruzioni in GitHub. Non posso avviare un processo sul tuo PC, creare un servizio cloud nel tuo account o salvare variabili nel tuo progetto Vercel senza accesso esplicito a quegli ambienti. Non incollare token o password in GitHub o in chat.

## 1. Avviare llamafile su Windows

1. Segui le istruzioni aggiornate del progetto ufficiale: https://github.com/mozilla-ai/llamafile
2. Scarica un modello llamafile compatibile con la memoria del PC e verifica la licenza del modello.
3. Avvia il file seguendo le istruzioni incluse nel download. In modalità server, l'API compatibile OpenAI è normalmente disponibile sotto `/v1`, ad esempio `http://127.0.0.1:8080/v1`.
4. Dal PC verifica `http://127.0.0.1:8080/v1/models` oppure usa il comando di test indicato dalla documentazione della versione scaricata.

L'indirizzo `127.0.0.1` o `localhost` **non è raggiungibile da Vercel**: lì indica il server cloud di Vercel, non il tuo PC.

## 2. Rendere il servizio raggiungibile in modo sicuro

Scegli una soluzione:
- **Server privato o cloud che controlli:** esponi l'API tramite HTTPS, autenticazione e limiti di richieste.
- **PC Windows sempre acceso:** configura un tunnel privato autenticato tramite un provider affidabile, senza aprire direttamente la porta 8080 su Internet. Il PC deve restare acceso e connesso.
- **Servizio gestito:** usa un endpoint di inferenza compatibile con l'API OpenAI, se preferisci non gestire un server.

Non pubblicare un endpoint llamafile aperto e senza autenticazione. Non disabilitare firewall o protezioni di Windows.

## 3. Configurare Vercel

Nel progetto Vercel apri **Settings → Environment Variables** e imposta:
- `LLAMAFILE_BASE_URL`: URL HTTPS della base API raggiungibile dal backend, con `/v1` finale, ad esempio `https://ai.example.net/v1`.
- `LLAMAFILE_MODEL`: nome esposto dal server, se necessario.
- `LLAMAFILE_API_KEY`: token se il server è protetto da Bearer token.

Salva le variabili per l'ambiente corretto e fai un nuovo deploy. Non mettere queste variabili nel codice React, in file pubblici `.env` o nel repository.

## 4. Testare l'app

Apri la distribuzione Vercel, seleziona un decollo e una giornata con dati e premi **Analizza le previsioni**. Se compare un errore, controlla i log della funzione `/api/ai-briefing` e che il server AI sia raggiungibile dal backend.

## Costi e limiti

Eseguire il modello sul tuo PC può evitare il costo per singola chiamata di un servizio AI esterno, ma richiede risorse hardware, elettricità e che il PC resti acceso. Un server cloud può avere costi. Il briefing è un aiuto alla lettura delle previsioni, non un via libera al volo.
