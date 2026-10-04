"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";

export default function ApiTest() {
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; detail?: string } | null>(null);
  const [rawResponse, setRawResponse] = useState<string>("");

  async function loadPeople() {
    setLoading(true);
    setRawResponse("");
    try {
      const res = await fetch("/api/people");
      const data = await res.json();
      setPeople(data.items || []);
      setRawResponse(JSON.stringify(data, null, 2));
      if (data.ok) {
        setMessage({ type: "success", text: `✅ Caricate ${data.total} persone` });
      } else {
        setMessage({ type: "error", text: "❌ Errore nel caricamento" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: `❌ Errore: ${err.message}` });
      setRawResponse(err.toString());
    } finally {
      setLoading(false);
    }
  }

  async function addPerson() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Test-${Date.now().toString().slice(-4)}`,
          email: `test${Date.now()}@example.com`,
          phone: "+39 123 456 7890",
          notes: "Persona di test aggiunta via API",
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({ type: "success", text: `✅ Salvata: ${data.person.name} (totale: ${data.total})` });
        loadPeople();
      } else {
        setMessage({ type: "error", text: `❌ Errore: ${data.statusMessage || "Errore sconosciuto"}` });
      }
      setRawResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setMessage({ type: "error", text: `❌ Errore: ${err.message}` });
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    try {
      // Non c'è endpoint DELETE, quindi ricarichiamo la lista vuota
      // Ricaricando senza aggiungere nulla
      await loadPeople();
      setMessage({ type: "success", text: "📋 Lista ricaricata" });
    } catch (err: any) {
      setMessage({ type: "error", text: `❌ Errore: ${err.message}` });
    }
  }

  useEffect(() => {
    loadPeople();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-black text-emerald-400">🧪 Test API /api/people</h1>

        {/* Status */}
        <div className={`p-4 rounded-xl border ${
          message?.type === "success"
            ? "bg-emerald-900/30 border-emerald-500/40"
            : message?.type === "error"
              ? "bg-red-900/30 border-red-500/40"
              : "bg-slate-800/30 border-slate-700/50"
        }`}>
          <div className="flex items-center gap-3">
            {message?.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
             message?.type === "error" ? <XCircle className="w-5 h-5 text-red-400" /> :
             <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? "animate-spin" : ""}`} />}
            <span className="font-bold">{message?.text || "In attesa..."}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={loadPeople}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg font-bold transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Ricarica
          </button>
          <button
            onClick={addPerson}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            {saving ? "Aggiunta..." : "Aggiungi Persona"}
          </button>
        </div>

        {/* People List */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4">
          <h2 className="text-lg font-black text-white mb-4">Persone ({people.length})</h2>
          {people.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Nessuna persona salvata</p>
          ) : (
            <div className="space-y-2">
              {people.map((person) => (
                <div key={person.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30">
                  <div>
                    <div className="font-bold text-white">{person.name}</div>
                    <div className="text-xs text-slate-400">
                      {person.email && `${person.email} • `}
                      {person.phone && `${person.phone} • `}
                      {person.createdAt && new Date(person.createdAt).toLocaleString("it-IT")}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{person.id.slice(-8)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Raw Response */}
        {rawResponse && (
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4">
            <h2 className="text-lg font-black text-white mb-3">Risposta RAW</h2>
            <pre className="bg-slate-950 rounded-lg p-4 text-xs text-emerald-400 overflow-x-auto max-h-64">
              {rawResponse}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
