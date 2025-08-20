import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { iconForRadio } from "../utils/icons";

const clusterIcon = (count) => L.divIcon({
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    background:#4f46e5;color:#fff;font-weight:800;font-family:system-ui;
    box-shadow:0 2px 6px rgba(0,0,0,.35)
  ">${count}</div>`,
  className: "",
  iconSize: [36,36],
  iconAnchor: [18,18],
});

export default function TowersLayer({ cells }) {
  return (
    <MarkerClusterGroup
      chunkedLoading
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
      spiderfyOnMaxZoom={true}
      disableClusteringAtZoom={19}
      maxClusterRadius={40}
      spiderLegPolylineOptions={{ weight: 1, opacity: 0.6 }}
      iconCreateFunction={(cluster) => clusterIcon(cluster.getChildCount())}
    >
      {cells.map((c, i) => (
        <Marker
          key={`${c.lat},${c.lon},${c.cid ?? i}`}
          position={[c.lat, c.lon]}
          icon={iconForRadio(c.radio)}
        >
          <Popup>
            <b>{c.radio}</b><br/>
            MCC/MNC: {c.mcc}/{c.mnc}<br/>
            LAC: {c.lac} CID: {c.cid}<br/>
            {c.lat.toFixed(6)}, {c.lon.toFixed(6)}
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}
