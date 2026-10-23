import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadDiagram } from '../utils/diagramStorage';
import { renderCustomDiagram, hasCustomRenderer } from '../utils/diagramEngine';
import { renderWithKroki } from '../utils/kroki';
import './SharedView.css';

export default function SharedView() {
    const { id } = useParams();
    const [diagram, setDiagram] = useState(null);
    const [renderedOutput, setRenderedOutput] = useState('');
    const [renderError, setRenderError] = useState('');
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) {
            setNotFound(true);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchAndRender = async () => {
            try {
                const data = await loadDiagram(id);

                if (cancelled) return;

                if (!data) {
                    setNotFound(true);
                    setLoading(false);
                    return;
                }

                setDiagram(data);

                const type = data.diagramType || 'class';
                const code = data.code || '';

                if (hasCustomRenderer(type)) {
                    const result = renderCustomDiagram(code, type);
                    if (result) {
                        setRenderedOutput(result);
                    } else {
                        setRenderError('Could not render this diagram. Check the diagram syntax.');
                    }
                } else {
                    const result = await renderWithKroki(code, type, 'svg');
                    setRenderedOutput(result);
                }
            } catch (err) {
                if (cancelled) return;
                console.error('SharedView error:', err);

                // Firestore permission errors typically contain these keywords
                if (err.code === 'permission-denied' || err.message?.includes('permission') || err.message?.includes('Missing or insufficient')) {
                    setRenderError('This diagram is not publicly accessible. The owner may need to update their Firestore security rules to allow public reads.');
                } else {
                    setRenderError(err.message || 'Failed to load diagram');
                }
            }

            if (!cancelled) setLoading(false);
        };

        fetchAndRender();

        // Safety timeout — if Firestore hangs, show an error after 15 seconds
        const timeout = setTimeout(() => {
            if (!cancelled) {
                setLoading(false);
                setRenderError('Loading timed out. The diagram may not be accessible or Firestore rules may need updating.');
            }
        }, 15000);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [id]);

    if (loading) {
        return (
            <div className="shared-view shared-view--loading">
                <div className="spinner" />
                <p>Loading diagram...</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="shared-view shared-view--not-found">
                <h2>Diagram Not Found</h2>
                <p>This diagram may have been deleted or the link is invalid.</p>
                <Link to="/" className="btn btn-primary">Go Home</Link>
            </div>
        );
    }

    return (
        <div className="shared-view">
            <div className="shared-view__header">
                <div className="shared-view__info">
                    <h3>{diagram?.name || 'Untitled Diagram'}</h3>
                    <span className="badge">{diagram?.diagramType || 'Diagram'}</span>
                </div>
                <span className="shared-view__label">Read-only view</span>
            </div>

            <div className="shared-view__output">
                {renderError ? (
                    <div className="editor-pane__error">
                        <span>{renderError}</span>
                    </div>
                ) : (
                    <div
                        className="editor-pane__svg-container"
                        dangerouslySetInnerHTML={{ __html: renderedOutput }}
                    />
                )}
            </div>
        </div>
    );
}
