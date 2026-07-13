// ... (tutto il resto del file rimane identico, cambia solo la mappatura rating)

        // Valutazione volo
        let voloRating = "BUONO";
        let voloColor = "text-emerald-400 bg-emerald-500/10";
        if (vento > 25 || raffica > 35 || turbolenza > 4) {
          voloRating = "VENTOSO";
          voloColor = "text-amber-400 bg-amber-500/10";
        } else if (vento > 18 || copertura > 70 || pioggia > 30) {
          voloRating = "IMPEGNATIVO";
          voloColor = "text-orange-400 bg-orange-500/10";
        } else if (vento < 5) {
          voloRating = "DEBOLE";
          voloColor = "text-sky-300 bg-sky-500/10";
        }