import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * A small OpenStreetMap map (free, no API key). `points` is a list of
 * { lat, lng, label, color }. Round markers are used, so no marker image files are needed.
 */
export default function MapView({ points = [], height = 240 }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    if (!box.current || map.current) return;
    map.current = L.map(box.current, { scrollWheelZoom: false }).setView([30.3753, 69.3451], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© OpenStreetMap contributors",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    valid.forEach((p) => {
      L.circleMarker([p.lat, p.lng], { radius: 9, color: "#fff", weight: 2, fillColor: p.color || "#c8102e", fillOpacity: 1 })
        .bindTooltip(p.label || "", { permanent: !!p.label, direction: "top" })
        .addTo(layer.current);
    });
    if (valid.length === 1) map.current.setView([valid[0].lat, valid[0].lng], 14);
    else if (valid.length > 1) map.current.fitBounds(valid.map((p) => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 15 });
  }, [points]);

  return <div ref={box} className="map-box" style={{ height }} role="img" aria-label="Map" />;
}
