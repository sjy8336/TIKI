import { Navigate, Route, Routes } from 'react-router-dom'
import FileUploader from './pages/FileUploader'
import Dashboard from './pages/Dashboard'
import Configuration from './pages/Configuration'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<FileUploader />} />
      <Route path="/configuration" element={<Configuration />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
