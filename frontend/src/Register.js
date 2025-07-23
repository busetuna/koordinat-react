import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mesaj, setMesaj] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      // Önce kullanıcıyı oluştur
      await axios.post("http://localhost:8000/api/auth/register/", {
        username,
        password
      });

      // Ardından token al (otomatik giriş)
      const res = await axios.post("http://localhost:8000/api/auth/login/", {
        username,
        password
      });

      const { access, refresh } = res.data;
      localStorage.setItem("token", access);
      localStorage.setItem("refresh", refresh);

      setMesaj("✅ Kayıt ve giriş başarılı! Haritaya yönlendiriliyorsunuz...");
      setTimeout(() => navigate('/harita'), 1000);

    } catch (err) {
      console.error("Hata:", err);
      const errorMsg = err.response?.data?.error || "❌ Kayıt başarısız.";
      setMesaj(errorMsg);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Kayıt Ol</h2>
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
      <button onClick={handleRegister} style={{ marginLeft: '10px' }}>
        Kayıt Ol
      </button>

      <div style={{ color: 'green', marginTop: '10px' }}>{mesaj}</div>

      <p style={{ marginTop: '10px' }}>
        Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link>
      </p>
    </div>
  );
}

export default Register;
