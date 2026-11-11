import React, { useState } from 'react';
import { Row, Col, Form, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';

const DISTRICTS = ['Maseru', 'Leribe', 'Berea', 'Mafeteng', "Mohale's Hoek", "Qacha's Nek", 'Mokhotlong', 'Quthing', 'Thaba-Tseka', 'Butha-Buthe'];

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'farmer', phone: '', location: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account registered successfully.');
      navigate('/marketplace');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="mb-4">
          <div className="auth-logo mb-1">
            <span style={{ color: 'var(--color-primary-lt)' }}>AGRI</span>CONNECT
          </div>
          <p className="text-secondary small mb-0">Create an organizational or individual market participant profile</p>
        </div>

        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={12}>
              <label className="ag-label">Full Name or Enterprise Name</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="E.g. Thabo Mofokeng" className="ag-form-control w-100" />
            </Col>
            <Col md={12}>
              <label className="ag-label">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="name@domain.ls" className="ag-form-control w-100" />
            </Col>
            <Col md={12}>
              <label className="ag-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange} required placeholder="Min. 6 characters" className="ag-form-control w-100" style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                </button>
              </div>
            </Col>
            <Col md={6}>
              <label className="ag-label">Platform Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="ag-form-control w-100">
                <option value="farmer">Farmer / Producer</option>
                <option value="buyer">Commercial / Retail Buyer</option>
                <option value="advisor">Agronomic Advisor</option>
              </select>
            </Col>
            <Col md={6}>
              <label className="ag-label">Primary District</label>
              <select name="location" value={form.location} onChange={handleChange} required className="ag-form-control w-100">
                <option value="">Select District</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Col>
            <Col md={12}>
              <label className="ag-label">Phone Contact</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+266 5800 0000" className="ag-form-control w-100" />
            </Col>
          </Row>

          <button type="submit" disabled={loading} className="btn-ag-primary w-100 justify-content-center mt-4 py-2">
            {loading ? 'Creating Profile...' : 'Complete Registration'}
          </button>
        </Form>

        <div className="mt-4 pt-3 border-top border-secondary text-center small text-secondary" style={{ borderColor: 'var(--border-color) !important' }}>
          Already have an account? <Link to="/login" className="text-white fw-medium">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
