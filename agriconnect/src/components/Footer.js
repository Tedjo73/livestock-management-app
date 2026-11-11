import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="ag-footer">
    <Container>
      <Row className="mb-4 g-4">
        <Col lg={4} className="mb-3 mb-lg-0">
          <div className="footer-brand mb-2">
            <span style={{ color: 'var(--color-primary-lt)' }}>AGRI</span>CONNECT
          </div>
          <p className="text-secondary small mb-3">
            Agricultural market data, listing infrastructure, and transaction audit services for Lesotho.
          </p>
          <div className="text-muted small">
            Designed for regional supply chains, cooperative producers, and institutional buyers.
          </div>
        </Col>
        <Col lg={2} sm={6}>
          <div className="text-white small fw-bold text-uppercase mb-3" style={{ letterSpacing: '0.05em' }}>Platform</div>
          <ul className="list-unstyled small d-flex flex-column gap-2 mb-0">
            <li><Link to="/marketplace" className="text-secondary">Marketplace</Link></li>
            <li><Link to="/prices" className="text-secondary">Price Indices</Link></li>
            <li><Link to="/weather" className="text-secondary">Weather Alerts</Link></li>
            <li><Link to="/tips" className="text-secondary">Agronomic Advisory</Link></li>
            <li><Link to="/ai-dashboard" className="text-secondary">AI Analytics</Link></li>
            <li><Link to="/blockchain" className="text-secondary">Audit Ledger</Link></li>
          </ul>
        </Col>
        <Col lg={2} sm={6}>
          <div className="text-white small fw-bold text-uppercase mb-3" style={{ letterSpacing: '0.05em' }}>Account</div>
          <ul className="list-unstyled small d-flex flex-column gap-2 mb-0">
            <li><Link to="/register" className="text-secondary">Registration</Link></li>
            <li><Link to="/login" className="text-secondary">Sign In</Link></li>
            <li><Link to="/dashboard" className="text-secondary">Dashboard</Link></li>
          </ul>
        </Col>
        <Col lg={4}>
          <div className="text-white small fw-bold text-uppercase mb-3" style={{ letterSpacing: '0.05em' }}>Operational Districts</div>
          <div className="d-flex flex-wrap gap-1">
            {['Maseru', 'Leribe', 'Berea', 'Mafeteng', 'Mohale\'s Hoek', 'Quthing', 'Qacha\'s Nek', 'Mokhotlong', 'Thaba-Tseka', 'Butha-Buthe'].map(d => (
              <span key={d} className="badge-tag" style={{ fontSize: '0.7rem' }}>{d}</span>
            ))}
          </div>
        </Col>
      </Row>
      <div className="pt-3 border-top border-secondary d-flex justify-content-between align-items-center flex-wrap gap-2 text-muted small" style={{ borderColor: 'var(--border-color) !important' }}>
        <div>&copy; {new Date().getFullYear()} AgriConnect. All rights reserved.</div>
        <div>System Version 1.0.4 • Highland Agro-Informatics</div>
      </div>
    </Container>
  </footer>
);

export default Footer;
