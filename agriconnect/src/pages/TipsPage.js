import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaSeedling, FaBug, FaTint, FaBoxOpen, FaLeaf } from 'react-icons/fa';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const CATEGORY_ICONS = {
  soil: <FaSeedling size={13} />, 'pest-control': <FaBug size={13} />, irrigation: <FaTint size={13} />,
  storage: <FaBoxOpen size={13} />, harvest: <FaLeaf size={13} />, general: <FaLeaf size={13} />,
};

const TipsPage = () => {
  const { isAdvisor } = useAuth();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTips = async () => {
    try {
      const res = await api.get('/tips');
      setTips(res.data.tips || []);
    } catch { setTips([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTips(); }, []);

  const categories = ['all', ...new Set(tips.map(t => t.category))];
  const filtered = activeCategory === 'all' ? tips : tips.filter(t => t.category === activeCategory);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return toast.error('Title and content are required.');
    setSubmitting(true);
    try {
      await api.post('/tips', form);
      toast.success('Advisory bulletin published.');
      setShowForm(false);
      setForm({ title: '', content: '', category: 'general' });
      fetchTips();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post advisory.');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="page-header">
        <Container>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h1 className="section-title mb-1">Agronomic Advisory Bulletins</h1>
              <p className="section-subtitle mb-0">Technical farming recommendations and crop management guidance</p>
            </div>
            {isAdvisor && (
              <button onClick={() => setShowForm(!showForm)} className="btn-ag-primary">
                {showForm ? 'Cancel' : 'Publish Advisory'}
              </button>
            )}
          </div>
        </Container>
      </div>

      <Container className="pb-5">
        {/* Post advisory form (advisors only) */}
        {showForm && isAdvisor && (
          <div className="ag-card mb-4 p-4">
            <h5 className="h6 fw-bold text-white mb-3">Publish Agronomic Bulletin</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="ag-label">Bulletin Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="E.g. Fall Armyworm Scouting Protocols for Maize" className="ag-form-control w-100" />
              </div>
              <div className="mb-3">
                <label className="ag-label">Technical Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="ag-form-control w-100">
                  {['general', 'soil', 'pest-control', 'irrigation', 'harvest', 'storage'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="ag-label">Technical Guidance</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={5} placeholder="Provide actionable agronomic guidance..." className="ag-form-control w-100" style={{ resize: 'vertical' }} />
              </div>
              <div className="d-flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ag-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-ag-primary">{submitting ? 'Submitting...' : 'Confirm & Publish'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Category Filter */}
        <div className="d-flex flex-wrap gap-1 mb-4">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)} className={c === activeCategory ? 'btn-ag-primary' : 'btn-ag-outline'} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
              {c === 'all' ? 'All Advisories' : c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {loading ? <div className="ag-spinner" /> : (
          <Row className="g-3">
            {filtered.length === 0 ? (
              <Col><div className="ag-card text-center py-5 text-muted small">No bulletins filed under this category.</div></Col>
            ) : filtered.map(tip => (
              <Col key={tip.id} md={6} lg={4}>
                <div className="ag-card h-100 d-flex flex-column justify-content-between p-3">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge-tag d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        {CATEGORY_ICONS[tip.category] || <FaLeaf size={12} />}
                        {tip.category?.replace('-', ' ')}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>{new Date(tip.created_at).toLocaleDateString()}</span>
                    </div>
                    <h5 className="h6 text-white mb-2" style={{ lineHeight: 1.4 }}>{tip.title}</h5>
                    <p className="text-secondary small mb-0" style={{ lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tip.content}</p>
                  </div>
                  <div className="pt-3 mt-3 border-top border-secondary d-flex justify-content-between align-items-center small text-muted" style={{ borderColor: 'var(--border-color) !important', fontSize: '0.75rem' }}>
                    <span>Advisor: {tip.author?.name || 'Department Specialist'}</span>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </>
  );
};

export default TipsPage;
