/* MeteoTesterPanel è già un pannello a schermo intero con pulsante X per chiudersi.
   Ma ora lo vogliamo controllare dall'esterno, quindi aggiungo onClose come prop.
   Se non passa, funziona come prima (si apre/chiude da sé). */

// … lascio invariato tutto il codice… solo aggiungo "onClose?: () => void" alle props e la uso al posto di setIsOpen(false)