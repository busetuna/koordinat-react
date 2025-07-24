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
      await axios.post("http://localhost:8000/api/auth/register/", {
        username,
        password
      });

      const res = await axios.post("http://localhost:8000/api/auth/login/", {
        username,
        password
      });

      const { access, refresh } = res.data;
      localStorage.setItem("token", access);
      localStorage.setItem("refresh", refresh);
      localStorage.setItem("username", username);

      setMesaj("✅ Kayıt ve giriş başarılı! Haritaya yönlendiriliyorsunuz...");
      setTimeout(() => navigate('/harita'), 1000);

    } catch (err) {
      console.error("Hata:", err);
      const errorMsg = err.response?.data?.error || "❌ Kayıt başarısız.";
      setMesaj(errorMsg);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>📝 Kayıt Ol</h2>

        <input
          type="text"
          placeholder="👤 Kullanıcı adı"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="🔐 Şifre"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleRegister} style={styles.button}>
          ✅ Kayıt Ol
        </button>

        {mesaj && (
          <div style={{
            marginTop: '15px',
            color: mesaj.includes("✅") ? 'green' : 'crimson',
            fontWeight: 'bold'
          }}>
            {mesaj}
          </div>
        )}

        <p style={{ marginTop: '15px' }}>
          Zaten hesabınız var mı? <Link to="/login" style={styles.link}>Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    background: 'linear-gradient(to right, #43e97b, #38f9d7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    background: '#fff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center'
  },
  title: {
    marginBottom: '25px',
    fontSize: '24px',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '12px',
    margin: '10px 0',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px'
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background 0.3s'
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: 'bold'
  }
};

export default Register;
