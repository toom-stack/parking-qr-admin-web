import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import GuardsPage from "./pages/GuardsPage";
import RegisterPage from "./pages/RegisterPage";
import OwnersPage from "./pages/OwnersPage";
import VehiclesPage from "./pages/VehiclesPage";

function hasToken() {
  return !!localStorage.getItem("token");
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/guards" element={<GuardsPage />} />
          <Route path="/owners" element={<OwnersPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
        </Route>

        <Route
          path="*"
          element={
            <Navigate to={hasToken() ? "/dashboard" : "/login"} replace />
          }
        />
      </Routes>
    </HashRouter>
  );
}