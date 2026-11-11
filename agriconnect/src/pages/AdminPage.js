import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaStore, FaLock, FaCheck } from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';

const AdminPage = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/stats'),
      api.get('/admin/security'),
    ]).then(([u, s, sec]) => {
      setUsers(u.data.users || []);
      setStats(s.data);
      setSecurity(sec.data.securityConfig);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [isAdmin, navigate]);

  const changeRole = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      toast.success('Role modified.');
    } catch { toast.error('Failed to update role.'); }
  };

  const toggleStatus = async (userId, is_active) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { is_active });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active } : u));
      toast.success(`User status updated to ${is_active ? 'active' : 'suspended'}.`);
    } catch { toast.error('Failed to change status.'); }
  };

  const anonymiseUser = async (userId) => {
    if (!window.confirm('Execute GDPR erasure for this account? This action is permanent.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Account anonymized per privacy retention standard.');
    } catch { toast.error('Failed to anonymize.'); }
  };

  const TABS = [
    { key: 'overview', label: 'System Overview' },
    { key: 'users', label: 'User Directory' },
    { key: 'security', label: 'Security & Access' },
  ];

  if (!isAdmin) return null;
  if (loading) return <div className="ag-spinner" style={{ marginTop: '4rem' }} />;

  return (
    <>
      <div className="page-header">
        <Container>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h1 className="section-title mb-1">Administrative Console</h1>
              <p className="section-subtitle mb-0">System telemetry, participant directory, and governance controls</p>
            </div>
            <button
              onClick={() => navigate('/security-config')}
              className="btn-ag-outline"
              style={{ fontSize: '0.8rem' }}
            >
              <FaLock className="me-1" size={11} /> Open Access Policy Module
            </button>
          </div>
        </Container>
      </div>

      <Container className="pb-5">
        {/* Navigation Tabs */}
        <div className="d-flex gap-1 mb-4">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={t.key === activeTab ? 'btn-ag-primary' : 'btn-ag-outline'} style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <Row className="g-3 mb-4">
              <Col md={4}>
                <div className="stat-widget">
                  <div className="stat-icon"><FaUsers size={16} /></div>
                  <div>
                    <div className="stat-value">{stats.totalUsers || 0}</div>
                    <div className="stat-label">Registered Accounts</div>
                  </div>
                </div>
              </Col>
              <Col md={4}>
                <div className="stat-widget">
                  <div className="stat-icon"><FaStore size={16} /></div>
                  <div>
                    <div className="stat-value">{stats.totalListings || 0}</div>
                    <div className="stat-label">Total Cataloged Lots</div>
                  </div>
                </div>
              </Col>
              <Col md={4}>
                <div className="stat-widget">
                  <div className="stat-icon"><FaStore size={16} /></div>
                  <div>
                    <div className="stat-value">{stats.activeListings || 0}</div>
                    <div className="stat-label">Active Market Supply</div>
                  </div>
                </div>
              </Col>
            </Row>

            <div className="ag-card">
              <div className="ag-card-body">
                <span className="small fw-bold text-uppercase text-secondary d-block mb-3">Participant Role Segmentation</span>
                <Row className="g-3">
                  {['farmer', 'buyer', 'advisor', 'admin'].map(role => {
                    const count = users.filter(u => u.role === role).length;
                    const pct = users.length ? Math.round((count / users.length) * 100) : 0;
                    return (
                      <Col key={role} sm={6} lg={3}>
                        <div className="p-3 border border-secondary rounded" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border-color) !important' }}>
                          <div className="fw-bold text-white fs-5">{count}</div>
                          <div className="small text-secondary text-capitalize fw-medium">{role} Accounts</div>
                          <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>{pct}% of platform base</div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="ag-card">
            <div className="ag-card-body">
              <span className="small fw-bold text-uppercase text-secondary d-block mb-3">Registered Participants ({users.length})</span>
              <div style={{ overflowX: 'auto' }}>
                <Table className="ag-table" borderless>
                  <thead>
                    <tr>
                      <th>Participant</th><th>Email Address</th><th>Role</th><th>District</th><th>Status</th><th>Governance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td className="small text-muted">{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            onChange={e => changeRole(u.id, e.target.value)}
                            className="ag-form-control"
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', width: 'auto' }}
                          >
                            {['farmer', 'buyer', 'advisor', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="small text-secondary">{u.location || '—'}</td>
                        <td>
                          <span className={`badge-category badge-${u.is_active ? 'vegetables' : 'livestock'}`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              onClick={() => toggleStatus(u.id, !u.is_active)}
                              className="btn-ag-outline"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                            >
                              {u.is_active ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => anonymiseUser(u.id)}
                              className="btn-ag-outline"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: 'var(--color-danger)' }}
                            >
                              Erasure
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Security Summary Tab */}
        {activeTab === 'security' && security && (
          <Row className="g-3">
            <Col lg={6}>
              <div className="ag-card h-100 p-4">
                <span className="small fw-bold text-uppercase text-secondary d-block mb-3">Asset Classification Summary</span>
                {Object.entries(security.dataClassification).map(([level, items]) => (
                  <div key={level} className="mb-3">
                    <span className="small fw-semibold text-uppercase text-secondary d-block mb-1" style={{ fontSize: '0.72rem' }}>{level} Tier</span>
                    <div className="d-flex flex-wrap gap-1">
                      {items.map(item => (
                        <span key={item} className="badge-tag" style={{ fontSize: '0.7rem' }}>{item.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Col>

            <Col lg={6}>
              <div className="ag-card h-100 p-4">
                <span className="small fw-bold text-uppercase text-secondary d-block mb-3">Privacy & Compliance Verification</span>
                <div className="d-flex flex-column gap-2 mb-3">
                  {security.gdprMeasures.map((m, i) => (
                    <div key={i} className="d-flex align-items-start gap-2 small text-secondary">
                      <FaCheck className="text-success mt-1" size={10} />
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 border border-secondary rounded small text-muted" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border-color) !important' }}>
                  Compliance audit verified against data minimization principles and right-to-erasure workflows.
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
};

export default AdminPage;
