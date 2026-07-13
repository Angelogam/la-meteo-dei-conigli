const windProfile = useMemo(() => {
    const raw = currentData ? getWindProfile(currentData.windSpeed, currentData.windDir) : [];
    return raw.map((w: any) => {
      const dir = w.dir ?? 0;
      const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      return {
        alt: w.alt ?? w.height ?? 0,
        speed: w.speed ?? 0,
        dir,
        dirName: dirs[Math.round(dir / 45) % 8],
      };
    });
  }, [currentData]);