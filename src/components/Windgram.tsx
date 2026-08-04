"use client";

import React from "react";

export interface WindgramProps {
  lat?: number;
  lon?: number;
  currentData?: any;
}

export const Windgram: React.FC<WindgramProps> = ({ lat, lon, currentData }) => {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <h3 className="font-bold text-gray-800 mb-2">Windgram Aerologico</h3>
      <p className="text-xs text-gray-500">
        Coordinate: {lat ?? '-'}, {lon ?? '-'}
      </p>
    </div>
  );
};

export default Windgram;