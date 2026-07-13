// Estrai allWeatherData dall'hook
const {
  // ... tutti gli altri
  allWeatherData,
} = useWeatherData();

// Passalo a DecolloList
<DecolloList
  decolli={DECOLLI.map(d => ({ id: d.id, name: d.name, valley: d.valley, exposure: d.exposure, alt: d.altitude }))}
  selectedId={selectedId}
  onSelect={setSelectedId}
  currentData={allWeatherData[selectedId] || currentData}
  allWeatherData={allWeatherData}
/>