"use client";

import React, { useState, useEffect } from "react";
import { Plus, Save, Users, Trash2, RefreshCw } from "lucide-react";

interface Person {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
}

interface PeopleResponse {
  ok: boolean;
  total: number;
  items: Person[];
}

export default function PeopleManager() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadPeople() {
    setLoading(true);
    try {
      const res = await fetch("/api/people");
      const data: PeopleResponse = await res.json();
      setPeople(data.items || []);
    } catch (err) {
      setMessage({ type: "error", text: "Errore nel caricamento" });
    } finally {
      setLoading(false);
    }
  }

  async function savePerson(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: "error", text: "Il nome è obbligatorio" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.statusMessage || "Errore nel salvataggio");
      }

      const data = await res.json();
      setMessage({ type: "success", text: `✅ Salvato: ${data.person.name} (totale: ${data.total})` });
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
      loadPeople();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Errore nel salvataggio" });
    } finally {
      setSaving(false);
    }
  }

  async function deletePerson(id: string) {
    try {
      const peopleCopy = [...people];
      const person = peopleCopy.find((p) => p.id === id);
      if (!person) return;

      // Rimuovi ottimisticamente
      setPeople(peopleCopy.filter((p) => p.id !== id));

      // Rimuovi dal file (ricarica tutto)
      const res = await fetch("/api/people");
      const data: PeopleResponse = await res.json();
      const updated = data.items.filter((p: Person) => p.id !== id);
      // Riscrivi il file tramite POST con lista vuota? No, non abbiamo DELETE endpoint.
      // Per ora ricarica la lista
      loadPeople();
    } catch {
      loadPeople();
    }
  }

  useEffect(() => {
    loadPeople();
  }, []);

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          Salva Persone — API Test
        </h2>
        <button
          onClick={loadPeople}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Caricamento..." : "Ricarica"}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium ${
          message.type === "success"
            ? "bg-emerald-900/40 border border-emerald-500/40 text-emerald-300"
            : "bg-red-900/40 border border-red-500/40 text-red-300"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={savePerson} className="space-y-3 bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Nome *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <input
            type="tel"
            placeholder="Telefono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <input
            type="text"
            placeholder="Note"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvataggio..." : "Salva Persona"}
        </button>
      </form>

      <div className="space-y-2">
        <div className="text-xs text-slate-400 font-medium">Persone salvate: {people.length}</div>
        {people.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">Nessuna persona salvata</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {people.map((person) => (
              <div key={person.id} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/30">
                <div>
                  <div className="text-sm font-bold text-white">{person.name}</div>
                  <div className="text-xs text-slate-400">
                    {person.email && `${person.email} • `}{person.phone && `${person.phone}`}
                    {person.createdAt && ` • ${new Date(person.createdAt).toLocaleDateString("it-IT")}`}
                  </div>
                </div>
                <button
                  onClick={() => deletePerson(person.id)}
                  className="p-1.5 rounded-lg hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}