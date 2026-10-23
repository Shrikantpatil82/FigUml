import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listUserDiagrams, deleteDiagram } from '../utils/diagramStorage';
import { DIAGRAM_TYPES } from '../utils/diagramEngine';
import Modal from '../components/Modal';
import Footer from '../components/Footer';
import './MyDiagrams.css';

export default function MyDiagrams() {
    const { user, loading: authLoading } = useAuth();
    const [diagrams, setDiagrams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;
        loadDiagrams();
    }, [user]);

    const loadDiagrams = async () => {
        setLoading(true);
        try {
            const list = await listUserDiagrams(user.uid);
            setDiagrams(list);
        } catch (err) {
            console.error('Error loading diagrams:', err);
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDiagram(deleteTarget.id);
            setDiagrams(prev => prev.filter(d => d.id !== deleteTarget.id));
        } catch (err) {
            console.error('Error deleting diagram:', err);
        }
        setDeleteTarget(null);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getTypeLabel = (type) => {
        return DIAGRAM_TYPES[type]?.label || type || 'Diagram';
    };

    if (authLoading) return null;
    if (!user) return <Navigate to="/auth" replace />;

    return (
        <div className="my-diagrams">
            <Modal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete Diagram"
                message={`Are you sure you want to delete "${deleteTarget?.name || 'Untitled'}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmDanger
            />

            <div className="container">
                <div className="my-diagrams__header">
                    <div>
                        <h1>My Diagrams</h1>
                        <p className="my-diagrams__subtitle">Create, manage, and share your diagrams.</p>
                    </div>
                    <Link to="/editor" className="btn btn-primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        New Diagram
                    </Link>
                </div>

                {loading ? (
                    <div className="my-diagrams__loading">
                        <div className="spinner" />
                        <p>Loading your diagrams...</p>
                    </div>
                ) : diagrams.length === 0 ? (
                    <div className="my-diagrams__empty">
                        <div className="my-diagrams__empty-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                        </div>
                        <h3>No diagrams yet</h3>
                        <p>Create your first diagram to get started!</p>
                        <Link to="/editor" className="btn btn-primary" style={{ marginTop: '16px' }}>
                            Create Diagram
                        </Link>
                    </div>
                ) : (
                    <div className="my-diagrams__grid">
                        {diagrams.map((diagram) => (
                            <div
                                key={diagram.id}
                                className="diagram-card"
                                onClick={() => navigate(`/editor/${diagram.id}`)}
                            >
                                <div className="diagram-card__preview">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                </div>
                                <div className="diagram-card__info">
                                    <h4 className="diagram-card__name">{diagram.name || 'Untitled'}</h4>
                                    <span className="diagram-card__meta">
                                        {getTypeLabel(diagram.diagramType)} · {formatDate(diagram.updatedAt)}
                                    </span>
                                </div>
                                <button
                                    className="diagram-card__delete"
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(diagram); }}
                                    title="Delete diagram"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
