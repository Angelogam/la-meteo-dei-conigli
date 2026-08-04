"use client";

import React from "react";

interface VentiInterpolatiTabProps {
  currentData?: any;
  lat?: number;
  lon?: number;
  quota?: number;
}

export const VentiInterpolatiTab: React.FC<VentiInterpolatiTabProps> = ({
  currentData,
  lat,
  lon,
  quota
}) => {
  return (
    <div className="p-4 bg-white rounded-xl">
      <h3 className="font-bold mb-2">Venti Interpolati</h3>
      <div className="text-xs text-gray-600">
        <p>Lat: {lat ?? 'N/D'} | Lon: {lon ?? 'N/D'} | Quota: {quota ?? 'N/D'}m</p>
      </div>
    </div>
  );
};

export default VentiInterpolatiTab;