import React from 'react';
import { Navbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaStore, FaEnvelope, FaChartLine, FaCloudSun, FaLightbulb, FaUser, FaShieldAlt, FaSignOutAlt, FaBrain, FaLink, FaLock } from 'react-icons/fa';

const AppNavbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Navbar className="ag-navbar" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <span style={{ color: 'var(--color-primary-lt)', fontWeight: 800 }}>AGRI</span>CONNECT
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }} />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto gap-1">
            <Nav.Link as={NavLink} to="/marketplace" className={({ isActive }) => isActive ? 'active' : ''}>
              <FaStore size={12} className="me-1" />Marketplace
            </Nav.Link>
            <Nav.Link as={NavLink} to="/prices" className={({ isActive }) => isActive ? 'active' : ''}>
              <FaChartLine size={12} className="me-1" />Prices
            </Nav.Link>
            <Nav.Link as={NavLink} to="/weather" className={({ isActive }) => isActive ? 'active' : ''}>
              <FaCloudSun size={12} className="me-1" />Weather
            </Nav.Link>
            <Nav.Link as={NavLink} to="/tips" className={({ isActive }) => isActive ? 'active' : ''}>
              <FaLightbulb size={12} className="me-1" />Advisory
            </Nav.Link>
            <Nav.Link as={NavLink} to="/ai-dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
              <FaBrain size={12} className="me-1" />AI Analytics
            </Nav.Link>
            <Nav.Link as={NavLink} to="/blockchain" className={({ isActive }) => isActive ? 'active' : ''}>
              <FaLink size={12} className="me-1" />Ledger
            </Nav.Link>
            {isAuthenticated && (
              <Nav.Link as={NavLink} to="/messages" className={({ isActive }) => isActive ? 'active' : ''}>
                <FaEnvelope size={12} className="me-1" />Messages
              </Nav.Link>
            )}
          </Nav>

          <Nav className="align-items-center gap-2 mt-2 mt-lg-0">
            {isAuthenticated ? (
              <Dropdown align="end">
                <Dropdown.Toggle as="button" className="btn-ag-outline d-flex align-items-center gap-2" style={{ border: 'none', background: 'var(--bg-card-hover)', padding: '0.4rem 0.8rem' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 'var(--radius-xs)', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                    {user.name?.[0]}
                  </div>
                  <span className="small">{user.name.split(' ')[0]}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to="/dashboard">
                    <FaUser className="me-2" size={12} />Dashboard
                  </Dropdown.Item>
                  {user.role === 'farmer' && (
                    <Dropdown.Item as={Link} to="/listings/new">
                      Post Listing
                    </Dropdown.Item>
                  )}
                  {user.role === 'admin' && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item as={Link} to="/admin">
                        <FaShieldAlt className="me-2 text-warning" size={12} />Administration
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to="/security-config">
                        <FaLock className="me-2 text-danger" size={12} />Security Controls
                      </Dropdown.Item>
                    </>
                  )}
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="text-danger">
                    <FaSignOutAlt className="me-2" size={12} />Sign Out
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn-ag-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  Sign In
                </Link>
                <Link to="/register" className="btn-ag-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  Register
                </Link>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
