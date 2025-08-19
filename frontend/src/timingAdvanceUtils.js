// src/timingAdvanceUtils.js
import React from "react";
import { Circle } from "react-leaflet";

/** Teknolojiye göre TA birim uzunluğu (metre) */
export function getTAUnitMeters(radio, techMode) {
  const r = (techMode === "auto" ? (radio || "").toUpperCase() : techMode.toUpperCase());
  if (r.includes("GSM") || r === "GSM") return 550;                 // 2G
  if (r.includes("LTE") || r === "LTE" || r === "4G") return 78.125; // 4G
  if (r.includes("NR")  || r === "NR"  || r === "5G") return 78.125; // 5G (basit)
  return 78.125; // 3G/unknown -> LTE kabul
}

/** Teknoloji rengine karar ver */
export function techColor(radio, techMode) {
  const r = (techMode === "auto" ? (radio || "").toUpperCase() : techMode.toUpperCase());
  if (r.includes("GSM") || r === "GSM") return "#dc2626";             // kırmızı
  if (r.includes("LTE") || r === "LTE" || r === "4G") return "#2563eb"; // mavi
  if (r.includes("NR")  || r === "NR"  || r === "5G") return "#7c3aed"; // mor
  return "#475569"; // slate
}

/**
 * Belirli bir istasyon ve TA için Leaflet Circle(lar) döndürür.
 * onClickCircle(info) ile tıklamada bilgi gönderir.
 */
export function renderTACircles(tower, taValue, techMode = "auto", drawBand = true, onClickCircle) {
  const lat = Number(tower?.lat);
  const lng = Number(tower?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const tv = Number(taValue);
  if (!tv || tv <= 0) return null;

  const unit = getTAUnitMeters(tower?.radio, techMode);
  const r = tv * unit;
  if (!Number.isFinite(r) || r <= 0) return null;

  const color = techColor(tower?.radio, techMode);

  const handleClick = () => {
    if (onClickCircle) {
      onClickCircle({
        tower,
        taValue: tv,
        unit,
        radius: r,
        tech: tower?.radio ?? "unknown",
        center: { lat, lng }
      });
    }
  };

  if (drawBand) {
    return (
      <>
        <Circle
          pane="ta-pane"
          center={[lat, lng]}
          radius={r}
          pathOptions={{ color, weight: 2, fill: false }}
          eventHandlers={{ click: handleClick }}
        />
        <Circle
          pane="ta-pane"
          center={[lat, lng]}
          radius={(tv + 1) * unit}
          pathOptions={{ color, weight: 2, fill: false, dashArray: "4 6" }}
          eventHandlers={{ click: handleClick }}
        />
      </>
    );
  }

  return (
    <Circle
      pane="ta-pane"
      center={[lat, lng]}
      radius={r}
      pathOptions={{ color, weight: 2, fill: true, fillOpacity: 0.08 }}
      eventHandlers={{ click: handleClick }}
    />
  );
}
