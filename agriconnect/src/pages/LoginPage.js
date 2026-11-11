import React, { useState } from 'react';
import { Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/marketplace';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Authenticated as ${user.name}`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="mb-4">
          <div className="auth-logo mb-1">
            <span style={{ color: 'var(--color-primary-lt)' }}>AGRI</span>CONNECT
          </div>
          <p className="text-secondary small mb-0">Sign in to access regional market operations</p>
        </div>

        {error && (
          <Alert variant="danger" className="py-2 small">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="ag-label">Account Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@domain.ls" className="ag-form-control w-100" autoFocus />
          </div>

          <div className="mb-3">
            <label className="ag-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="ag-form-control w-100" style={{ paddingRight: '2.5rem' }} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPass ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-ag-primary w-100 justify-content-center mt-2 py-2">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 pt-3 border-top border-secondary text-center small text-secondary" style={{ borderColor: 'var(--border-color) !important' }}>
          New organization or farmer? <Link to="/register" className="text-white fw-medium">Create account</Link>
        </div>

        {/* Demo Credentials Reference Box */}
        <div className="mt-4 p-3 border border-secondary rounded small text-secondary" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border-color) !important', fontSize: '0.75rem' }}>
          <div className="fw-semibold text-white mb-1">Default Platform Credentials:</div>
          <div>Producer: <code className="text-muted">thabo@agriconnect.ls</code> / <code className="text-muted">Farmer@1234</code></div>
          <div>Admin: <code className="text-muted">admin@agriconnect.ls</code> / <code className="text-muted">Admin@1234</code></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
