import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import GuardsPage from "./pages/GuardsPage";
import RegisterPage from "./pages/RegisterPage";

// (หน้าเก่า จะเก็บไว้ก็ได้ ไม่จำเป็นต้องลบ)
import OwnersPage from "./pages/OwnersPage";
import VehiclesPage from "./pages/VehiclesPage";

export default function App() {
  return (
    <BrowserRouter>
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

          {/* ✅ หน้าลงทะเบียนรวม Owner+Vehicle */}
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/guards" element={<GuardsPage />} />

          {/* ✅ ถ้าจะคงหน้าเดิมไว้ ใช้ได้ตามนี้ */}
          <Route path="/owners" element={<OwnersPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}