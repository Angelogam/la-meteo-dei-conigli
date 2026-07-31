import React from "react";
export default function TermicheAquila({ data }: any) {
  if (!data || !data.length) return null;
  return React.createElement(
    "div",
    { className: "p-4 bg-slate-800/40 rounded-xl border border-slate-700/40" },
    React.createElement("h3", { className: "text-sm font-bold text-orange-300 mb-3" }, "Intensità termica"),
    React.createElement(
      "div",
      { className: "flex gap-2 h-28" },
      data.map((d: any) =>
        React.createElement(
          "div",
          { key: d.hour, className: "flex-1 text-center" },
          React.createElement("div", { className: "text-xs text-orange-200 font-bold" }, d.speed.toFixed(1)),
          React.createElement("div", {
            className: "w-full bg-slate-700/50 rounded-t",
            style: { height: Math.min(80, Math.max(4, d.speed * 20)) + "px" },
          }),
          React.createElement("div", { className: "text-[8px] text-slate-500" }, d.hour)
        )
      )
    )
  );
}