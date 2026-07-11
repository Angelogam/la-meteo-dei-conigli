if (goodHours.length > 0) {
    const hours = goodHours.map((h: any) => `${String(h.time.getHours()).padStart(2, '0')}:00`).join(', ');
    desc += `   • 🕐 ${hours}\n`;
  } else {
    desc += `   • ⚠️ Nessuna ora ottimale identificata.\n`;
  }