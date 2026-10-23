import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    const isLanding = location.pathname === '/';

    useEffect(() => {
        setMenuOpen(false);
        setDropdownOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 75);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const userInitial = user?.displayName?.[0] || user?.email?.[0] || 'U';

    const showScrolledNav = isLanding && scrolled;

    return (
        <nav className={`navbar ${isLanding ? 'navbar--transparent' : ''} ${showScrolledNav ? 'navbar--scrolled' : ''}`}>
            <div className="navbar__inner container">
                {/* Default: Logo left */}
                <Link
                    to="/"
                    className={`navbar__logo ${showScrolledNav ? 'navbar__logo--hidden' : ''}`}
                >
                    <span className="navbar__logo-text">
                        <span className="navbar__logo-fig">Fig</span>UML
                    </span>
                </Link>

                {/* Scrolled state: centered logo + chevron */}
                {showScrolledNav && (
                    <div className="navbar__center" ref={dropdownRef}>
                        <Link to="/" className="navbar__logo navbar__logo--center">
                            <span className="navbar__logo-text">
                                <span className="navbar__logo-fig">Fig</span>UML
                            </span>
                        </Link>
                        {user && (
                            <>
                                <button
                                    className={`navbar__chevron ${dropdownOpen ? 'navbar__chevron--open' : ''}`}
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    aria-label="Navigation menu"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>

                                {dropdownOpen && (
                                    <div className="navbar__mega-dropdown animate-fade-in">
                                        <div className="navbar__mega-card navbar__mega-card--profile">
                                            <div className="navbar__mega-avatar">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt="" />
                                                ) : (
                                                    <span>{userInitial}</span>
                                                )}
                                            </div>
                                            <div className="navbar__mega-user-info">
                                                <span className="navbar__mega-name">{user.displayName || 'User'}</span>
                                                <span className="navbar__mega-email">{user.email}</span>
                                            </div>
                                            <button
                                                className="navbar__mega-logout"
                                                onClick={handleLogout}
                                            >
                                                Logout
                                            </button>
                                        </div>
                                        <div className="navbar__mega-nav">
                                            <Link to="/" className="navbar__mega-btn" onClick={() => setDropdownOpen(false)}>
                                                Home
                                            </Link>
                                            <Link to="/my-diagrams" className="navbar__mega-btn" onClick={() => setDropdownOpen(false)}>
                                                My Diagrams
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Desktop Actions (non-scrolled) */}
                <div className={`navbar__actions ${showScrolledNav ? 'navbar__actions--hidden' : ''}`}>
                    {user ? (
                        <div className="navbar__profile">
                            <button
                                className="navbar__avatar"
                                onClick={() => navigate('/my-diagrams')}
                                aria-label="My Diagrams"
                            >
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="" className="navbar__avatar-img" />
                                ) : (
                                    <span className="navbar__avatar-initial">{userInitial}</span>
                                )}
                            </button>
                        </div>
                    ) : (
                        <Link to="/auth" className="btn btn-primary">
                            Sign In
                        </Link>
                    )}
                </div>

                {/* Mobile Hamburger */}
                <button
                    className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--active' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                >
                    <span /><span /><span />
                </button>

                {/* Mobile Menu */}
                {menuOpen && (
                    <div className="navbar__mobile animate-fade-in">
                        <div className="navbar__mobile-inner">
                            <Link to="/" className="navbar__mobile-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                Home
                            </Link>

                            {user ? (
                                <>
                                    <Link to="/my-diagrams" className="navbar__mobile-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                                        My Diagrams
                                    </Link>
                                    <button onClick={handleLogout} className="navbar__mobile-item navbar__mobile-item--danger">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <Link to="/auth" className="navbar__mobile-item navbar__mobile-item--primary">
                                    Sign In / Sign Up
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
