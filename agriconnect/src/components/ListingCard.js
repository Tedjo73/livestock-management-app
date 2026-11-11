import React from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaWeight } from 'react-icons/fa';

const ListingCard = ({ listing }) => {
  const { id, crop_name, category, quantity, unit, price_per_unit, location, views, seller } = listing;

  return (
    <Link to={`/listings/${id}`} style={{ textDecoration: 'none' }}>
      <div className="ag-card listing-card h-100">
        <div className="listing-image-placeholder">
          <span className="small text-secondary fw-semibold text-uppercase">{crop_name}</span>
        </div>

        <div className="ag-card-body d-flex flex-column justify-content-between flex-grow-1">
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className={`badge-category badge-${category}`}>{category}</span>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>{views || 0} views</span>
            </div>

            <div className="crop-name">{crop_name}</div>

            <div className="d-flex align-items-baseline gap-1 my-1">
              <span className="price">M {parseFloat(price_per_unit).toFixed(2)}</span>
              <span className="price-unit">/ {unit || 'kg'}</span>
            </div>
          </div>

          <div className="pt-3 mt-3 border-top border-secondary" style={{ borderColor: 'var(--border-color) !important' }}>
            <div className="d-flex flex-column gap-1 small text-secondary">
              <div className="d-flex justify-content-between">
                <span><FaWeight size={10} className="me-1 text-muted" />Volume</span>
                <span className="text-white">{quantity} {unit}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span><FaMapMarkerAlt size={10} className="me-1 text-muted" />Origin</span>
                <span className="text-white">{location}</span>
              </div>
              {seller && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Producer</span>
                  <span>{seller.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;
