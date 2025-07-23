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
    console.log("Kullanıcı listesi:", users);
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
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSavedMarkers(prev => [
        ...prev,
        { lat: latNum, lng: lngNum, username: localStorage.getItem("username") }
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

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      
      {/* Sol panel: sadece admin için kullanıcı listesi */}
      {isAdmin && (
        <div style={{
          width: '250px',
          borderRight: '1px solid #ccc',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h3>Kullanıcılar</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {users.map(user => (
              <li
                key={user.id}
                onClick={() => handleUserClick(user.id, user.username)}
                style={{
                  cursor: 'pointer',
                  padding: '10px',
                  marginBottom: '5px',
                  backgroundColor: selectedUserId === user.id ? '#d0e6ff' : '#f5f5f5',
                  borderRadius: '5px'
                }}
              >
                {user.username}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '20px' }}>
  <h3>📋 Marker Listesi</h3>
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr style={{ backgroundColor: '#eee' }}>
        <th style={{ border: '1px solid #ccc', padding: '8px' }}>Enlem (Lat)</th>
        <th style={{ border: '1px solid #ccc', padding: '8px' }}>Boylam (Lng)</th>
        <th style={{ border: '1px solid #ccc', padding: '8px' }}>Kullanıcı</th>
        <th style={{ border: '1px solid #ccc', padding: '8px' }}>Tarih</th>
      </tr>
    </thead>
    <tbody>
      {[...savedMarkers]
        .sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return sortByDate ? dateA - dateB : dateB - dateA;
        })
        .map((m, index) => (
          <tr key={index}>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{m.lat}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{m.lng}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{m.username}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>
              {new Date(m.created_at).toLocaleString()}
            </td>
          </tr>
        ))}
    </tbody>
  </table>
</div>

        </div>
        
        
      )}

      {/* Sağ panel */}
      <div style={{ flex: 1, padding: '20px' }}>
        <h2>
          {isAdmin && selectedUsername
            ? `${selectedUsername} kullanıcısının markerları`
            : 'Harita Üzerinde Marker Ekle'}
        </h2>
        {isAdmin && selectedUsername && (
  <button onClick={() => setSortByDate(prev => !prev)} style={{ marginBottom: '10px' }}>
    Tarihe Göre {sortByDate ? "Eski → Yeni" : "Yeni → Eski"}
  </button>
)}



        <input
          type="text"
          placeholder="Enlem (lat)"
          value={lat}
          onChange={e => setLat(e.target.value)}
          style={{ marginRight: '10px' }}
        />
        <input
          type="text"
          placeholder="Boylam (lng)"
          value={lng}
          onChange={e => setLng(e.target.value)}
        />
        <button onClick={handleKaydet} style={{ marginLeft: '10px' }}>
          Veritabanına Kaydet
        </button>

        <div style={{ color: 'green', margin: '10px 0' }}>{mesaj}</div>

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
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortByDate ? dateA - dateB : dateB - dateA;
    })
    .map((m, index) => (
      <Marker
        key={index}
        position={{ lat: m.lat, lng: m.lng }}
        title={`Kullanıcı: ${m.username}\nTarih: ${new Date(m.created_at).toLocaleString()}`}
      />
    ))}
</GoogleMap>

      </div>
    </div>
  );
}

export default Harita;
