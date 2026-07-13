// WindProfile reale dai dati di vento in quota (se disponibili)
  const windProfile = useMemo(() => {
    if (!currentData) return [];
    if (!currentData.windProfile) return getWindProfile(currentData.windSpeed || 0, currentData.windDir || 0);
    
    return currentData.windProfile.map((level: any) => ({
      alt: level.height,
      speed: level.speed != null ? Math.round(level.speed * 10) / 10 : 0,
      dir: level.dir != null ? Math.round(level.dir) : 0,
      dirName: getWindDirName(level.dir != null ? Math.round(level.dir) : 0),
    }));
  }, [currentData]);

  const weatherAlert = useMemo(() => currentData ? getWeatherAlert(currentData, thermalDelta) : { level: 'info' as const, message: 'Caricamento...', icon: 'ℹ️' }, [currentData, thermalDelta]);
  const stabilityIndex = useMemo(() => currentData ? getStabilityIndex(currentData.temperature, currentData.humidity, currentData.cloudCover) : { label: '--', color: '#888' }, [currentData]);
  const thermalStrength = useMemo(() => currentData ? getThermalStrength(currentData.temperature, currentData.cloudCover, currentData.humidity, thermalDelta) : { label: '--', color: '#888' }, [currentData, thermalDelta]);