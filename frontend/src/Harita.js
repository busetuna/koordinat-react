import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Harita.css';
import Select from 'react-select';
import Supercluster from 'supercluster';


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});




// Basit cluster balonu
const createClusterIcon = (count) =>
  L.divIcon({
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      background:#4f46e5;color:#fff;font-weight:700">${count}</div>`,
    className: 'cluster-icon',
    iconSize: [36,36]
  });

function ClusterLayer({ points, iconForPoint, renderPopup }) {
  const map = useMap();
  const [bounds, setBounds] = useState(map.getBounds());
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const onMove = () => {
      setBounds(map.getBounds());
      setZoom(map.getZoom());
    };
    map.on('moveend', onMove);
    // ilk render’da da tetikle
    onMove();
    return () => map.off('moveend', onMove);
  }, [map]);

  const index = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,     // piksel cinsinden cluster yarıçapı
      maxZoom: 18   // en fazla hangi zoom’da cluster olsun
    });
    sc.load(
      points.map(p => ({
        type: 'Feature',
        properties: { ...p },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
      }))
    );
    return sc;
  }, [points]);

  const b = bounds;
  const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  const clusters = index.getClusters(bbox, Math.round(zoom));

  return clusters.map((c) => {
    const [lng, lat] = c.geometry.coordinates;
    const { cluster, point_count: count } = c.properties;

    if (cluster) {
      return (
        <Marker
          key={`cluster-${c.id}`}
          position={[lat, lng]}
          icon={createClusterIcon(count)}
          eventHandlers={{
            click: () => {
              const nextZoom = Math.min(index.getClusterExpansionZoom(c.id), 19);
              map.setView([lat, lng], nextZoom, { animate: true });
            }
          }}
        />
      );
    }

    const p = c.properties; // tekil nokta
    return (
      <Marker
        key={p.id}
        position={[lat, lng]}
        icon={iconForPoint ? iconForPoint(p) : undefined}
      >
        {renderPopup && <Popup>{renderPopup(p)}</Popup>}
      </Marker>
    );
  });
}


const defaultCenter = [41.085, 29.05]; // yakın başla (İST çevresi gibi), istersen 20,0 yap

function Harita() {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [savedMarkers, setSavedMarkers] = useState([]);
  const [towers, setTowers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [sortByDate, setSortByDate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showTowers, setShowTowers] = useState(true);
  const [towerLoading, setTowerLoading] = useState(false);

  const navigate = useNavigate();
  const mapRef = useRef(null);
  const lastBBoxRef = useRef(null);
  const fetchTimerRef = useRef(null);

  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const OCID_KEY = useMemo(
    () => (process.env.REACT_APP_OCID_KEY || localStorage.getItem('ocid_key') || '').trim(),
    []
  );

  // renkli kullanıcı marker ikonu
  const getColorByIndex = (index, total) => {
    if (total <= 1) return 'hsl(220, 100%, 50%)';
    const hue = 220, saturation = 100;
    const lightness = 30 + (index / Math.max(1, total - 1)) * 50;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };
  const createColoredIcon = (color) => {
    const svg = `
      <svg width="40" height="40" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" d="M256 0C167 0 96 71 96 160c0 112 160 352 160 352s160-240 160-352C416 71 345 0 256 0zm0 240c-44 0-80-36-80-80s36-80 80-80 80 36 80 80-36 80-80 80z"/>
      </svg>
    `;
    return L.divIcon({
      className: 'custom-icon',
      html: svg,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
  };

  // 📡 Tower ikonu
  const towerIcon = useMemo(() => {
    const svg = `
      <svg width="34" height="34" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <g fill="currentColor">
          <path d="M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1z"/>
          <path d="M7 22h10l-3-9h-4l-3 9zM6.5 8.5a5.5 5.5 0 0 1 11 0a.75.75 0 1 0 1.5 0a7 7 0 1 0-14 0a.75.75 0 1 0 1.5 0z"/>
          <path d="M8.5 8.5a3.5 3.5 0 0 1 7 0a.75.75 0 1 0 1.5 0a5 5 0 1 0-10 0a.75.75 0 1 0 1.5 0z"/>
        </g>
      </svg>
    `;
    return L.divIcon({
      className: 'tower-icon',
      html: `<div style="color:#7c3aed">${svg}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });
  }, []);

  const showTowersRef = useRef(showTowers);
  
  useEffect(() => {
  showTowersRef.current = showTowers;
}, [showTowers]);

  useEffect(() => {


    console.log('[Harita] mounted');
    console.log('Token var mı:', !!token);
    console.log('isAdmin:', isAdmin);

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Bad token');
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) throw new Error('Expired');
    } catch (e) {
      localStorage.clear();
      navigate('/login');
      return;
    }

    // admin kullanıcı listesi
    if (isAdmin) {
      axios.get("http://localhost:8000/api/users/", {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setUsers(res.data || []);
      }).catch(err => {
        console.error("Kullanıcı listesi hatası:", err.response?.status, err.response?.data);
      });
    }

    // markerlar
    axios.get("http://localhost:8000/api/marker/", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setSavedMarkers(res.data || []);
      setMesaj("✅ Markerlar yüklendi.");
    }).catch(err => {
      console.error("Marker hatası:", err.response?.status, err.response?.data);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      } else {
        setMesaj(`❌ Marker hatası: ${err.response?.status || 'Bilinmeyen'}`);
      }
    });
  }, [token, isAdmin, navigate]);

 const fetchTowersByBBox = useCallback(async (bboxStr) => {
  if (!OCID_KEY) {
    console.warn('[OCI] Key yok - OCID_KEY:', OCID_KEY);
    setMesaj('⚠️ OpenCellID API key bulunamadı. Lütfen .env veya localStorage ocid_key ayarla.');
    return;
  }

  try {
    setTowerLoading(true);
    console.log('[OCI] /api/towers/ çağrılıyor', { bboxStr });

    const res = await axios.get("http://localhost:8000/api/towers/", {
      headers: { Authorization: `Bearer ${token}` },
      params: { bbox: bboxStr }
    });

    // ✅ backend artık url ve body döndürüyor
    if (res.data?.error) {
      setMesaj(`🚫 OCID: ${res.data.error} (status ${res.status || res.data.status || '?'})`);
      console.warn('[OCI] url:', res.data.url || '(yok)');
      console.warn('[OCI] body:', res.data.body);
      setTowers([]);
      return;
    }

    const cells = Array.isArray(res.data?.cells) ? res.data.cells : [];
    console.log('[OCI] gelen cell sayısı:', cells.length);

    const validCells = cells.filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lon));
    if (validCells.length === 0) {
      setMesaj('Bu bölgede baz istasyonu bulunamadı');
      setTowers([]);
      return;
    }

    const uniq = new Map(
      validCells.map(c => {
        const base = [c.mcc ?? 'x', c.mnc ?? 'x', c.lac ?? 'x', c.cellid ?? 'x'].join('-');
        const id = `tower-${base}`;
        return [id, {
          id,
          lat: c.lat,
          lng: c.lon,
          radio: c.radio,
          mcc: c.mcc,
          mnc: c.mnc,
          range: c.range,
          updated: c.updated
        }];
      })
    );

    const towersArray = [...uniq.values()];
    setTowers(towersArray);
    setMesaj(`✅ ${towersArray.length} baz istasyonu yüklendi`);
  } catch (err) {
    console.error('[OCI] fetch error status:', err.response?.status);
    console.error('[OCI] fetch error data:', err.response?.data);
    if (err.response?.status === 401) setMesaj('⛔ Baz istasyonu verileri için yetki gerekli');
    else if (err.response?.status === 404) setMesaj('❌ Baz istasyonu API endpoint bulunamadı');
    else if (err.response?.status === 502 || err.response?.status === 504) setMesaj('🌐 OpenCellID API bağlantı/timeout sorunu');
    else setMesaj(`❌ Baz istasyonu hatası: ${err.message}`);
    setTowers([]);
  } finally {
    setTowerLoading(false);
  }
}, [OCID_KEY, token]);

  // bbox hesapla + debounce + tekrar etmeyi engelle
  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const b = map.getBounds();
    const sw = b.getSouthWest(), ne = b.getNorthEast();
    const bboxStr = `${sw.lat.toFixed(4)},${sw.lng.toFixed(4)},${ne.lat.toFixed(4)},${ne.lng.toFixed(4)}`;
    console.log('[OCI] moveend:', { zoom: map.getZoom(), showTowers, bboxStr });

    if (!showTowers) { setTowers([]); return; }

    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(() => {
      if (lastBBoxRef.current === bboxStr) return;
      lastBBoxRef.current = bboxStr;
      fetchTowersByBBox(bboxStr);
    }, 1200);
  }, [showTowers, fetchTowersByBBox]);

function MapEventsBinder() {
  const map = useMapEvents({
    moveend() {
      // bbox hesapla
      const b = map.getBounds();
      const sw = b.getSouthWest(), ne = b.getNorthEast();
      const bboxStr = `${sw.lat.toFixed(4)},${sw.lng.toFixed(4)},${ne.lat.toFixed(4)},${ne.lng.toFixed(4)}`;
      console.log('[OCI] moveend bbox:', bboxStr, 'zoom:', map.getZoom(), 'showTowers:', showTowersRef.current);

      if (!showTowersRef.current) { setTowers([]); return; }

      // debounce + aynı bbox’a tekrar istek atma
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = setTimeout(() => {
        if (lastBBoxRef.current === bboxStr) return;
        lastBBoxRef.current = bboxStr;
        fetchTowersByBBox(bboxStr);
      }, 250);
    },
  });

  // ilk yüklemede tetikle
  useEffect(() => {
    setTimeout(() => {
      console.log('[OCI] ilk call (map.fire)');
      map.fire('moveend');
    }, 300);
  }, [map]);

  return null;
}

  const handleKaydet = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setMesaj("⚠️ Lütfen geçerli koordinatlar girin.");
      return;
    }
    try {
      const res = await axios.post("http://localhost:8000/api/marker/", { lat: latNum, lng: lngNum }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newId = res?.data?.id || Date.now();
      setSavedMarkers(prev => [...prev, {
        id: newId, lat: latNum, lng: lngNum,
        username: localStorage.getItem("username"),
        created_at: new Date().toISOString()
      }]);
      setMesaj("✅ Marker kaydedildi.");
    } catch (err) {
      console.error("Kayıt hatası:", err);
      setMesaj("❌ Kayıt başarısız.");
    }
  };
  
  const handleUserClick = (userId, username) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    axios.get(`http://localhost:8000/api/markers/user/${userId}/`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setSavedMarkers(res.data || []);
      setMesaj(`✅ ${username} kullanıcısının markerları yüklendi.`);
    }).catch(err => {
      console.error("Markerlar alınamadı:", err);
      setMesaj("❌ Marker getirilemedi.");
    });
  };

  const handleMarkerDragEnd = async (markerId, newLatLng) => {
    try {
      await axios.patch("http://localhost:8000/api/marker/", {
        id: markerId, lat: newLatLng.lat, lng: newLatLng.lng
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSavedMarkers(prev => prev.map(m => m.id === markerId ? { ...m, lat: newLatLng.lat, lng: newLatLng.lng } : m));
      setMesaj("✅ Marker güncellendi.");
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      setMesaj("❌ Marker güncellenemedi.");
    }
  };

  const sortedUserMarkers = useMemo(() => {
    const arr = [...savedMarkers];
    arr.sort((a, b) => sortByDate
      ? new Date(a.created_at) - new Date(b.created_at)
      : new Date(b.created_at) - new Date(a.created_at));
    return arr;
  }, [savedMarkers, sortByDate]);

  return (
    <div className="harita-wrapper">
      {isAdmin && (
        <aside className="sidebar">
          <label>Kullanıcı Seç:</label>
          <Select
            options={users.map(user => ({
              value: user.id,
              label: `${user.username}${user.profile__msisdn ? ` (${user.profile__msisdn})` : ''}`
            }))}
            placeholder="Kullanıcı ara ve seç..."
            value={users
              .map(user => ({ value: user.id, label: `${user.username}${user.profile__msisdn ? ` (${user.profile__msisdn})` : ''}` }))
              .find(option => option.value === selectedUserId) || null}
            onChange={(opt) => {
              if (opt) {
                const user = users.find(u => u.id === opt.value);
                if (user) handleUserClick(user.id, user.username);
              } else {
                setSelectedUserId('');
                setSelectedUsername('');
              }
            }}
            isClearable
            className="user-select"
          />

          <h3>Markerlar</h3>
          <table>
            <thead>
              <tr><th>Lat</th><th>Lng</th><th>Kullanıcı</th><th>Tarih</th></tr>
            </thead>
            <tbody>
              {sortedUserMarkers.map((m, i) => (
                <tr key={m.id ?? i}>
                  <td>{m.lat}</td><td>{m.lng}</td><td>{m.username}</td><td>{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      )}

      <main className="map-panel">
        <h3>📍 Marker Yönetimi</h3>

        <div className="filter-controls">
          <label>Başlangıç: <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label>Bitiş: <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
          <button onClick={async () => {
            try {
              let url = 'http://localhost:8000/api/my-markers/';
              const toISO = (v) => v ? new Date(v).toISOString() : null;
              const params = [];
              const s = toISO(startDate), e = toISO(endDate);
              if (s) params.push(`start=${encodeURIComponent(s)}`);
              if (e) params.push(`end=${encodeURIComponent(e)}`);
              if (params.length > 0) url += `?${params.join('&')}`;
              const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
              setSavedMarkers(res.data || []);
              setMesaj("✅ Markerlar filtrelendi.");
              setSelectedUserId(null);
              setSelectedUsername('');
            } catch (err) {
              console.error("Filtreli markerlar alınamadı:", err);
              setMesaj("❌ Marker filtrelemesi başarısız.");
            }
          }}>🔍 Filtrele</button>

          <label style={{ marginLeft: 12 }}>
            <input
              type="checkbox"
              checked={showTowers}
              onChange={(e) => {
                setShowTowers(e.target.checked);
                if (e.target.checked) handleMoveEnd(); // mevcut bbox için çek
              }}
            /> {' '}📡 Baz istasyonlarını göster
          </label>

          {towerLoading && <span style={{ marginLeft: 8 }}>Yükleniyor…</span>}
        </div>

        <div className="form-controls">
          <input type="text" placeholder="Lat" value={lat} onChange={e => setLat(e.target.value)} />
          <input type="text" placeholder="Lng" value={lng} onChange={e => setLng(e.target.value)} />
          <button onClick={handleKaydet}>💾 Kaydet</button>
          <button onClick={() => setSortByDate(prev => !prev)}>📅 Sırala</button>
        </div>

        {mesaj && <p className="message-box">{mesaj}</p>}

        <MapContainer
          center={defaultCenter}
          zoom={15}
          style={{ height: '600px', marginTop: '10px' }}
          
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            noWrap={true}
          />

          {/* moveend bağlayıcı */}
          <MapEventsBinder />

          {/* Kullanıcı marker'ları */}
          {sortedUserMarkers.map((marker, index, arr) => {
            const color = getColorByIndex(index, arr.length);
            return (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={createColoredIcon(color)}
                draggable={false}
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    handleMarkerDragEnd(marker.id, { lat, lng });
                  }
                }}
              >
                <Popup>
                  <b>{marker.username}</b><br />
                  {marker.msisdn && (<><b>MSISDN: </b>{marker.msisdn}<br /></>)}
                  {marker.created_at && (<>{new Date(marker.created_at).toLocaleString()}<br /></>)}
                  <b>Latitude:</b> {marker.lat}<br />
                  <b>Longitude:</b> {marker.lng}
                </Popup>
              </Marker>
            );
          })}

          {/* Baz istasyonları (cluster) */}
{showTowers && (
  <ClusterLayer
    points={towers.map(t => ({ id: t.id, lat: t.lat, lng: t.lng, ...t }))}
    iconForPoint={() => towerIcon}
    renderPopup={(t) => (
      <>
        📡 <b>Baz İstasyonu</b><br />
        {t.radio && <>Teknoloji: {t.radio}<br /></>}
        {t.mcc !== undefined && t.mnc !== undefined && <>MCC/MNC: {t.mcc}/{t.mnc}<br /></>}
        {t.range && <>Tahmini kapsama yarıçapı: ~{t.range} m<br /></>}
        {t.updated && <>Güncellendi: {new Date(t.updated).toLocaleString()}<br /></>}
        Lat: {t.lat}<br />
        Lng: {t.lng}
      </>
    )}
  />
)}

        </MapContainer>
      </main>
    </div>
  );
}

export default Harita;
