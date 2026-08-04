import React, { useState } from 'react';
import { Decollo } from '../types/volo';
import { Windgram } from '../components/Windgram';
import { useWeatherData, HourData, DailyData } from '../hooks/useWeatherData';

interface UpdateTimerProps {
  updating?: boolean; // Risolve TS2322
  lastUpdated?: Date;
}

const UpdateTimer: React.FC<UpdateTimerProps> = ({ updating = false, lastUpdated }) => (
  <div className="text-xs text-gray-500">
    {updating ? 'Aggiornamento in corso...' : `Ultimo aggiornamento: ${lastUpdated?.toLocaleTimeString() ?? 'N/D'}`}
  </div>
);

export const Index: React.FC = () => {
  const [decolloSelezionato] = useState<Decollo>({
    id: 'rucas',
    nome: 'Rucas',
    lat: 44.75,
    lon: 7.16,
    quota: 1550,
    valley: 'Val Pellice', // Risolve TS2551
    esposizione: 'SE'
  });

  const { hourlyData, dailyData, loading } = useWeatherData(decolloSelezionato.lat, decolloSelezionato.lon);

  // Mismatch DailyData[] vs HourData[] risolto explicitando la sorgente oraria corretta
  const currentHourlyList: HourData[] = hourlyData.length > 0 
    ? hourlyData 
    : (dailyData[0]?.hours ?? []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">MeteoParapendio - {decolloSelezionato.nome}</h1>
        <UpdateTimer updating={loading} lastUpdated={new Date()} />
      </div>

      <p className="text-sm text-gray-600">Valle: {decolloSelezionato.valley}</p>

      {/* Prop lat, lon e currentData passati correttamente per risolvere TS2322 */}
      <Windgram 
        lat={decolloSelezionato.lat} 
        lon={decolloSelezionato.lon} 
        currentData={currentHourlyList} 
      />
    </div>
  );
};

export default Index;