import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import './Landing.css';

const FEATURES = [
    { icon: '🎨', title: 'Multiple Diagram Types', desc: 'UML Class, Sequence, Activity, Use Case, ER diagrams, DFD, and more.', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    { icon: '⚡', title: 'Live Preview', desc: 'See your diagrams render in real-time as you type your code.', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
    { icon: '🔧', title: 'Powerful Editor', desc: 'Full-featured code editor with syntax highlighting and auto-complete.', gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
    { icon: '📤', title: 'Export Anywhere', desc: 'Download as SVG or PNG. Share via link for read-only collaboration.', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
    { icon: '☁️', title: 'Cloud Storage', desc: 'Your diagrams are saved automatically and accessible from any device.', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
    { icon: '🔒', title: 'Secure & Private', desc: 'Your diagrams are protected with Firebase authentication and private by default.', gradient: 'linear-gradient(135deg, #ec4899, #f472b6)' },
];

const EXAMPLES = [
    { type: 'Class Diagram', syntax: 'Custom Engine', color: '#6366f1', icon: '📐' },
    { type: 'Sequence Diagram', syntax: 'Custom Engine', color: '#06b6d4', icon: '🔄' },
    { type: 'Activity Diagram', syntax: 'Custom Engine', color: '#8b5cf6', icon: '📊' },
    { type: 'ER Diagram', syntax: 'Custom Engine', color: '#ec4899', icon: '🗃️' },
    { type: 'Use Case Diagram', syntax: 'Custom Engine', color: '#f59e0b', icon: '👤' },
    { type: 'Data Flow Diagram', syntax: 'Custom Engine', color: '#10b981', icon: '🔀' },
];

const STEPS = [
    { num: '01', title: 'Sign Up', desc: 'Create your free account with Google or email in seconds.' },
    { num: '02', title: 'Write Code', desc: 'Pick a diagram type and start writing using our intuitive syntax.' },
    { num: '03', title: 'See Results', desc: 'Your diagram renders instantly. Iterate and refine in real-time.' },
    { num: '04', title: 'Export & Share', desc: 'Download your diagram or share a read-only link with your team.' },
];

export default function Landing() {
    const { user } = useAuth();

    return (
        <div className="landing">
            {/* Hero */}
            <section className="hero">
                <div className="hero__bg">
                    <div className="hero__orb hero__orb--1" />
                    <div className="hero__orb hero__orb--2" />
                    <div className="hero__orb hero__orb--3" />
                </div>
                <div className="container hero__content">
                    <div className="badge animate-fade-in-up" style={{ animationDelay: '0.1s' }}>✨ Diagrams from Code</div>
                    <h1 className="hero__title animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        Design. Visualize.<br />
                        <span className="hero__title-accent">Ship Faster.</span>
                    </h1>
                    <p className="hero__subtitle animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        Transform your textual descriptions into stunning UML, ER, and Data Flow diagrams.
                        — no drag-and-drop needed.
                    </p>
                    <div className="hero__actions animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        <Link to={user ? '/my-diagrams' : '/auth'} className="btn btn-primary btn-lg">
                            Try it!
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="section features" id="features">
                <div className="container">
                    <div className="section__header">
                        <span className="badge">Features</span>
                        <h2>Everything you need to create diagrams</h2>
                        <p className="section__desc">A complete toolkit for turning ideas into professional diagrams.</p>
                    </div>
                    <div className="features__grid">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="feature-card__icon-wrap" style={{ background: f.gradient }}>
                                    <span className="feature-card__icon">{f.icon}</span>
                                </div>
                                <h4 className="feature-card__title">{f.title}</h4>
                                <p className="feature-card__desc">{f.desc}</p>
                                <div className="feature-card__glow" style={{ background: f.gradient }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Examples */}
            <section className="section examples" id="examples">
                <div className="container">
                    <div className="section__header">
                        <span className="badge">Examples</span>
                        <h2>Diagrams you can create</h2>
                        <p className="section__desc">Support for all major diagram types with our custom rendering engine.</p>
                    </div>
                    <div className="examples__grid">
                        {EXAMPLES.map((ex, i) => (
                            <Link key={i} to={user ? '/editor' : '/auth'} className="example-card" style={{ '--card-accent': ex.color }}>
                                <div className="example-card__preview">
                                    <span className="example-card__icon">{ex.icon}</span>
                                    <div className="example-card__bg-pattern" />
                                </div>
                                <div className="example-card__info">
                                    <span className="example-card__type">{ex.type}</span>
                                    <span className="example-card__syntax">{ex.syntax}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Getting Started */}
            <section className="section getting-started" id="getting-started">
                <div className="container">
                    <div className="section__header">
                        <span className="badge">Getting Started</span>
                        <h2>Up and running in minutes</h2>
                        <p className="section__desc">Four simple steps to your first diagram.</p>
                    </div>
                    <div className="steps">
                        <div className="steps__line" />
                        {STEPS.map((step, i) => (
                            <div key={i} className="step" style={{ animationDelay: `${i * 0.15}s` }}>
                                <div className="step__marker">
                                    <div className="step__number">{step.num}</div>
                                </div>
                                <div className="step__content">
                                    <h4>{step.title}</h4>
                                    <p>{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
