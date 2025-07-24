import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mesaj, setMesaj] = useState('');
  const navigate = useNavigate();

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
      navigate('/harita');
    } catch (err) {
      console.error("Giriş hatası:", err);
      setMesaj("❌ Giriş başarısız. Bilgileri kontrol edin.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔐 Giriş Yap</h2>

        <input
          type="text"
          placeholder=" Kullanıcı adı"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder=" Şifre"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleLogin} style={styles.button}>
           Giriş Yap
        </button>

        <button onClick={() => navigate('/register')} style={styles.secondaryButton}>
           Kayıt Ol
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
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    background: 'linear-gradient(to right, #4facfe, #00f2fe)',
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
    background: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background 0.3s'
  },
  secondaryButton: {
    marginTop: '10px',
    width: '100%',
    padding: '12px',
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'background 0.3s'
  }
};

export default Login;
