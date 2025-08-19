import L from "leaflet";

const radioLetter = (r) => (r==="GSM"?"G":r==="UMTS"?"U":r==="LTE"?"L":r==="NR"?"5":"?");
const radioColor  = (r) => (r==="GSM"?"#ef4444":r==="UMTS"?"#f97316":r==="LTE"?"#3b82f6":r==="NR"?"#22c55e":"#6b7280");

export function iconForRadio(radio){
  const letter = radioLetter((radio||"").toUpperCase());
  const bg = radioColor((radio||"").toUpperCase());
  return L.divIcon({
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      background:${bg};color:#fff;font-weight:700;font-family:system-ui;
      box-shadow:0 1px 4px rgba(0,0,0,.35)
    ">${letter}</div>`,
    className: "",
    iconSize: [24,24],
    iconAnchor: [12,12],
  });
}
