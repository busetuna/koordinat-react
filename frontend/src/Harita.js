import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';

const containerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = { lat: 20, lng: 0 };

function Harita() {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [center, setCenter] = useState(defaultCenter);
  const [mesaj, setMesaj] = useState('');
  const [savedMarkers, setSavedMarkers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');
  const navigate = useNavigate();
  const [sortByDate, setSortByDate] = useState(false);

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

  const handleMarkerDragEnd = async (markerId, newLat, newLng) => {
    try {
      await axios.patch("http://localhost:8000/api/marker/", {
        id: markerId,
        lat: newLat,
        lng: newLng
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSavedMarkers(prev =>
        prev.map(m => m.id === markerId ? { ...m, lat: newLat, lng: newLng } : m)
      );

      setMesaj("✅ Marker güncellendi.");
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      setMesaj("❌ Marker güncellenemedi.");
    }
  };

 return (
  <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
    {isAdmin && (
      <div style={{ width: '300px', background: '#f9fafb', borderRight: '1px solid #ddd', padding: '20px', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '15px', fontSize: '18px', color: '#374151' }}>👥 Kullanıcılar</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map(user => (
            <li
              key={user.id}
              onClick={() => handleUserClick(user.id, user.username)}
              style={{
                cursor: 'pointer',
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: selectedUserId === user.id ? '#e0f2fe' : '#f3f4f6',
                borderRadius: '8px',
                transition: '0.3s ease',
                fontWeight: selectedUserId === user.id ? 'bold' : 'normal'
              }}
            >
              {user.username}
            </li>
          ))}
        </ul>

        <div style={{ marginTop: '30px' }}>
          <h3 style={{ color: '#374151' }}>📋 Marker Listesi</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#e5e7eb' }}>
                <th style={{ padding: '6px' }}>Lat</th>
                <th style={{ padding: '6px' }}>Lng</th>
                <th style={{ padding: '6px' }}>Kullanıcı</th>
                <th style={{ padding: '6px' }}>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {[...savedMarkers]
                .sort((a, b) => sortByDate ? new Date(a.created_at) - new Date(b.created_at) : new Date(b.created_at) - new Date(a.created_at))
                .map((m, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={{ padding: '6px' }}>{m.lat}</td>
                    <td style={{ padding: '6px' }}>{m.lng}</td>
                    <td style={{ padding: '6px' }}>{m.username}</td>
                    <td style={{ padding: '6px' }}>{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    <div style={{ flex: 1, padding: '30px', backgroundColor: '#f3f4f6' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '10px', color: '#1f2937' }}>
        {isAdmin && selectedUsername ? `📌 ${selectedUsername} kullanıcısının markerları` : '📍 Harita Üzerinde Marker Ekle'}
      </h2>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={() => setSortByDate(prev => !prev)}
          style={{
            background: '#3b82f6',
            color: '#fff',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Tarihe Göre {sortByDate ? "📅 Eski → Yeni" : "📅 Yeni → Eski"}
        </button>

        <input
          type="text"
          placeholder="Enlem (lat)"
          value={lat}
          onChange={e => setLat(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginRight: '10px' }}
        />
        <input
          type="text"
          placeholder="Boylam (lng)"
          value={lng}
          onChange={e => setLng(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginRight: '10px' }}
        />
        <button
          onClick={handleKaydet}
          style={{
            background: '#10b981',
            color: '#fff',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          💾 Veritabanına Kaydet
        </button>
      </div>

      {mesaj && (
        <div style={{ color: mesaj.includes("❌") || mesaj.includes("⛔") ? '#dc2626' : '#065f46', marginBottom: '15px' }}>
          {mesaj}
        </div>
      )}

      <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={2}
          options={{
            noWrap: true,
            minZoom: 3,
            restriction: {
              latLngBounds: {
                north: 85,
                south: -85,
                west: -180,
                east: 180,
              },
              strictBounds: true
            }
          }}
        >
          {[...savedMarkers]
            .sort((a, b) => sortByDate ? new Date(a.created_at) - new Date(b.created_at) : new Date(b.created_at) - new Date(a.created_at))
            .map((m) => (
              <Marker
                key={m.id}
                position={{ lat: m.lat, lng: m.lng }}
                title={`Kullanıcı: ${m.username}\nTarih: ${new Date(m.created_at).toLocaleString()}`}
                draggable={true}
                onDragEnd={(e) => handleMarkerDragEnd(m.id, e.latLng.lat(), e.latLng.lng())}
              />
            ))}
        </GoogleMap>
      </div>
    </div>
  </div>
);

}

export default Harita;
