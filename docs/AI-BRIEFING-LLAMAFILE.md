# Assistente AI per La Meteo dei Conigli

Il pannello **Briefing per il volo** invia al backend solo le previsioni orarie del giorno selezionato. Il backend `/api/ai-briefing` inoltra i dati a un server llamafile che espone l'API compatibile OpenAI `/v1/chat/completions`.

## Configurazione richiesta su Vercel

In **Project → Settings → Environment Variables**, aggiungere:

- `LLAMAFILE_BASE_URL`: URL raggiungibile **dal backend Vercel** fino alla base API, per esempio `https://ai.example.net/v1`. Non usare `http://localhost:8080/v1`: localhost su Vercel è il server cloud, non il PC Windows.
- `LLAMAFILE_MODEL` (facoltativo): nome modello accettato dal server, altrimenti `local-model`.
- `LLAMAFILE_API_KEY` (facoltativo): token se il servizio è protetto.

Dopo aver salvato le variabili, ridistribuire il progetto. Il server llamafile deve essere già avviato e raggiungibile tramite HTTPS o una rete privata affidabile. Non esporre direttamente un server llamafile non protetto a Internet; usare un reverse proxy con autenticazione e limiti di traffico.

## Verifica

1. Aprire la app distribuita su Vercel.
2. Selezionare un decollo e una giornata con dati.
3. Premere **Analizza le previsioni** nel pannello Assistente meteo AI.
4. Se la configurazione manca, il pannello mostra un messaggio esplicativo; se il server non risponde, mostra un errore senza interrompere le previsioni meteo.

## Limiti

L'AI interpreta i dati ricevuti; non fornisce dati meteo autonomi, non certifica la sicurezza del volo e può sbagliare. I dati meteo originali e le formule esistenti non vengono sostituiti. Il pannello non genera richieste AI automaticamente: parte solo quando l'utente preme il pulsante.
