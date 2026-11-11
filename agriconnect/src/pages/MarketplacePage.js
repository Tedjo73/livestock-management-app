import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { FaSearch, FaTimes } from 'react-icons/fa';
import ListingCard from '../components/ListingCard';
import api from '../services/api';

const CATEGORIES = ['all', 'grains', 'vegetables', 'fruits', 'legumes', 'livestock', 'other'];
const DISTRICTS = ['', 'Maseru', 'Leribe', 'Berea', 'Mafeteng', "Mohale's Hoek", "Qacha's Nek", 'Mokhotlong', 'Quthing', 'Thaba-Tseka', 'Butha-Buthe'];

const MarketplacePage = () => {
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.set('search', search);
      if (category && category !== 'all') params.set('category', category);
      if (location) params.set('location', location);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);

      const res = await api.get(`/listings?${params}`);
      setListings(res.data.listings);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, location, minPrice, maxPrice, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchListings();
  };

  const clearFilters = () => {
    setSearch(''); setCategory('all'); setLocation(''); setMinPrice(''); setMaxPrice(''); setPage(1);
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <Container>
          <h1 className="section-title mb-1">Marketplace Directory</h1>
          <p className="section-subtitle mb-0">
            {total > 0 ? `${total} verified produce lots currently registered` : 'Direct producer marketplace listings across Lesotho'}
          </p>
        </Container>
      </div>

      <Container className="pb-5">
        {/* Filter Bar */}
        <div className="filter-bar">
          <form onSubmit={handleSearch} className="d-flex flex-grow-1 gap-2" style={{ minWidth: 220 }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <FaSearch size={13} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search crop or variety..."
                className="ag-form-control w-100"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <button type="submit" className="btn-ag-primary" style={{ whiteSpace: 'nowrap' }}>
              Search
            </button>
          </form>

          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="ag-form-control" style={{ minWidth: 140 }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>

          <select value={location} onChange={e => { setLocation(e.target.value); setPage(1); }} className="ag-form-control" style={{ minWidth: 140 }}>
            {DISTRICTS.map(d => <option key={d} value={d}>{d || 'All Districts'}</option>)}
          </select>

          <input value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min M" className="ag-form-control" style={{ width: 85 }} type="number" min="0" />
          <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max M" className="ag-form-control" style={{ width: 85 }} type="number" min="0" />

          {(search || category !== 'all' || location || minPrice || maxPrice) && (
            <button onClick={clearFilters} className="btn-ag-outline" style={{ whiteSpace: 'nowrap' }}>
              <FaTimes size={11} className="me-1" /> Reset
            </button>
          )}
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="ag-spinner" />
        ) : listings.length === 0 ? (
          <div className="ag-card text-center py-5">
            <h5 className="h6 text-secondary mb-1">No listings found matching criteria</h5>
            <p className="text-muted small mb-3">Adjust keyword search or location filters to view active supply.</p>
            <button onClick={clearFilters} className="btn-ag-outline">Reset Filter Parameters</button>
          </div>
        ) : (
          <>
            <Row className="g-3">
              {listings.map(l => (
                <Col key={l.id} xl={3} lg={4} md={6}>
                  <ListingCard listing={l} />
                </Col>
              ))}
            </Row>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-center gap-2 mt-4 pt-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ag-outline small">Previous</button>
                <span className="text-muted small align-self-center px-2">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ag-outline small">Next</button>
              </div>
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default MarketplacePage;
