// ... resto invariato fino a windProfile

  const windProfile = useMemo(() => {
    const raw = currentData ? getWindProfile(currentData.windSpeed, currentData.windDir) : [];
    return raw.map((w: any) => ({
      height: w.alt ?? w.height ?? 0,
      speed: w.speed ?? 0,
      dir: w.dir ?? 0,
    }));
  }, [currentData]);

  // ... resto del componente