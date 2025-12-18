import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import HRDashboard from "./pages/HRDashboard";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" />} />

          <Route path="/login" element={<Login />} />

          <Route
            path="/employee"
            element={
              <ProtectedRoute role="EMPLOYEE">
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hr"
            element={
              <ProtectedRoute role="HR">
                <HRDashboard />
              </ProtectedRoute>
            }
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
