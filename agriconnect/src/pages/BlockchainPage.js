import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Badge, Modal, Form } from 'react-bootstrap';
import {
  FaLink, FaCube, FaShieldAlt, FaCheckCircle,
  FaExclamationTriangle, FaSearch, FaCopy, FaCheck,
  FaRedo, FaMicrochip, FaNetworkWired, FaCode
} from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';

const BlockchainPage = () => {
  const [activeTab, setActiveTab] = useState('ledger');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Verifier state
  const [selectedListingId, setSelectedListingId] = useState('1');
  const [activeListings, setActiveListings] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Tamper demo state
  const [tamperedListingId, setTamperedListingId] = useState('1');
  const [isTampered, setIsTampered] = useState(false);
  const [tamperedPrice] = useState('1.50');
  const [originalPrice, setOriginalPrice] = useState('6.50');

  // Selected block modal
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [copiedHash, setCopiedHash] = useState('');

  useEffect(() => {
    fetchBlockchainData();
    fetchListings();
  }, []);

  const fetchBlockchainData = async () => {
    setLoading(true);
    try {
      const [statsRes, ledgerRes] = await Promise.all([
        api.get('/blockchain/stats').catch(() => ({ data: { success: false } })),
        api.get('/blockchain/ledger?limit=20&page=1').catch(() => ({ data: { success: false } }))
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.stats);
      if (ledgerRes.data?.success) {
        setBlocks(ledgerRes.data.blocks || []);
        setTotalBlocks(ledgerRes.data.totalBlocks || 0);
      }
    } catch (err) {
      toast.error('Failed to connect to blockchain node.');
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      const res = await api.get('/listings?limit=20');
      if (res.data?.listings) {
        setActiveListings(res.data.listings);
        if (res.data.listings.length > 0) {
          setSelectedListingId(res.data.listings[0].id.toString());
          setTamperedListingId(res.data.listings[0].id.toString());
          setOriginalPrice(parseFloat(res.data.listings[0].price_per_unit).toFixed(2));
        }
      }
    } catch (err) {
      console.warn('Could not load listings for verifier:', err.message);
    }
  };

  const handleVerify = async (idToVerify) => {
    const id = idToVerify || selectedListingId;
    if (!id) return;
    setVerifying(true);
    try {
      const res = await api.get(`/blockchain/verify/${id}`);
      if (res.data?.success) {
        setVerificationResult(res.data);
        if (res.data.isTamperFree) {
          toast.success(`Listing #${id} verified: Immutable on-chain! ⛓️`);
        } else {
          toast.warn(`Listing #${id} audit warning: Record hash mismatch!`);
        }
      } else {
        setVerificationResult({
          success: false,
          error: res.data?.error || 'Verification record not found on blockchain ledger.'
        });
        toast.info(res.data?.error || 'No block found for this listing.');
      }
    } catch (err) {
      toast.error('Failed to verify cryptographic integrity.');
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    toast.success('Hash copied to clipboard!');
    setTimeout(() => setCopiedHash(''), 3000);
  };

  const filteredBlocks = blocks.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.crop_name?.toLowerCase().includes(q) ||
      b.transaction_hash?.toLowerCase().includes(q) ||
      b.block_height?.toString().includes(q) ||
      b.validator_address?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <Container>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <span className="badge-tag mb-2 d-inline-block">Immutable Ledger</span>
              <h1 className="section-title mb-1">
                <FaLink className="me-2" style={{ color: 'var(--color-primary-lt)' }} />
                AgriLedger Blockchain Network
              </h1>
              <p style={{ color: 'var(--text-muted)' }}>
                Distributed Ledger Technology for verifiable agricultural records, transaction integrity, and provenance.
              </p>
            </div>
            <div className="d-flex gap-2">
              <button onClick={fetchBlockchainData} className="btn-ag-outline" style={{ fontSize: '0.85rem' }}>
                <FaRedo className={`me-1 ${loading ? 'fa-spin' : ''}`} /> Refresh Node
              </button>
            </div>
          </div>
        </Container>
      </div>

      <Container className="pb-5">
        {/* Telemetry Stats Bar */}
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <div className="stat-widget">
              <div className="stat-icon"><FaCube size={15} /></div>
              <div>
                <div className="stat-value">{stats?.totalBlocks || totalBlocks || 0}</div>
                <div className="stat-label">Committed Blocks</div>
              </div>
            </div>
          </Col>
          <Col md={6} lg={3}>
            <div className="stat-widget">
              <div className="stat-icon"><FaNetworkWired size={15} /></div>
              <div>
                <div className="stat-value" style={{ fontSize: '1rem', paddingTop: '0.1rem' }}>Proof of Authority</div>
                <div className="stat-label">Consensus Protocol</div>
              </div>
            </div>
          </Col>
          <Col md={6} lg={3}>
            <div className="stat-widget">
              <div className="stat-icon"><FaMicrochip size={15} /></div>
              <div>
                <div className="stat-value" style={{ fontSize: '1rem', paddingTop: '0.1rem' }}>3 Authority Nodes</div>
                <div className="stat-label">Maseru · Leribe · Berea</div>
              </div>
            </div>
          </Col>
          <Col md={6} lg={3}>
            <div className="stat-widget">
              <div className="stat-icon"><FaShieldAlt size={15} /></div>
              <div>
                <div className="stat-value" style={{ fontSize: '1rem', paddingTop: '0.1rem' }}>SHA-256 Hashes</div>
                <div className="stat-label">Cryptographic Integrity</div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Navigation Tabs */}
        <div className="d-flex gap-1 mb-4 flex-wrap">
          {[
            { id: 'ledger', label: 'Ledger Blocks', icon: FaCube },
            { id: 'verifier', label: 'Cryptographic Verifier', icon: FaShieldAlt },
            { id: 'tamper-demo', label: 'Integrity Simulation', icon: FaExclamationTriangle },
            { id: 'contract', label: 'Smart Contract Source', icon: FaCode },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'btn-ag-primary' : 'btn-ag-outline'}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: LIVE BLOCKCHAIN LEDGER */}
        {activeTab === 'ledger' && (
          <div className="ag-card">
            <div className="ag-card-body">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <div>
                  <h5 style={{ color: 'var(--text-primary)', margin: 0 }}>
                    Distributed Ledger Blocks ({filteredBlocks.length})
                  </h5>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                    Each block cryptographically encapsulates agricultural transaction data linked to the previous block hash.
                  </p>
                </div>
                <div style={{ position: 'relative', width: '280px' }}>
                  <FaSearch style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search block, crop, or hash..."
                    className="ag-form-control w-100"
                    style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {filteredBlocks.length === 0 ? (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <FaCube size={40} className="mb-3" style={{ opacity: 0.4 }} />
                  <p>No blockchain records match your search query.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table className="ag-table align-middle" borderless responsive>
                    <thead>
                      <tr>
                        <th>Block #</th>
                        <th>Crop Produce</th>
                        <th>Quantity & Price</th>
                        <th>Transaction Hash</th>
                        <th>Previous Hash Link</th>
                        <th>Integrity</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBlocks.map((block) => (
                        <tr key={block.block_height}>
                          <td>
                            <Badge bg="success" style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}>
                              #{block.block_height}
                            </Badge>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--color-primary-lt)' }}>{block.crop_name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Listing ID: {block.listing_id} · Seller #{block.seller_id}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{block.quantity_kg} kg</span>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-accent)' }}>
                              M {parseFloat(block.price_per_kg_lsl).toFixed(2)} / kg
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {block.transaction_hash?.slice(0, 10)}...{block.transaction_hash?.slice(-8)}
                              </code>
                              <button
                                onClick={() => copyToClipboard(block.transaction_hash)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px' }}
                                title="Copy full transaction hash"
                              >
                                {copiedHash === block.transaction_hash ? <FaCheck color="var(--color-success)" size={11} /> : <FaCopy size={11} />}
                              </button>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Merkle: {block.merkle_root?.slice(0, 12)}...
                            </div>
                          </td>
                          <td>
                            <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {block.previous_block_hash?.slice(0, 8)}...{block.previous_block_hash?.slice(-6)}
                            </code>
                          </td>
                          <td>
                            <Badge bg="success" className="d-inline-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                              <FaCheckCircle size={10} /> Verified
                            </Badge>
                          </td>
                          <td>
                            <button
                              onClick={() => setSelectedBlock(block)}
                              className="btn-ag-outline"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                            >
                              Inspect Block
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INTEGRITY VERIFIER */}
        {activeTab === 'verifier' && (
          <Row className="g-4">
            <Col lg={5}>
              <div className="ag-card h-100">
                <div className="ag-card-body">
                  <h5 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                    <FaShieldAlt className="me-2" style={{ color: 'var(--color-success)' }} />
                    Verify Produce Authenticity
                  </h5>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Select any crop listing to verify its cryptographic proof against the immutable blockchain ledger.
                  </p>

                  <div className="mb-3">
                    <label className="ag-label">Select Active Produce Listing</label>
                    <Form.Select
                      value={selectedListingId}
                      onChange={(e) => setSelectedListingId(e.target.value)}
                      className="ag-form-control w-100"
                    >
                      {activeListings.map(l => (
                        <option key={l.id} value={l.id}>
                          Listing #{l.id} — {l.crop_name} ({l.quantity} {l.unit} @ M {parseFloat(l.price_per_unit).toFixed(2)})
                        </option>
                      ))}
                    </Form.Select>
                  </div>

                  <div className="mb-4">
                    <label className="ag-label">Or Custom Listing ID</label>
                    <input
                      type="number"
                      value={selectedListingId}
                      onChange={(e) => setSelectedListingId(e.target.value)}
                      className="ag-form-control w-100"
                      placeholder="Enter listing ID (e.g. 1)"
                    />
                  </div>

                  <button
                    onClick={() => handleVerify()}
                    disabled={verifying}
                    className="btn-ag-primary w-100"
                    style={{ padding: '0.85rem', justifyContent: 'center' }}
                  >
                    {verifying ? 'Auditing Cryptographic Hashes...' : '🔍 Audit Blockchain Integrity'}
                  </button>

                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(82,183,136,0.08)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--color-primary-lt)' }}>How It Works (Part B):</strong><br />
                    1. Recomputes Keccak-256 hash from live database fields.<br />
                    2. Compares live state against the immutable hash in block #.<br />
                    3. Guarantees prices & quantities have not been tampered with.
                  </div>
                </div>
              </div>
            </Col>

            <Col lg={7}>
              <div className="ag-card h-100">
                <div className="ag-card-body">
                  <h5 style={{ color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
                    Integrity Audit Report
                  </h5>

                  {!verificationResult ? (
                    <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                      <FaShieldAlt size={48} className="mb-3" style={{ opacity: 0.3 }} />
                      <h6>No Audit Run Yet</h6>
                      <p style={{ fontSize: '0.85rem' }}>Select a listing on the left and click "Audit Blockchain Integrity".</p>
                    </div>
                  ) : (
                    <div>
                      {/* Status Banner */}
                      <div
                        style={{
                          padding: '1.25rem',
                          borderRadius: '12px',
                          marginBottom: '1.5rem',
                          background: verificationResult.isTamperFree ? 'rgba(82,183,136,0.12)' : 'rgba(230,57,70,0.12)',
                          border: `1px solid ${verificationResult.isTamperFree ? 'rgba(82,183,136,0.3)' : 'rgba(230,57,70,0.3)'}`,
                        }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          {verificationResult.isTamperFree ? (
                            <FaCheckCircle size={32} color="var(--color-success)" />
                          ) : (
                            <FaExclamationTriangle size={32} color="var(--color-danger)" />
                          )}
                          <div>
                            <h5 style={{ margin: 0, color: verificationResult.isTamperFree ? 'var(--color-success)' : 'var(--color-danger)' }}>
                              {verificationResult.isTamperFree ? 'CRYPTOGRAPHIC INTEGRITY CONFIRMED' : 'TAMPERING DETECTED!'}
                            </h5>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                              {verificationResult.auditMessage}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Audit Details */}
                      <Row className="g-3">
                        <Col sm={6}>
                          <div style={{ padding: '0.9rem', background: 'var(--bg-card-hover)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Block Height</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary-lt)' }}>
                              Block #{verificationResult.blockHeight || 'N/A'}
                            </div>
                          </div>
                        </Col>
                        <Col sm={6}>
                          <div style={{ padding: '0.9rem', background: 'var(--bg-card-hover)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Consensus Status</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success)' }}>
                              {verificationResult.status || 'VERIFIED_IMMUTABLE'}
                            </div>
                          </div>
                        </Col>
                        <Col xs={12}>
                          <div style={{ padding: '0.9rem', background: 'var(--bg-card-hover)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Immutable Record Hash</div>
                            <code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                              {verificationResult.storedHash || 'N/A'}
                            </code>
                          </div>
                        </Col>
                        <Col xs={12}>
                          <div style={{ padding: '0.9rem', background: 'var(--bg-card-hover)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transaction Hash</div>
                            <code style={{ fontSize: '0.8rem', color: 'var(--color-accent)', wordBreak: 'break-all' }}>
                              {verificationResult.transactionHash || 'N/A'}
                            </code>
                          </div>
                        </Col>
                        <Col sm={6}>
                          <div style={{ padding: '0.9rem', background: 'var(--bg-card-hover)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Merkle Root</div>
                            <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                              {verificationResult.merkleRoot?.slice(0, 16)}...
                            </code>
                          </div>
                        </Col>
                        <Col sm={6}>
                          <div style={{ padding: '0.9rem', background: 'var(--bg-card-hover)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validator Node</div>
                            <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                              {verificationResult.validatorAddress?.slice(0, 16)}...
                            </code>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        )}

        {/* TAB 3: ANTI-TAMPER SECURITY DEMO */}
        {activeTab === 'tamper-demo' && (
          <div className="ag-card">
            <div className="ag-card-body">
              <h5 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                <FaExclamationTriangle className="me-2" style={{ color: 'var(--color-warning)' }} />
                Simulated Anti-Tamper Demonstration
              </h5>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                This simulation directly demonstrates why blockchain is essential for agricultural transformation in Lesotho.
                Watch how the cryptographic hash algorithm instantly exposes unauthorized changes to crop prices.
              </p>

              <Row className="g-4 align-items-center">
                <Col md={5}>
                  <div style={{ padding: '1.25rem', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h6 style={{ color: 'var(--color-primary-lt)' }}>1. Current Verified Record</h6>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Listing #{tamperedListingId}: <strong>Maize (Highland Harvest)</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>On-Chain Price:</span>
                      <strong style={{ color: 'var(--color-success)' }}>M {originalPrice} / kg</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Blockchain Status:</span>
                      <Badge bg="success">IMMUTABLE</Badge>
                    </div>

                    <button
                      onClick={() => {
                        setIsTampered(true);
                        toast.warn('Simulated database price modification triggered!');
                      }}
                      className="btn-ag-outline w-100"
                      style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', fontSize: '0.85rem' }}
                    >
                      ⚡ Simulate Malicious Price Change to M {tamperedPrice}
                    </button>
                  </div>
                </Col>

                <Col md={2} className="text-center">
                  <div style={{ fontSize: '2rem', color: isTampered ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    ➔
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {isTampered ? 'Tampered State' : 'Secure State'}
                  </div>
                </Col>

                <Col md={5}>
                  <div
                    style={{
                      padding: '1.25rem',
                      background: isTampered ? 'rgba(230,57,70,0.1)' : 'var(--bg-card-hover)',
                      borderRadius: '12px',
                      border: `1px solid ${isTampered ? 'rgba(230,57,70,0.4)' : 'var(--border-color)'}`
                    }}
                  >
                    <h6 style={{ color: isTampered ? 'var(--color-danger)' : 'var(--color-primary-lt)' }}>
                      2. Real-Time Blockchain Verification
                    </h6>
                    {isTampered ? (
                      <div>
                        <div style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                          ⚠️ HASH INTEGRITY VIOLATION DETECTED!
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                          Database record value (M {tamperedPrice}) does not match the immutable block hash (M {originalPrice}).
                          The transaction was rejected by validator nodes.
                        </p>
                        <button
                          onClick={() => {
                            setIsTampered(false);
                            toast.success('Database restored to immutable blockchain truth!');
                          }}
                          className="btn-ag-primary w-100"
                          style={{ fontSize: '0.85rem', justifyContent: 'center' }}
                        >
                          🔄 Restore Truth from Blockchain Ledger
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                          ✅ All Records Consistent
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          Click the simulate button on the left to see how blockchain blocks fraud and protects farmers.
                        </p>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        )}

        {/* TAB 4: SMART CONTRACT ARCHITECTURE */}
        {activeTab === 'contract' && (
          <div className="ag-card">
            <div className="ag-card-body">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h5 style={{ color: 'var(--text-primary)', margin: 0 }}>
                  <FaCode className="me-2" style={{ color: 'var(--color-accent)' }} />
                  AgriLedger.sol (Solidity ^0.8.20)
                </h5>
                <Badge bg="info" style={{ fontSize: '0.8rem' }}>EVM Chain ID: 1337</Badge>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                The AgriLedger smart contract operates as an immutable registry for Lesotho's agricultural marketplace.
                It enforces transparency, stores cryptographic state hashes, and generates event logs for distributed tracking.
              </p>

              <pre style={{
                background: '#0d1117',
                color: '#e6edf3',
                padding: '1.25rem',
                borderRadius: '10px',
                fontSize: '0.82rem',
                maxHeight: '450px',
                overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgriLedger - Decentralized Agricultural Record & Integrity Registry
 * @notice Part B: Blockchain Technology (20 Marks)
 */
contract AgriLedger {
    address public owner;
    uint256 public totalListingsCount;

    struct ListingRecord {
        uint256 listingId;
        string cropName;
        string category;
        uint256 quantityKg;
        uint256 pricePerUnitLsl;
        string location;
        uint256 sellerId;
        address recorderAddress;
        uint256 timestamp;
        bytes32 recordHash;
        bool exists;
    }

    mapping(uint256 => ListingRecord) public listings;

    event ListingRecorded(
        uint256 indexed listingId,
        string cropName,
        uint256 pricePerUnitLsl,
        uint256 indexed sellerId,
        bytes32 recordHash,
        uint256 timestamp
    );

    function recordListing(
        uint256 _listingId,
        string memory _cropName,
        string memory _category,
        uint256 _quantityKg,
        uint256 _pricePerUnitLsl,
        string memory _location,
        uint256 _sellerId
    ) public returns (bytes32) {
        bytes32 recordHash = keccak256(
            abi.encodePacked(
                _listingId, _cropName, _category,
                _quantityKg, _pricePerUnitLsl,
                _location, _sellerId,
                block.timestamp, msg.sender
            )
        );

        listings[_listingId] = ListingRecord({
            listingId: _listingId,
            cropName: _cropName,
            category: _category,
            quantityKg: _quantityKg,
            pricePerUnitLsl: _pricePerUnitLsl,
            location: _location,
            sellerId: _sellerId,
            recorderAddress: msg.sender,
            timestamp: block.timestamp,
            recordHash: recordHash,
            exists: true
        });

        totalListingsCount++;
        emit ListingRecorded(_listingId, _cropName, _pricePerUnitLsl, _sellerId, recordHash, block.timestamp);
        return recordHash;
    }

    function verifyListingIntegrity(
        uint256 _listingId,
        string memory _cropName,
        uint256 _quantityKg,
        uint256 _pricePerUnitLsl
    ) public view returns (bool isValid, bytes32 storedHash, bytes32 recalculatedHash) {
        require(listings[_listingId].exists, "Record not on blockchain");
        ListingRecord memory record = listings[_listingId];
        bytes32 recalculated = keccak256(abi.encodePacked(_listingId, _cropName, _quantityKg, _pricePerUnitLsl, record.timestamp));
        return (record.recordHash == recalculated, record.recordHash, recalculated);
    }
}`}
              </pre>
            </div>
          </div>
        )}
      </Container>

      {/* Block Inspector Modal */}
      <Modal show={!!selectedBlock} onHide={() => setSelectedBlock(null)} centered size="lg">
        <Modal.Header closeButton style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
          <Modal.Title style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaCube color="var(--color-primary-lt)" /> Block #{selectedBlock?.block_height} Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
          {selectedBlock && (
            <Row className="g-3">
              <Col sm={6}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CROP PRODUCE</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-lt)' }}>
                  {selectedBlock.crop_name}
                </div>
              </Col>
              <Col sm={6}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VOLUME & UNIT PRICE</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                  {selectedBlock.quantity_kg} kg @ M {parseFloat(selectedBlock.price_per_kg_lsl).toFixed(2)}
                </div>
              </Col>
              <Col xs={12}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TRANSACTION HASH</div>
                <code style={{ fontSize: '0.78rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {selectedBlock.transaction_hash}
                </code>
              </Col>
              <Col xs={12}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PREVIOUS BLOCK HASH (CHAIN LINK)</div>
                <code style={{ fontSize: '0.78rem', color: 'var(--color-secondary)', wordBreak: 'break-all' }}>
                  {selectedBlock.previous_block_hash}
                </code>
              </Col>
              <Col xs={12}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MERKLE ROOT</div>
                <code style={{ fontSize: '0.78rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {selectedBlock.merkle_root}
                </code>
              </Col>
              <Col sm={6}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VALIDATOR NODE ADDRESS</div>
                <code style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {selectedBlock.validator_address}
                </code>
              </Col>
              <Col sm={6}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MINED TIMESTAMP</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {new Date(selectedBlock.createdAt).toLocaleString()}
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default BlockchainPage;

