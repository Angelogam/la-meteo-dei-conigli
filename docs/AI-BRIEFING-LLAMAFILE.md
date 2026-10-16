# Collegare il briefing AI remoto a Vercel con llmfaucet

Questa guida descrive il collegamento del briefing AI di La Meteo dei Conigli a llmfaucet, un gateway remoto compatibile con l'API OpenAI. Non serve installare un modello sul PC e non serve mantenere il computer acceso.

## Servizio remoto

- API base URL: `https://api.llmfaucet.dev/v1`
- Modello selettore predefinito: `auto:fast`
- Autenticazione anonima documentata: `Authorization: Bearer free`
- Il gateway dichiara un limite gratuito condiviso di 20 richieste al giorno per IP anonimo. La capacità e i limiti possono cambiare; il servizio è indicato per prototipi e sperimentazione, non per attività critiche.

Documentazione ufficiale: https://github.com/llmfaucet/llmfaucet

## Configurazione del progetto Vercel

Il backend `/api/ai-briefing` usa per impostazione predefinita llmfaucet. Le seguenti variabili sono facoltative:

- `LLMFAUCET_BASE_URL`: lasciare vuota per usare `https://api.llmfaucet.dev/v1`. Se impostata, deve essere un URL HTTPS che termina in `/v1`.
- `LLMFAUCET_MODEL`: lasciare vuota per usare `auto:fast`.
- `LLMFAUCET_API_KEY`: lasciare vuota per usare l'accesso anonimo documentato (`free`). Se si crea una chiave personale su llmfaucet, inserirla qui come variabile segreta server-side.

Per impostare una chiave personale, apri Vercel → progetto → Settings → Environment Variables e aggiungi `LLMFAUCET_API_KEY` per gli ambienti desiderati. Non inserirla nel codice React, nei file pubblici `.env`, nei commit GitHub o nella chat. Dopo aver cambiato le variabili, esegui un nuovo deployment.

## Flusso e sicurezza

1. Il browser invia i dati orari selezionati al backend `/api/ai-briefing`.
2. Il backend Vercel invia i dati a llmfaucet con una richiesta HTTPS.
3. Il risultato del modello torna al backend e viene mostrato nel pannello AI.

La chiave, se configurata, resta nel backend e non viene esposta al browser. Il servizio remoto riceve i dati meteo inviati per generare il briefing; non inviare dati personali non necessari. Il gateway gratuito può essere soggetto a limiti, code, indisponibilità o cambiamenti nei provider.

## Test

1. Apri la distribuzione Vercel e seleziona un decollo e un giorno con dati orari.
2. Premi **Analizza le previsioni**.
3. Se il servizio restituisce un errore, controlla i log della funzione Vercel `/api/ai-briefing` e riprova dopo qualche minuto se si tratta di un limite temporaneo.

Il briefing aiuta a leggere i dati meteorologici ma non certifica la sicurezza del volo, non sostituisce i bollettini ufficiali e non autorizza il decollo.

## Stato di verifica

Il codice è stato aggiornato per puntare al gateway remoto. Questo aggiornamento non equivale a un test end-to-end: prima di considerarlo funzionante occorre eseguire build/checks del progetto e provare una richiesta dal deployment. La PR rimane aperta e non unita.
