"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Clock } from "lucide-react";

interface UpdateTimerProps {
  lastUpdate: Date | null;
  countdown: number;
  updating?: boolean;
  onRefresh?: () => Promise<void>;
}

export default function UpdateTimer({ lastUpdate, countdown, updating, onRefresh }: UpdateTimerProps) {
  const [timeLeft, setTimeLeft] = useState(countdown);

  useEffect(() => {
    setTimeLeft(countdown);
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Clock className="h-4 w-4" />
      <span>{lastUpdate ? lastUpdate.toLocaleTimeString() : "Never"}</span>
      {updating && <span className="text-xs text-emerald-400">Updating...</span>}
      <span>•</span>
      <span>{formatTime(timeLeft)}</span>
      <button
        onClick={handleRefresh}
        className="p-1 rounded hover:bg-gray-200"
        aria-label="Refresh"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}