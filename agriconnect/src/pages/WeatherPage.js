import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaThermometerHalf, FaTint, FaWind, FaExclamationTriangle, FaCloudRain } from 'react-icons/fa';
import api from '../services/api';

const DISTRICTS = ['Maseru', 'Leribe', 'Berea', 'Mafeteng', "Mohale's Hoek", "Qacha's Nek", 'Mokhotlong', 'Quthing', 'Thaba-Tseka', 'Butha-Buthe'];

const ALERTS = [
  { type: 'info', title: 'Rainfall Expected', desc: 'Precipitation forecast across Maseru and Berea. Recommended for maize and dry bean seedbed conditioning.', district: 'Maseru / Berea' },
  { type: 'warning', title: 'Frost Advisory', desc: 'Sub-zero ground temperatures forecast in highland regions overnight. Implement frost mitigation for seedling plots.', district: 'Mokhotlong / Thaba-Tseka' },
  { type: 'success', title: 'Optimal Harvest Window', desc: 'Dry, low-humidity conditions in southern lowlands. Favorable timing for field drying and mechanical harvest.', district: 'Mafeteng / Quthing' },
];

const WeatherPage = () => {
  const [district, setDistrict] = useState('Maseru');
  const [weather, setWeather] = useState(null);
  const [weatherSource, setWeatherSource] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchWeather = async (d) => {
    setLoading(true);
    try {
      const res = await api.get(`/prices/weather/${encodeURIComponent(d)}`);
      setWeather(res.data.weather);
      setWeatherSource(res.data.source || 'live');
    } catch {
      setWeather(null);
      setWeatherSource('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWeather(district); }, [district]);

  return (
    <>
      <div className="page-header">
        <Container>
          <div className="d-flex justify-content-between align-items-baseline flex-wrap gap-2">
            <div>
              <h1 className="section-title mb-1">Meteorological Conditions & Advisories</h1>
              <p className="section-subtitle mb-0">Live telemetry and agricultural alerts for all 10 Lesotho districts</p>
            </div>
            {weatherSource && (
              <span className="badge-tag small">
                Source: {weatherSource.includes('open-meteo') ? 'Open-Meteo Live API' : weatherSource.includes('openweathermap') ? 'OpenWeatherMap API' : 'Telemetry Feed'}
              </span>
            )}
          </div>
        </Container>
      </div>

      <Container className="pb-5">
        {/* District Selector */}
        <div className="d-flex flex-wrap gap-1 mb-4">
          {DISTRICTS.map(d => (
            <button key={d} onClick={() => setDistrict(d)} className={d === district ? 'btn-ag-primary' : 'btn-ag-outline'} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
              {d}
            </button>
          ))}
        </div>

        <Row className="g-3 mb-4">
          {/* Weather Telemetry Card */}
          <Col lg={5}>
            <div className="ag-card h-100 p-4">
              {loading ? (
                <div className="ag-spinner" />
              ) : weather ? (
                <>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <span className="small text-muted text-uppercase fw-semibold" style={{ letterSpacing: '0.05em' }}>{weather.district} Agro-Station</span>
                      <div className="weather-temp my-1">{Math.round(weather.temperature)}°C</div>
                      <div className="text-secondary small text-capitalize">{weather.description}</div>
                      {weather.minTemp !== undefined && weather.maxTemp !== undefined && (
                        <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
                          Range: {Math.round(weather.minTemp)}°C min / {Math.round(weather.maxTemp)}°C max
                        </div>
                      )}
                    </div>
                  </div>
                  <hr className="my-3 border-secondary" style={{ borderColor: 'var(--border-color) !important' }} />
                  <Row className="g-2 text-center">
                    <Col xs={3}>
                      <div className="ag-card p-2">
                        <div className="text-secondary mb-1"><FaThermometerHalf size={12} /></div>
                        <div className="text-muted" style={{ fontSize: '0.68rem' }}>Feels Like</div>
                        <div className="fw-semibold small text-white">{Math.round(weather.feelsLike)}°C</div>
                      </div>
                    </Col>
                    <Col xs={3}>
                      <div className="ag-card p-2">
                        <div className="text-secondary mb-1"><FaTint size={12} /></div>
                        <div className="text-muted" style={{ fontSize: '0.68rem' }}>Humidity</div>
                        <div className="fw-semibold small text-white">{weather.humidity}%</div>
                      </div>
                    </Col>
                    <Col xs={3}>
                      <div className="ag-card p-2">
                        <div className="text-secondary mb-1"><FaWind size={12} /></div>
                        <div className="text-muted" style={{ fontSize: '0.68rem' }}>Wind Speed</div>
                        <div className="fw-semibold small text-white">{weather.windSpeed} m/s</div>
                      </div>
                    </Col>
                    <Col xs={3}>
                      <div className="ag-card p-2">
                        <div className="text-secondary mb-1"><FaCloudRain size={12} /></div>
                        <div className="text-muted" style={{ fontSize: '0.68rem' }}>Precip</div>
                        <div className="fw-semibold small text-white">{weather.precipitation !== undefined ? `${weather.precipitation} mm` : '0 mm'}</div>
                      </div>
                    </Col>
                  </Row>
                  {weather.alert && (
                    <div className="mt-3 p-2 border border-secondary rounded small text-secondary" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border-color) !important' }}>
                      <span className="text-white fw-medium">Agro Advisory:</span> {weather.alert}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted small">Telemetry feed unavailable for selected station.</p>
              )}
            </div>
          </Col>

          {/* Seasonal Advisory */}
          <Col lg={7}>
            <div className="ag-card h-100 p-4">
              <span className="small fw-bold text-uppercase text-secondary d-block mb-3">Agronomic Growing Calendar (Lesotho Agro-Ecological Zones)</span>
              <div className="d-flex flex-column gap-3">
                {[
                  { season: 'Oct – Dec', label: 'Planting Season', crops: 'Maize, Sorghum, Sunflower, Beans', tip: 'Primary planting period for summer grain crops. Monitor basal fertilizer incorporation.' },
                  { season: 'Jan – Mar', label: 'Vegetative Phase', crops: 'Summer Field Crops', tip: 'Active weed and pest scouting (Fall Armyworm). Supplemental irrigation when rainfall falls below baseline.' },
                  { season: 'Apr – May', label: 'Primary Harvest', crops: 'Maize, Sorghum, Pulses', tip: 'Harvest moisture optimization. Ensure grain drying to ≤13% prior to storage bin loading.' },
                  { season: 'Jun – Sep', label: 'Winter Cropping', crops: 'Winter Wheat, Cold Vegetables', tip: 'Highland frost vulnerability. High-elevation plots require cold-tolerant winter wheat cultivars.' },
                ].map(s => (
                  <div key={s.season} className="d-flex gap-3 pb-2 border-bottom border-secondary" style={{ borderColor: 'var(--border-color) !important' }}>
                    <div style={{ minWidth: 85, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.season}</div>
                    <div>
                      <div className="small fw-semibold text-white">{s.label}</div>
                      <div className="small text-secondary" style={{ fontSize: '0.78rem' }}>{s.crops}</div>
                      <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>{s.tip}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>

        {/* Alerts */}
        <span className="small fw-bold text-uppercase text-secondary d-block mb-3">
          <FaExclamationTriangle className="me-2 text-warning" size={12} />Regional Operational Advisories
        </span>
        <Row className="g-3">
          {ALERTS.map((a, i) => (
            <Col key={i} md={4}>
              <div className="ag-card p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small fw-bold text-white">{a.title}</span>
                  <span className="badge-tag" style={{ fontSize: '0.68rem' }}>{a.district}</span>
                </div>
                <p className="text-secondary small mb-0" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{a.desc}</p>
              </div>
            </Col>
          ))}
        </Row>
      </Container>
    </>
  );
};

export default WeatherPage;
