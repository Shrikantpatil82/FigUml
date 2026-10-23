import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import MyDiagrams from './pages/MyDiagrams';
import Editor from './pages/Editor';
import SharedView from './pages/SharedView';

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <Navbar />
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/my-diagrams" element={<MyDiagrams />} />
                    <Route path="/editor" element={<Editor />} />
                    <Route path="/editor/:id" element={<Editor />} />
                    <Route path="/view/:id" element={<SharedView />} />
                </Routes>
            </ToastProvider>
        </AuthProvider>
    );
}
