import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaStore, FaEnvelope, FaPlus, FaTrash, FaEye } from 'react-icons/fa';
import api from '../services/api';

const DashboardPage = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get(`/listings/user/${user.id}`),
      api.get('/messages/unread/count'),
    ]).then(([listRes, msgRes]) => {
      setListings(listRes.data.listings || []);
      setUnread(msgRes.data.unreadCount || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user.id]);

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm removal of this produce lot?')) return;
    try {
      await api.delete(`/listings/${id}`);
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('Listing removed from marketplace.');
    } catch { toast.error('Failed to remove listing.'); }
  };

  return (
    <>
      <div className="page-header">
        <Container>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge-tag text-uppercase fw-semibold">{user.role} Account</span>
                {user.location && <span className="small text-muted">Station: {user.location}</span>}
              </div>
              <h1 className="section-title mb-0">{user.name}</h1>
              <p className="section-subtitle mb-0">Producer and marketplace operation console</p>
            </div>
            {user.role === 'farmer' && (
              <Link to="/listings/new" className="btn-ag-primary">
                <FaPlus size={11} className="me-1" /> Create Lot Listing
              </Link>
            )}
          </div>
        </Container>
      </div>

      <Container className="pb-5">
        {/* Metric Widgets */}
        <Row className="g-3 mb-4">
          <Col sm={6} lg={3}>
            <div className="stat-widget">
              <div className="stat-icon"><FaStore size={15} /></div>
              <div>
                <div className="stat-value">{listings.length}</div>
                <div className="stat-label">Registered Lots</div>
              </div>
            </div>
          </Col>
          <Col sm={6} lg={3}>
            <div className="stat-widget">
              <div className="stat-icon"><FaEnvelope size={15} /></div>
              <div>
                <div className="stat-value">{unread}</div>
                <div className="stat-label">Pending Inquiries</div>
              </div>
            </div>
          </Col>
          <Col sm={6} lg={3}>
            <div className="stat-widget">
              <div className="stat-icon"><FaStore size={15} /></div>
              <div>
                <div className="stat-value">{listings.filter(l => l.status === 'active').length}</div>
                <div className="stat-label">Active on Market</div>
              </div>
            </div>
          </Col>
          <Col sm={6} lg={3}>
            <div className="stat-widget">
              <div className="stat-icon"><FaEye size={15} /></div>
              <div>
                <div className="stat-value">{listings.reduce((sum, l) => sum + (l.views || 0), 0)}</div>
                <div className="stat-label">Aggregate Inquiries</div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Listings Section */}
        <div className="ag-card">
          <div className="ag-card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="small fw-bold text-uppercase text-secondary">My Inventory Listings</span>
              {user.role === 'farmer' && (
                <Link to="/listings/new" className="btn-ag-outline" style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem' }}>
                  <FaPlus size={10} className="me-1" /> New Entry
                </Link>
              )}
            </div>

            {loading ? <div className="ag-spinner" /> : listings.length === 0 ? (
              <div className="text-center py-5 text-muted small">
                <p className="mb-2">No produce lots currently cataloged for this account.</p>
                {user.role === 'farmer' && (
                  <Link to="/listings/new" className="btn-ag-primary">Post First Produce Lot</Link>
                )}
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {listings.map(l => (
                  <div key={l.id} className="p-3 border border-secondary rounded d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border-color) !important' }}>
                    <div>
                      <div className="fw-semibold text-white">{l.crop_name}</div>
                      <div className="small text-muted">
                        M {parseFloat(l.price_per_unit).toFixed(2)}/{l.unit} · Lot Volume: {l.quantity} {l.unit} · District: {l.location}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge-category badge-${l.status === 'active' ? 'vegetables' : 'other'}`}>
                        {l.status}
                      </span>
                      <span className="small text-muted" style={{ fontSize: '0.75rem' }}>{l.views || 0} views</span>
                      <Link to={`/listings/${l.id}`} className="btn-ag-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>Inspect</Link>
                      <button onClick={() => handleDelete(l.id)} className="btn-ag-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', color: 'var(--color-danger)' }} title="Delete entry">
                        <FaTrash size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </>
  );
};

export default DashboardPage;
