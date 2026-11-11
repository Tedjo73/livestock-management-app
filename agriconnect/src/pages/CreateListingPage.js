import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';

const CATEGORIES = ['grains', 'vegetables', 'fruits', 'legumes', 'livestock', 'other'];
const UNITS = ['kg', 'g', 'tonnes', 'bags (50kg)', 'bags (25kg)', 'crates', 'bunches', 'litres', 'each'];
const DISTRICTS = ['Maseru', 'Leribe', 'Berea', 'Mafeteng', "Mohale's Hoek", "Qacha's Nek", 'Mokhotlong', 'Quthing', 'Thaba-Tseka', 'Butha-Buthe'];

const CreateListingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    crop_name: '', category: 'grains', quantity: '', unit: 'kg',
    price_per_unit: '', description: '', location: user?.location || '', image_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.crop_name.trim()) e.crop_name = 'Crop designation is required';
    if (!form.quantity || form.quantity <= 0) e.quantity = 'Specify a valid volume';
    if (!form.price_per_unit || form.price_per_unit < 0) e.price_per_unit = 'Specify valid unit price';
    if (!form.location) e.location = 'Origin district is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) return setErrors(v);
    setErrors({});
    setLoading(true);
    try {
      const res = await api.post('/listings', form);
      toast.success('Market lot listed successfully.');
      navigate(`/listings/${res.data.listing.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <Container>
          <button onClick={() => navigate(-1)} className="btn-ag-outline mb-2" style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
            <FaArrowLeft size={10} className="me-1" /> Return
          </button>
          <h1 className="section-title mb-1">Create Produce Lot</h1>
          <p className="section-subtitle mb-0">Publish agricultural supply to wholesale and retail buyers across Lesotho</p>
        </Container>
      </div>

      <Container className="pb-5">
        <Row className="justify-content-center">
          <Col lg={8}>
            <div className="ag-card p-4">
              <form onSubmit={handleSubmit}>
                <Row className="g-3">
                  <Col md={8}>
                    <label className="ag-label">Commodity / Crop Name *</label>
                    <input
                      name="crop_name"
                      value={form.crop_name}
                      onChange={handleChange}
                      placeholder="E.g. Yellow Maize, Sorghum, Sugar Beans"
                      className={`ag-form-control w-100 ${errors.crop_name ? 'is-invalid' : ''}`}
                    />
                    {errors.crop_name && <div className="text-danger small mt-1">{errors.crop_name}</div>}
                  </Col>

                  <Col md={4}>
                    <label className="ag-label">Classification *</label>
                    <select name="category" value={form.category} onChange={handleChange} className="ag-form-control w-100">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </Col>

                  <Col md={6}>
                    <label className="ag-label">Available Volume *</label>
                    <input
                      name="quantity"
                      type="number"
                      min="0.1"
                      step="any"
                      value={form.quantity}
                      onChange={handleChange}
                      placeholder="Available quantity"
                      className={`ag-form-control w-100 ${errors.quantity ? 'is-invalid' : ''}`}
                    />
                    {errors.quantity && <div className="text-danger small mt-1">{errors.quantity}</div>}
                  </Col>

                  <Col md={6}>
                    <label className="ag-label">Trade Unit *</label>
                    <select name="unit" value={form.unit} onChange={handleChange} className="ag-form-control w-100">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </Col>

                  <Col md={6}>
                    <label className="ag-label">Price per Unit (LSL / Maloti) *</label>
                    <input
                      name="price_per_unit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price_per_unit}
                      onChange={handleChange}
                      placeholder="M 0.00"
                      className={`ag-form-control w-100 ${errors.price_per_unit ? 'is-invalid' : ''}`}
                    />
                    {errors.price_per_unit && <div className="text-danger small mt-1">{errors.price_per_unit}</div>}
                  </Col>

                  <Col md={6}>
                    <label className="ag-label">Origin District *</label>
                    <select name="location" value={form.location} onChange={handleChange} className={`ag-form-control w-100 ${errors.location ? 'is-invalid' : ''}`}>
                      <option value="">Select origin</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.location && <div className="text-danger small mt-1">{errors.location}</div>}
                  </Col>

                  <Col md={12}>
                    <label className="ag-label">Lot Description & Quality Specifications</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Provide grade, harvest date, packaging specifications, or logistical details..."
                      className="ag-form-control w-100"
                      style={{ resize: 'vertical' }}
                    />
                  </Col>
                </Row>

                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary" style={{ borderColor: 'var(--border-color) !important' }}>
                  <button type="button" onClick={() => navigate(-1)} className="btn-ag-outline">Cancel</button>
                  <button type="submit" disabled={loading} className="btn-ag-primary">
                    {loading ? 'Submitting...' : 'Register Market Lot'}
                  </button>
                </div>
              </form>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default CreateListingPage;
