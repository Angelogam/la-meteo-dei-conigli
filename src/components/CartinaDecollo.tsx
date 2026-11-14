"use client";

/**
 * CARTINA DECOLLO — mappa Leaflet (tile OpenStreetMap / OpenTopoMap) con
 * marker del decollo e, se mappato, dell'atterraggio + rotta tratteggiata.
 * Nessuna API key: solo tile server pubblici con attribuzione.
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface CartinaDecolloProps {
  lat: number;
  lon: number;
  name: string;
  landing?: { name: string; lat: number; lon: number; quota_m?: number } | null;
}

const TILE_OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_TOPO = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
const ATTR_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';
const ATTR_TOPO = '&copy; <a href="https://www.opentopomap.org" target="_blank" rel="noopener noreferrer">OpenTopoMap</a> (CC-BY-SA)';

const ICON_DECOLLO = L.divIcon({
  className: "dxd-map-marker is-decollo",
  html: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 2 L21 21 L12 16.5 L3 21 Z" fill="#0e7a5f" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  iconSize: [26, 26],
  iconAnchor: [13, 24],
  popupAnchor: [0, -22],
});

const ICON_LANDING = L.divIcon({
  className: "dxd-map-marker is-landing",
  html: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="4" y="12" width="16" height="8" rx="2.5" fill="#4f46e5" stroke="#ffffff" stroke-width="1.6"/><path d="M12 3 L16 9 L8 9 Z" fill="#4f46e5" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  iconSize: [22, 22],
  iconAnchor: [11, 20],
  popupAnchor: [0, -18],
});

export default function CartinaDecollo({ lat, lon, name, landing }: CartinaDecolloProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [layer, setLayer] = useState<"osm" | "topo">("osm");
  const tileRef = useRef<L.TileLayer | null>(null);

  // init mappa una sola volta
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      scrollWheelZoom: false,
      zoomSnap: 0.5,
      attributionControl: true,
    });
    map.attributionControl.setPrefix("");
    tileRef.current = L.tileLayer(TILE_OSM, { maxZoom: 17, attribution: ATTR_OSM }).addTo(map);
    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
    };
  }, []);

  // marker + viste quando cambiano i dati
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((l) => {
      if (l instanceof L.Marker || l instanceof L.Polyline) map.removeLayer(l);
    });

    L.marker([lat, lon], { icon: ICON_DECOLLO, title: "Decollo: " + name })
      .addTo(map)
      .bindPopup(`<strong>Decollo</strong><br/>${name}<br/><small>${lat.toFixed(5)}, ${lon.toFixed(5)}</small>`);

    const punti: L.LatLngExpression[] = [[lat, lon]];
    if (landing && Number.isFinite(landing.lat) && Number.isFinite(landing.lon)) {
      L.marker([landing.lat, landing.lon], { icon: ICON_LANDING, title: "Atterraggio: " + landing.name })
        .addTo(map)
        .bindPopup(`<strong>Atterraggio</strong><br/>${landing.name}${landing.quota_m ? ` · ${landing.quota_m} m` : ""}`);
      L.polyline([[lat, lon], [landing.lat, landing.lon]], {
        color: "#0e7a5f", weight: 2.2, opacity: 0.65, dashArray: "6 8",
      }).addTo(map);
      punti.push([landing.lat, landing.lon]);
    }

    const bounds = L.latLngBounds(punti);
    map.fitBounds(bounds, { padding: [46, 46], maxZoom: 14 });
    if (punti.length === 1) map.setView([lat, lon], 13);
  }, [lat, lon, name, landing]);

  // switch layer tile
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;
    tileRef.current.remove();
    tileRef.current =
      layer === "osm"
        ? L.tileLayer(TILE_OSM, { maxZoom: 17, attribution: ATTR_OSM }).addTo(map)
        : L.tileLayer(TILE_TOPO, { maxZoom: 15, attribution: ATTR_TOPO }).addTo(map);
    tileRef.current.bringToBack();
  }, [layer]);

  return (
    <div className="dxd-map">
      <div className="dxd-map-canvas" ref={elRef} role="application" aria-label={"Cartina del decollo " + name} />
      <div className="dxd-map-tools" role="group" aria-label="Tipo di carta">
        <button type="button" className={layer === "osm" ? "is-on" : ""} onClick={() => setLayer("osm")}>Stradale</button>
        <button type="button" className={layer === "topo" ? "is-on" : ""} onClick={() => setLayer("topo")}>Topografica</button>
      </div>
      <p className="dxd-map-hint">Zoom con i pulsanti +/− o con un doppio clic; trascina per spostarti.</p>
    </div>
  );
}
