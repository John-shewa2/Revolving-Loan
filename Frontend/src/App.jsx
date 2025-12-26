import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/protectedRoute";

import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import HROfficerDashboard from "./pages/HROfficerDashboard";
// [NEW] Import HR Manager Dashboard
import HRManagerDashboard from "./pages/HRManagerDashboard"; 

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employee"
            element={
              <ProtectedRoute role="EMPLOYEE">
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hr-officer"
            element={
              <ProtectedRoute role="HR_OFFICER">
                <HROfficerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hr-manager"
            element={
              <ProtectedRoute role="HR_MANAGER">
                <HRManagerDashboard /> 
              </ProtectedRoute>
            }
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;