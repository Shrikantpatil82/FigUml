import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { saveDiagram, loadDiagram } from '../utils/diagramStorage';
import { renderCustomDiagram, hasCustomRenderer, DIAGRAM_TYPES, DIAGRAM_GUIDES } from '../utils/diagramEngine';
import { renderWithKroki } from '../utils/kroki';
import { v4 as uuidv4 } from 'uuid';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import Modal from '../components/Modal';
import './Editor.css';

export default function Editor() {
    const { id } = useParams();
    const { user, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [diagramId] = useState(id || uuidv4());
    const [fileName, setFileName] = useState('Untitled Diagram');
    const [diagramType, setDiagramType] = useState('class');
    const [code, setCode] = useState(DIAGRAM_TYPES.class.defaultCode);
    const [outputFormat, setOutputFormat] = useState('svg');
    const [renderedOutput, setRenderedOutput] = useState('');
    const [renderError, setRenderError] = useState('');
    const [rendering, setRendering] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [saved, setSaved] = useState(false);
    const [clearModal, setClearModal] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);

    const editorRef = useRef(null);
    const editorViewRef = useRef(null);
    const renderTimeoutRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const menuRef = useRef(null);
    const codeRef = useRef(code);
    const outputRef = useRef(null);

    useEffect(() => { codeRef.current = code; }, [code]);

    // Load existing diagram
    useEffect(() => {
        if (id && user) {
            loadDiagram(id).then(data => {
                if (data) {
                    setFileName(data.name || 'Untitled Diagram');
                    setDiagramType(data.diagramType || 'class');
                    setCode(data.code || '');
                }
            });
        }
    }, [id, user]);

    // Initialize CodeMirror
    useEffect(() => {
        if (!editorRef.current) return;

        const extensions = [
            basicSetup,
            EditorView.updateListener.of(update => {
                if (update.docChanged) {
                    const newCode = update.state.doc.toString();
                    setCode(newCode);
                }
            }),
            EditorView.lineWrapping,
        ];

        const state = EditorState.create({ doc: codeRef.current, extensions });
        const view = new EditorView({ state, parent: editorRef.current });
        editorViewRef.current = view;

        return () => view.destroy();
    }, []);

    // Render diagram on code/type change
    useEffect(() => {
        if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = setTimeout(() => handleRender(), 500);
        return () => { if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current); };
    }, [code, diagramType, outputFormat]);

    // Auto-save
    useEffect(() => {
        if (!user || !code) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => handleAutoSave(), 3000);
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [code, fileName, diagramType, user]);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Ctrl+scroll zoom
    useEffect(() => {
        const container = outputRef.current;
        if (!container) return;
        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setZoomLevel(prev => {
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    return Math.min(3, Math.max(0.25, prev + delta));
                });
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    const handleRender = useCallback(async () => {
        if (!code.trim()) {
            setRenderedOutput('');
            setRenderError('');
            return;
        }

        setRendering(true);
        setRenderError('');

        try {
            if (hasCustomRenderer(diagramType)) {
                const result = renderCustomDiagram(code, diagramType);
                if (result) {
                    setRenderedOutput(result);
                } else {
                    setRenderError('Could not parse diagram. Check your syntax.');
                }
            } else {
                const result = await renderWithKroki(code, diagramType, outputFormat);
                if (outputFormat === 'svg') {
                    setRenderedOutput(result);
                } else {
                    setRenderedOutput(`<img src="${result}" alt="Rendered diagram" />`);
                }
            }
        } catch (err) {
            setRenderError(err.message || 'Failed to render diagram');
        }

        setRendering(false);
    }, [code, diagramType, outputFormat]);

    const handleAutoSave = async () => {
        if (!user) return;
        try {
            await saveDiagram(diagramId, user.uid, { name: fileName, code, diagramType });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Auto-save failed:', err);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        await handleAutoSave();
        showToast('Diagram saved!', 'success');
    };

    const handleClear = () => {
        const defaultCode = DIAGRAM_TYPES[diagramType]?.defaultCode || '';
        setCode(defaultCode);
        if (editorViewRef.current) {
            editorViewRef.current.dispatch({
                changes: { from: 0, to: editorViewRef.current.state.doc.length, insert: defaultCode },
            });
        }
        setClearModal(false);
    };

    const handleDownload = () => {
        if (!renderedOutput) return;

        if (outputFormat === 'svg') {
            const blob = new Blob([renderedOutput], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.svg`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            // PNG download: convert SVG to canvas then to PNG
            const svgContent = renderedOutput;
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = 2;
                canvas.width = img.naturalWidth * scale;
                canvas.height = img.naturalHeight * scale;
                const ctx = canvas.getContext('2d');
                ctx.scale(scale, scale);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const pngUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = pngUrl;
                        a.download = `${fileName}.png`;
                        a.click();
                        URL.revokeObjectURL(pngUrl);
                    }
                }, 'image/png');
                URL.revokeObjectURL(url);
            };
            img.onerror = () => {
                showToast('Failed to generate PNG', 'error');
                URL.revokeObjectURL(url);
            };
            img.src = url;
        }
    };

    const handleCopyLink = async () => {
        try {
            if (user) {
                await saveDiagram(diagramId, user.uid, { name: fileName, code, diagramType, isShared: true });
            }
            const url = `${window.location.origin}/view/${diagramId}`;
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = url;
                textarea.style.cssText = 'position:fixed;opacity:0;left:-9999px';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                try { document.execCommand('copy'); } catch { }
                document.body.removeChild(textarea);
            }
            showToast('Link copied to clipboard!', 'success');
        } catch (err) {
            console.error('Copy link error:', err);
            showToast(`Share link: ${window.location.origin}/view/${diagramId}`, 'info');
        }
    };

    const handleTypeChange = (newType) => {
        setDiagramType(newType);
        const defaultCode = DIAGRAM_TYPES[newType]?.defaultCode || '';
        setCode(defaultCode);
        if (editorViewRef.current) {
            editorViewRef.current.dispatch({
                changes: { from: 0, to: editorViewRef.current.state.doc.length, insert: defaultCode },
            });
        }
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(3, prev + 0.25));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(0.25, prev - 0.25));
    const handleZoomReset = () => setZoomLevel(1);

    if (authLoading) return null;
    if (!user) return <Navigate to="/auth" replace />;

    return (
        <div className="editor-page">
            <Modal
                open={clearModal}
                onClose={() => setClearModal(false)}
                onConfirm={handleClear}
                title="Clear All Code"
                message="This will reset the editor to default code. This action cannot be undone."
                confirmText="Clear All"
                confirmDanger
            />

            {/* Left Pane */}
            <div className="editor-pane editor-pane--left">
                <div className="editor-pane__header">
                    <input
                        type="text"
                        className="editor-pane__filename"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Untitled Diagram"
                    />

                    <div className="editor-pane__menu-wrap" ref={menuRef}>
                        <button className="editor-pane__menu-btn" onClick={() => setShowMenu(!showMenu)} title="Menu">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                        </button>

                        {showMenu && (
                            <div className="editor-pane__menu animate-fade-in">
                                <button onClick={() => { setClearModal(true); setShowMenu(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    Clear All
                                </button>
                                <button onClick={() => { handleSave(); setShowMenu(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                    Save
                                </button>
                                <button onClick={() => navigate('/')}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                    Home
                                </button>
                            </div>
                        )}
                    </div>

                    {saved && <span className="editor-pane__saved">✓ Saved</span>}
                </div>

                <div className="editor-pane__type-bar">
                    <label htmlFor="diagramType">Type:</label>
                    <select
                        id="diagramType"
                        value={diagramType}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="editor-pane__select"
                    >
                        {Object.entries(DIAGRAM_TYPES).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                    <button className="btn btn-secondary btn-sm editor-pane__guide-btn" onClick={() => setGuideOpen(true)} title="Syntax Guide">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        <span className="editor-pane__btn-label">Guide</span>
                    </button>
                </div>

                <div className="editor-pane__editor" ref={editorRef} />
            </div>

            {/* Right Pane */}
            <div className="editor-pane editor-pane--right">
                <div className="editor-pane__header editor-pane__header--right">
                    <div className="editor-pane__output-controls">
                        <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} className="editor-pane__select">
                            <option value="svg">SVG</option>
                            <option value="png">PNG</option>
                        </select>
                        <button className="btn btn-secondary btn-sm" onClick={handleDownload} disabled={!renderedOutput} title="Download">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            <span className="editor-pane__btn-label">Download</span>
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={handleCopyLink} title="Copy shareable link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                            <span className="editor-pane__btn-label">Copy Link</span>
                        </button>
                    </div>
                    <div className="editor-pane__zoom-controls">
                        <button className="editor-pane__zoom-btn" onClick={handleZoomOut} title="Zoom out" disabled={zoomLevel <= 0.25}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                        </button>
                        <span className="editor-pane__zoom-label">{Math.round(zoomLevel * 100)}%</span>
                        <button className="editor-pane__zoom-btn" onClick={handleZoomIn} title="Zoom in" disabled={zoomLevel >= 3}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                        </button>
                        <button className="editor-pane__zoom-btn" onClick={handleZoomReset} title="Reset zoom">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        </button>
                    </div>
                </div>

                <div className="editor-pane__output" ref={outputRef}>
                    {rendering && (
                        <div className="editor-pane__rendering">
                            <div className="spinner" />
                            <span>Rendering...</span>
                        </div>
                    )}
                    {renderError && (
                        <div className="editor-pane__error">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            <span>{renderError}</span>
                        </div>
                    )}
                    {!rendering && !renderError && renderedOutput && (
                        <div
                            className="editor-pane__svg-container"
                            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                            dangerouslySetInnerHTML={{ __html: renderedOutput }}
                        />
                    )}
                    {!rendering && !renderError && !renderedOutput && (
                        <div className="editor-pane__placeholder">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <p>Your diagram will appear here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Guide Modal */}
            {guideOpen && (
                <div className="guide-overlay" onClick={() => setGuideOpen(false)}>
                    <div className="guide-modal animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="guide-modal__header">
                            <h3>{DIAGRAM_GUIDES[diagramType]?.title || 'Syntax Guide'}</h3>
                            <button className="guide-modal__close" onClick={() => setGuideOpen(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="guide-modal__body">
                            {DIAGRAM_GUIDES[diagramType]?.sections.map((s, i) => (
                                <div key={i} className="guide-section">
                                    <h4>{s.heading}</h4>
                                    <pre className="guide-section__code">{s.content}</pre>
                                    {s.note && <p className="guide-section__note">{s.note}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
