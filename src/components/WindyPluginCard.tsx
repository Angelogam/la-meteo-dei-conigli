"use client";

import React from "react";
import { CloudDownload, Download } from "lucide-react";

interface WindyPluginResult {
  site: string;
  url: string;
  description: string;
  success: boolean;
  content?: string;
  error?: string;
}

interface WindyPluginCardProps {
  plugin: WindyPluginResult;
  onDownload?: (content: string) => void;
}

export default function WindyPluginCard({ plugin, onDownload }: WindyPluginCardProps) {
  if (!plugin || !plugin.success) {
    return null;
  }

  return (
    <div className="bg-slate-900/90 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudDownload className="w-5 h-5 text-sky-400" />
            <span className="text-sm font-black text-white">Windy Plugin PG Soundings</span>
          </div>
          <span className="text-xs text-slate-500 font-semibold">1.6.2</span>
        </div>
      </div>

      {/* Dettagli Plugin */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-slate-400 text-xs">Sito:</span>
          <a
            href={plugin.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 text-sm font-medium hover:underline"
          >
            {plugin.site}
          </a>
        </div>

        {plugin.description && (
          <p className="text-slate-400 text-sm mb-4">
            {plugin.description}
          </p>
        )}

        {/* Anteprima contenuto */}
        {plugin.content && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 text-slate-300 text-xs overflow-auto">
            <div className="whitespace-pre-wrap break-all">
              {plugin.content.substring(0, 500)}
              {plugin.content.length > 500 && (
                <div className="mt-2 text-slate-500/60 text-xs">
                  ...(mostra {plugin.content.length} caratteri totali)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pulsante Download */}
        {plugin.content && (
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <button
              onClick={() => onDownload?.(plugin.content)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-center gap-2">
                <Download className="w-3.5 h-3.5" />
                <span>Scarica Plugin PG Soundings</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}