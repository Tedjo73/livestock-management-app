import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaSearch } from 'react-icons/fa';
import api from '../services/api';

const CROP_TRENDS = {
  Maize: [
    { month: 'Jul', price: 5.50 }, { month: 'Aug', price: 6.00 }, { month: 'Sep', price: 5.80 },
    { month: 'Oct', price: 6.50 }, { month: 'Nov', price: 6.20 }, { month: 'Dec', price: 7.00 },
  ],
  Sorghum: [
    { month: 'Jul', price: 6.00 }, { month: 'Aug', price: 6.50 }, { month: 'Sep', price: 6.20 },
    { month: 'Oct', price: 7.00 }, { month: 'Nov', price: 6.80 }, { month: 'Dec', price: 7.50 },
  ],
  Tomatoes: [
    { month: 'Jul', price: 9.00 }, { month: 'Aug', price: 11.00 }, { month: 'Sep', price: 13.00 },
    { month: 'Oct', price: 12.00 }, { month: 'Nov', price: 14.00 }, { month: 'Dec', price: 15.00 },
  ],
};

const PricesPage = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('Maize');

  useEffect(() => {
    api.get('/prices').then(res => {
      setPrices(res.data.prices || []);
    }).catch(() => setPrices([])).finally(() => setLoading(false));
  }, []);

  const filtered = prices.filter(p => p.crop_name.toLowerCase().includes(search.toLowerCase()));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
          <div className="text-muted mb-1">{label}</div>
          <div className="fw-bold text-white">M {payload[0].value.toFixed(2)} / kg</div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="page-header">
        <Container>
          <h1 className="section-title mb-1">Crop Price Indices</h1>
          <p className="section-subtitle mb-0">Indicative wholesale market prices across regional hubs in Lesotho</p>
        </Container>
      </div>

      <Container className="pb-5">
        <Row className="g-3 mb-4">
          {/* Price Chart */}
          <Col lg={8}>
            <div className="ag-card h-100">
              <div className="ag-card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="small fw-bold text-uppercase text-secondary">Historical Monthly Trajectory — {selectedCrop}</span>
                  <div className="d-flex gap-1">
                    {Object.keys(CROP_TRENDS).map(crop => (
                      <button key={crop} onClick={() => setSelectedCrop(crop)} className={selectedCrop === crop ? 'btn-ag-primary' : 'btn-ag-outline'} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                        {crop}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={CROP_TRENDS[selectedCrop]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `M${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="price" stroke="var(--color-primary-lt)" strokeWidth={2} dot={{ fill: 'var(--color-primary-lt)', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Col>

          {/* Market Summary */}
          <Col lg={4}>
            <div className="ag-card h-100">
              <div className="ag-card-body">
                <span className="small fw-bold text-uppercase text-secondary d-block mb-3">Benchmark Spot Rates</span>
                {loading ? <div className="ag-spinner" /> : (
                  <div className="d-flex flex-column gap-2">
                    {prices.slice(0, 6).map(p => (
                      <div key={p.id} className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary" style={{ borderColor: 'var(--border-color) !important' }}>
                        <span className="small text-secondary fw-medium">{p.crop_name}</span>
                        <div className="text-end">
                          <span className="small fw-bold text-white">M {parseFloat(p.avg_price).toFixed(2)}</span>
                          <span className="text-muted ms-1 small">/kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* Full Price Table */}
        <div className="ag-card">
          <div className="ag-card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <span className="small fw-bold text-uppercase text-secondary">Commodity Trading Ledger</span>
              <div style={{ position: 'relative', width: 220 }}>
                <FaSearch size={12} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter crop..." className="ag-form-control" style={{ paddingLeft: '2rem', width: '100%' }} />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <Table className="ag-table" borderless>
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>Category</th>
                    <th>Weighted Avg (M/kg)</th>
                    <th>Observed Min</th>
                    <th>Observed Max</th>
                    <th>Reporting Terminal</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-4"><div className="ag-spinner" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-muted small">No commodity price data matches current filter</td></tr>
                  ) : (
                    filtered.map(p => (
                      <tr key={p.id}>
                        <td>{p.crop_name}</td>
                        <td><span className={`badge-category badge-${p.category || 'other'}`}>{p.category || 'other'}</span></td>
                        <td><strong>M {parseFloat(p.avg_price).toFixed(2)}</strong></td>
                        <td className="text-secondary">M {p.min_price ? parseFloat(p.min_price).toFixed(2) : '—'}</td>
                        <td className="text-secondary">M {p.max_price ? parseFloat(p.max_price).toFixed(2) : '—'}</td>
                        <td className="text-secondary">{p.market}</td>
                        <td className="text-muted small">{new Date(p.recorded_date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default PricesPage;
