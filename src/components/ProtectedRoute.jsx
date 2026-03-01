import { Navigate } from "react-router-dom";
import { getToken } from "../services/api";

export default function ProtectedRoute({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}