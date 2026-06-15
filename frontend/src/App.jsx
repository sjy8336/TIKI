import { Navigate, Route, Routes } from 'react-router-dom';
import FileUploader from './pages/FileUploader';
import LoginPage from './pages/Login';
import SignUpPage from './pages/SignUp';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<FileUploader />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="*" element={<Navigate to="/upload" replace />} />
        </Routes>
    );
}

export default App;
