"use client";

import React from "react";

//... (rest of the component remains the same)

        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-700/30">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400" /> {"<="}8</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-lime-400" /> 9–15</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400" /> 16–22</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400" /> 23–30</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400" /> > 30 km/h</span>
          <span className="ml-2 flex items-center gap-1"><span className="text-emerald-400">🪂</span> Decollo</span>
        </div>
      </div>
    </div>
  );
}