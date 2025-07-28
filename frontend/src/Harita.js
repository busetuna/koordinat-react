import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Marker ikonu düzeltme
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const defaultCenter = [20, 0];

function Harita() {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [savedMarkers, setSavedMarkers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [sortByDate, setSortByDate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (isAdmin) {
      axios.get("http://localhost:8000/api/users/", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setUsers(res.data))
        .catch(err => console.error("Kullanıcı listesi alınamadı:", err));
    }

    axios.get("http://localhost:8000/api/marker/", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setSavedMarkers(res.data);
        setMesaj("✅ Markerlar yüklendi.");
      })
      .catch(err => {
        console.error("Markerlar alınamadı:", err);
        setMesaj("⛔ Token geçersiz.");
        navigate('/login');
      });
  }, [token, isAdmin, navigate]);

  const handleKaydet = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setMesaj("⚠️ Lütfen geçerli koordinatlar girin.");
      return;
    }

    try {
      await axios.post("http://localhost:8000/api/marker/", {
        lat: latNum,
        lng: lngNum
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSavedMarkers(prev => [
        ...prev,
        { id: Date.now(), lat: latNum, lng: lngNum, username: localStorage.getItem("username") }
      ]);

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
    })
      .then(res => {
        setSavedMarkers(res.data);
        setMesaj(`✅ ${username} kullanıcısının markerları yüklendi.`);
      })
      .catch(err => {
        console.error("Markerlar alınamadı:", err);
        setMesaj("❌ Marker getirilemedi.");
      });
  };

  const handleMarkerDragEnd = async (markerId, newLatLng) => {
    try {
      await axios.patch("http://localhost:8000/api/marker/", {
        id: markerId,
        lat: newLatLng.lat,
        lng: newLatLng.lng
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSavedMarkers(prev =>
        prev.map(m => m.id === markerId ? { ...m, lat: newLatLng.lat, lng: newLatLng.lng } : m)
      );

      setMesaj("✅ Marker güncellendi.");
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      setMesaj("❌ Marker güncellenemedi.");
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {isAdmin && (
        <div style={{ width: '300px', padding: '10px', overflowY: 'auto', background: '#f3f4f6' }}>
          <label>Kullanıcı Seç:
            <select value={selectedUserId} onChange={(e) => {
              const selectedId = e.target.value;
              const user = users.find(u => u.id.toString() === selectedId);
              if (user) handleUserClick(user.id, user.username);
            }}>
              <option value="">-- Kullanıcı Seçin --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.username} ({user.profile__msisdn})</option>
              ))}
            </select>
          </label>

          <h3>Markerlar</h3>
          <table style={{ fontSize: '12px', width: '100%' }}>
            <thead>
              <tr><th>Lat</th><th>Lng</th><th>Kullanıcı</th><th>Tarih</th></tr>
            </thead>
            <tbody>
              {[...savedMarkers].sort((a, b) => sortByDate ? new Date(a.created_at) - new Date(b.created_at) : new Date(b.created_at) - new Date(a.created_at)).map((m, i) => (
                <tr key={i}>
                  <td>{m.lat}</td><td>{m.lng}</td><td>{m.username}</td><td>{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ flex: 1, padding: '15px' }}>
        <h3>📍 Marker Yönetimi</h3>

        <div style={{ marginBottom: '10px' }}>
          <label>Başlangıç: <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label style={{ marginLeft: '10px' }}>Bitiş: <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
          <button onClick={async () => {
            try {
              let url = 'http://localhost:8000/api/my-markers/';
              const params = [];
              if (startDate) params.push(`start=${startDate}`);
              if (endDate) params.push(`end=${endDate}`);
              if (params.length > 0) url += `?${params.join('&')}`;
              const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
              setSavedMarkers(res.data);
              setMesaj("✅ Markerlar filtrelendi.");
              setSelectedUserId(null);
              setSelectedUsername('');
            } catch (err) {
              console.error("Filtreli markerlar alınamadı:", err);
              setMesaj("❌ Marker filtrelemesi başarısız.");
            }
          }}>🔍 Filtrele</button>
        </div>

        <div>
          <input type="text" placeholder="Lat" value={lat} onChange={e => setLat(e.target.value)} />
          <input type="text" placeholder="Lng" value={lng} onChange={e => setLng(e.target.value)} />
          <button onClick={handleKaydet}>💾 Kaydet</button>
          <button onClick={() => setSortByDate(prev => !prev)} style={{ marginLeft: '10px' }}>📅 Sırala</button>
        </div>

        {mesaj && <p>{mesaj}</p>}

        <MapContainer center={defaultCenter}
                      zoom={2} 
                      style={{ height: '600px', marginTop: '10px' }}
                      maxBounds={[[-85, -180], [85, 180]]}
                      maxBoundsViscosity={1.0}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            noWrap={true} 
  />
          {savedMarkers.map(marker => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  handleMarkerDragEnd(marker.id, { lat, lng });
                }
              }}
            >
              <Popup>
  <b>{marker.username}</b><br />
  {new Date(marker.created_at).toLocaleString()}<br />
  <b>Latitude:</b> {marker.lat}<br />
  <b>Longitude:</b> {marker.lng}
</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default Harita;
