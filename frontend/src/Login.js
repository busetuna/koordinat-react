import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // React Router kullanıyorsan

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mesaj, setMesaj] = useState('');
  const navigate = useNavigate(); // yönlendirme için

  const handleLogin = async () => {
    try {
      const response = await axios.post("http://localhost:8000/api/auth/login/", {
        username,
        password
      });

      const { access, refresh } = response.data;
      localStorage.setItem("token", access);    
      localStorage.setItem("refresh", refresh); 
      localStorage.setItem("username", username);
      
       const me = await axios.get("http://localhost:8000/api/auth/me/", {
      headers: { Authorization: `Bearer ${access}` }
    });
    localStorage.setItem("isAdmin", me.data.is_staff || me.data.is_superuser);

      setMesaj("✅ Giriş başarılı!");
      navigate('/harita'); // örnek yönlendirme
    } catch (err) {
      console.error("Giriş hatası:", err);
      setMesaj("❌ Giriş başarısız. Bilgileri kontrol edin.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Giriş Yap</h2>
      <input
        type="text"
        placeholder="Kullanıcı adı"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ marginRight: '10px' }}
      />
      <input
        type="password"
        placeholder="Şifre"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button onClick={handleLogin} style={{ marginLeft: '10px' }}>
        Giriş Yap
      </button>
      <div style={{ color: 'red', marginTop: '10px' }}>{mesaj}</div>
    </div>
  );
}

export default Login;
