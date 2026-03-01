import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
} from "@mui/material";

import { api, setToken, decodeJwt } from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin1234");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function doLogin() {
    setMsg("");
    setBusy(true);

    try {
      const res = await api.login(username, password);
      // backend คืนมา { token }
      const token = res?.token;

      if (!token) {
        throw new Error("ไม่พบ token จาก backend (ตรวจสอบ response)");
      }

      // ✅ decode JWT เพื่อดู role
      const payload = decodeJwt(token);
      const role = payload?.role;

      if (role !== "ADMIN") {
        throw new Error("บัญชีนี้ไม่ใช่ ADMIN");
      }

      setToken(token);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setMsg(e?.message || "Login ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Card sx={{ width: "min(520px, 100%)" }}>
        <CardContent sx={{ display: "grid", gap: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            Admin Login
          </Typography>

          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
            fullWidth
          />

          <TextField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            type="password"
            fullWidth
          />

          <Button variant="contained" onClick={doLogin} disabled={busy}>
            {busy ? "กำลัง Login..." : "Login"}
          </Button>

          {msg && <Alert severity="error">{msg}</Alert>}

          <Typography variant="body2" color="text.secondary">
            API: {api.baseUrl}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}