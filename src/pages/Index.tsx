"use client";

import React, { useEffect, useState, useCallback } from "react";
import WeatherApp from "@/components/WeatherApp";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <WeatherApp />
    </div>
  );
}