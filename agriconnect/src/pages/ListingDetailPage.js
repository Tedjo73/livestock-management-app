import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Badge } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaPhoneAlt, FaArrowLeft, FaShieldAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';

const ListingDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [auditData, setAuditData] = useState(null);

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const res = await api.get(`/blockchain/verify/${id}`);
      if (res.data?.success) {
        setAuditData(res.data);
        if (res.data.isTamperFree) {
          toast.success('Listing verified: Cryptographically authentic.');
        } else {
          toast.warn('Audit alert: Data integrity hash mismatch.');
        }
      } else {
        toast.info(res.data?.error || 'No blockchain record found for this listing.');
      }
    } catch (err) {
      toast.error('Failed to query ledger.');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    api.get(`/listings/${id}`).then(res => {
      setListing(res.data.listing);
      setMessage(`Inquiring regarding ${res.data.listing.crop_name} lot #${res.data.listing.id}.`);
    }).catch(() => {
      toast.error('Listing not found.');
      navigate('/marketplace');
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  const handleContact = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/listings/${id}` } } });
      return;
    }
    setSending(true);
    try {
      await api.post('/messages', { receiver_id: listing.seller.id, content: message, listing_id: listing.id });
      toast.success('Inquiry transmitted to producer.');
      navigate('/messages');
    } catch (err) {
      toast.error('Failed to transmit message.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="ag-spinner" style={{ marginTop: '4rem' }} />;
  if (!listing) return null;

  const { crop_name, category, quantity, unit, price_per_unit, description, location, status, views, seller, blockchain_tx_hash } = listing;

  return (
    <>
      <div className="page-header">
        <Container>
          <button onClick={() => navigate('/marketplace')} className="btn-ag-outline mb-2" style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
            <FaArrowLeft size={10} className="me-1" /> Directory
          </button>
          <div className="d-flex justify-content-between align-items-baseline flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className={`badge-category badge-${category}`}>{category}</span>
                <span className="small text-muted">Lot #{id} · {views} inquiries</span>
                {status === 'sold' && <Badge bg="danger">Depleted / Sold</Badge>}
              </div>
              <h1 className="section-title mb-0">{crop_name}</h1>
            </div>
            <div className="text-end">
              <span className="price" style={{ fontSize: '1.75rem' }}>M {parseFloat(price_per_unit).toFixed(2)}</span>
              <span className="price-unit"> / {unit}</span>
            </div>
          </div>
        </Container>
      </div>

      <Container className="pb-5">
        <Row className="g-3">
          {/* Main Details */}
          <Col lg={8}>
            {/* Overview Attributes */}
            <div className="ag-card mb-3 p-4">
              <span className="small fw-bold text-uppercase text-secondary d-block mb-3">Lot Specifications</span>
              <Row className="g-3">
                <Col sm={4}>
                  <div className="small text-muted">Available Volume</div>
                  <div className="fw-semibold text-white">{quantity} {unit}</div>
                </Col>
                <Col sm={4}>
                  <div className="small text-muted">Estimated Lot Value</div>
                  <div className="fw-semibold text-white">M {(quantity * price_per_unit).toFixed(2)}</div>
                </Col>
                <Col sm={4}>
                  <div className="small text-muted">Origin District</div>
                  <div className="fw-semibold text-white">{location}</div>
                </Col>
              </Row>

              <hr className="my-3 border-secondary" style={{ borderColor: 'var(--border-color) !important' }} />

              <span className="small fw-bold text-uppercase text-secondary d-block mb-2">Producer Description</span>
              <p className="text-secondary small mb-0" style={{ lineHeight: 1.6 }}>
                {description || 'No additional technical specifications provided for this lot.'}
              </p>
            </div>

            {/* Cryptographic Ledger Record */}
            <div className="ag-card p-4">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <span className="small fw-bold text-uppercase text-secondary">Ledger Verification & Cryptographic Provenance</span>
                <button
                  onClick={handleVerifyIntegrity}
                  disabled={verifying}
                  className="btn-ag-outline"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem' }}
                >
                  <FaShieldAlt className="me-1" size={11} />
                  {verifying ? 'Verifying...' : 'Verify Cryptographic State'}
                </button>
              </div>

              <p className="text-muted small mb-3">
                Transaction record committed to the distributed AgriLedger PoA blockchain ensuring state immutability.
              </p>

              {blockchain_tx_hash && (
                <div className="p-2 border border-secondary rounded mb-3 small" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border-color) !important' }}>
                  <span className="text-muted d-block small">Transaction Hash:</span>
                  <code className="text-white" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{blockchain_tx_hash}</code>
                </div>
              )}

              {auditData && (
                <div
                  className="p-3 border rounded small"
                  style={{
                    background: auditData.isTamperFree ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                    borderColor: auditData.isTamperFree ? 'rgba(46, 125, 50, 0.3)' : 'rgba(211, 47, 47, 0.3)',
                  }}
                >
                  <div className="d-flex align-items-center gap-2 mb-1">
                    {auditData.isTamperFree ? (
                      <FaCheckCircle className="text-success" size={14} />
                    ) : (
                      <FaExclamationTriangle className="text-danger" size={14} />
                    )}
                    <span className="fw-semibold text-white">
                      {auditData.isTamperFree ? 'Audit Passed: Authentic On-Chain Record' : 'Audit Failed: Hash Mismatch Detected'}
                    </span>
                  </div>
                  <div className="text-secondary small">{auditData.auditMessage}</div>
                  <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
                    Block Height: #{auditData.blockHeight} · Validator Node: {auditData.validatorAddress?.slice(0, 16)}...
                  </div>
                </div>
              )}
            </div>
          </Col>

          {/* Producer Contact Box */}
          <Col lg={4}>
            <div className="ag-card p-4 mb-3">
              <span className="small fw-bold text-uppercase text-secondary d-block mb-3">Producer Details</span>
              <div className="mb-3">
                <div className="fw-semibold text-white">{seller?.name}</div>
                <div className="text-muted small">Location: {seller?.location}</div>
                {seller?.phone && (
                  <div className="text-secondary small mt-1">
                    <FaPhoneAlt size={11} className="me-1 text-muted" /> {seller.phone}
                  </div>
                )}
              </div>
            </div>

            {(!user || user.id !== seller?.id) && (
              <div className="ag-card p-4">
                <span className="small fw-bold text-uppercase text-secondary d-block mb-2">Direct Producer Inquiry</span>
                <textarea
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="ag-form-control w-100 mb-3"
                  style={{ resize: 'none' }}
                />
                <button onClick={handleContact} disabled={sending || status === 'sold'} className="btn-ag-primary w-100 justify-content-center">
                  {sending ? 'Transmitting...' : status === 'sold' ? 'Produce Lot Depleted' : 'Send Direct Inquiry'}
                </button>
                {!isAuthenticated && (
                  <p className="text-muted small text-center mt-2 mb-0">
                    <Link to="/login" className="text-white">Sign in</Link> to initiate contact.
                  </p>
                )}
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default ListingDetailPage;
