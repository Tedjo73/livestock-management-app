import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaStore, FaChartLine, FaShieldAlt, FaBrain, FaCloudSun, FaEnvelope, FaArrowRight } from 'react-icons/fa';
import ListingCard from '../components/ListingCard';
import api from '../services/api';

const FEATURES = [
  { icon: <FaStore size={20} />, title: 'Marketplace Directory', desc: 'Direct listing and sourcing of crops across all 10 districts of Lesotho without intermediary overhead.', link: '/marketplace' },
  { icon: <FaChartLine size={20} />, title: 'Commodity Price Indices', desc: 'Indicative historical and daily wholesale price monitoring for staples, fruits, and vegetables.', link: '/prices' },
  { icon: <FaShieldAlt size={20} />, title: 'Blockchain Verification', desc: 'Cryptographically hashed records ensuring tamper-evident transaction logs and harvest authenticity.', link: '/blockchain' },
  { icon: <FaBrain size={20} />, title: 'Predictive Sales Analytics', desc: 'Machine learning models predicting optimal price points and sales velocity based on regional inputs.', link: '/ai-dashboard' },
  { icon: <FaCloudSun size={20} />, title: 'District Weather Alerts', desc: 'Localized meteorological observations and agricultural advisories for planting and harvest schedules.', link: '/weather' },
  { icon: <FaEnvelope size={20} />, title: 'Direct Messaging', desc: 'Authenticated communication channel connecting producers directly with wholesale and retail buyers.', link: '/messages' },
];

const DISTRICTS = ['Maseru', 'Berea', 'Leribe', 'Mafeteng', "Mohale's Hoek", "Qacha's Nek", 'Mokhotlong', 'Quthing', 'Thaba-Tseka', 'Butha-Buthe'];

const HomePage = () => {
  const [featuredListings, setFeaturedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/listings?limit=6').then(res => {
      setFeaturedListings(res.data.listings || []);
    }).catch(() => {
      setFeaturedListings([]);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="ag-hero">
        <Container>
          <Row className="align-items-center g-4">
            <Col lg={7}>
              <div className="mb-3">
                <span className="badge-tag">
                  Lesotho Agricultural Platform
                </span>
              </div>
              <h1 className="hero-title">
                Agricultural trade, pricing data, and provenance infrastructure
              </h1>
              <p className="hero-subtitle">
                AgriConnect provides market infrastructure connecting smallholder farmers, commercial buyers, and agronomic advisors across Lesotho.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/marketplace" className="btn-ag-primary">
                  Access Marketplace <FaArrowRight className="ms-1" size={12} />
                </Link>
                <Link to="/register" className="btn-ag-outline">
                  Create Account
                </Link>
              </div>

              <div className="hero-stats">
                {[
                  { value: '1,200+', label: 'Market Records' },
                  { value: '10', label: 'Districts Monitored' },
                  { value: '100%', label: 'Direct Producer Access' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="hero-stat-value">{s.value}</div>
                    <div className="hero-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </Col>

            <Col lg={5} className="d-none d-lg-block">
              <div className="ag-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary" style={{ borderColor: 'var(--border-color) !important' }}>
                  <span className="text-secondary small fw-bold text-uppercase">Platform Operational Status</span>
                  <span className="badge bg-success">Operational</span>
                </div>
                <div className="d-flex flex-column gap-3 small">
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Market Engine</span>
                    <span className="fw-semibold">Active</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">AI Prediction API</span>
                    <span className="fw-semibold">Connected (R² 0.924)</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Audit Ledger</span>
                    <span className="fw-semibold">Synchronized</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Primary Region</span>
                    <span className="fw-semibold">Highland & Lowland Lesotho</span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section style={{ padding: '4rem 0' }}>
        <Container>
          <div className="mb-4">
            <h2 className="section-title">Core Capabilities</h2>
            <p className="section-subtitle">System components supporting regional agricultural logistics and commerce</p>
          </div>
          <Row className="g-3">
            {FEATURES.map((f, i) => (
              <Col key={i} lg={4} md={6}>
                <Link to={f.link} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div className="feature-card">
                    <span className="feature-icon">
                      {f.icon}
                    </span>
                    <h5 className="h6 mb-2 text-white">{f.title}</h5>
                    <p className="text-secondary small mb-0">{f.desc}</p>
                  </div>
                </Link>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ── Featured Listings ─────────────────────────────── */}
      <section style={{ padding: '3.5rem 0', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <Container>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="section-title mb-1">Recent Market Listings</h2>
              <p className="section-subtitle mb-0">Active produce lots available for inquiry</p>
            </div>
            <Link to="/marketplace" className="btn-ag-outline">Browse Directory <FaArrowRight className="ms-1" size={11} /></Link>
          </div>

          {loading ? (
            <div className="ag-spinner" />
          ) : featuredListings.length > 0 ? (
            <Row className="g-3">
              {featuredListings.map(l => (
                <Col key={l.id} lg={4} md={6}><ListingCard listing={l} /></Col>
              ))}
            </Row>
          ) : (
            <div className="text-center py-5 text-secondary">
              <p className="mb-2">No active marketplace listings currently found.</p>
              <Link to="/listings/new" className="btn-ag-primary">Post Initial Listing</Link>
            </div>
          )}
        </Container>
      </section>

      {/* ── Coverage Districts ────────────────────────────── */}
      <section style={{ padding: '3.5rem 0' }}>
        <Container>
          <div className="mb-4">
            <h2 className="section-title">Districts Covered</h2>
            <p className="section-subtitle mb-0">Regional operational coverage across Lesotho</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {DISTRICTS.map(d => (
              <Link key={d} to={`/marketplace?location=${d}`} style={{ textDecoration: 'none' }}>
                <span className="badge-tag">
                  {d}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Call to Action ─────────────────────────────────── */}
      <section style={{ padding: '3.5rem 0', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
        <Container>
          <Row className="align-items-center g-3">
            <Col lg={8}>
              <h3 className="h5 mb-2 text-white">Join the AgriConnect Network</h3>
              <p className="text-secondary small mb-3 mb-lg-0">
                Register as a farmer, buyer, or agronomic advisor to access direct inquiries, verified pricing, and predictive market models.
              </p>
            </Col>
            <Col lg={4} className="text-lg-end">
              <div className="d-flex gap-2 justify-content-lg-end">
                <Link to="/register" className="btn-ag-primary">
                  Get Started
                </Link>
                <Link to="/login" className="btn-ag-outline">
                  Sign In
                </Link>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  );
};

export default HomePage;
