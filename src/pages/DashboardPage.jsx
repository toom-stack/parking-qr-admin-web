// src/pages/DashboardPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import TodayIcon from "@mui/icons-material/Today";
import DateRangeIcon from "@mui/icons-material/DateRange";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import PlaceIcon from "@mui/icons-material/Place";

import { api } from "../services/api";

// ---------------- utils ----------------
function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmtYYYYMMDD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function problemTh(t) {
  switch (t) {
    case "PARK_RED_WHITE":
      return "จอดขาวแดง";
    case "BLOCKING":
      return "กีดขวาง";
    case "NO_PARKING":
      return "ห้ามจอด";
    case "OTHER":
      return "อื่น ๆ";
    default:
      return t || "-";
  }
}

// ---- robust fetch using token in localStorage ----
const TOKEN_KEY = "token";
function getTokenLS() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
async function fetchJson(path, { method = "GET", body, headers } = {}) {
  const base = (api?.baseUrl || "https://parking-qr-backend.onrender.com").trim();
  const token = getTokenLS();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    // backend บางทีส่ง html error
    let msg = text;
    try {
      const j = text ? JSON.parse(text) : null;
      msg = j?.message || j?.error || text;
    } catch (_) {}
    throw new Error(msg || `HTTP ${res.status}`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function maxByValue(obj) {
  let bestK = "";
  let bestV = -Infinity;
  for (const [k, v] of Object.entries(obj || {})) {
    if (v > bestV) {
      bestV = v;
      bestK = k;
    }
  }
  return { key: bestK, value: bestV === -Infinity ? 0 : bestV };
}

export default function DashboardPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // quick range mode
  const [mode, setMode] = useState("month"); // today | 7d | month

  // results
  const [todayCount, setTodayCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [topProblem, setTopProblem] = useState({ label: "-", count: 0 });

  const [byTypeMonth, setByTypeMonth] = useState([]); // [{type,label,total}]
  const [series7d, setSeries7d] = useState([]); // [{label,total}]
  const [topVehicles, setTopVehicles] = useState([]); // [{plateNo,brand,model,total}]

  // ✅ NEW: Top locations
  const [topLocations, setTopLocations] = useState([]); // [{locationText,total}]

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => startOfDay(new Date()), []);
  const monthStart = useMemo(() => startOfMonth(new Date()), []);

  const range = useMemo(() => {
    const t = startOfDay(new Date());
    if (mode === "today") {
      return { from: t, to: t, title: "วันนี้" };
    }
    if (mode === "7d") {
      const from = addDays(t, -6);
      return { from, to: t, title: "7 วันล่าสุด" };
    }
    const from = startOfMonth(new Date());
    return { from, to: t, title: "เดือนนี้" };
  }, [mode]);

  async function load() {
    setErr("");
    setBusy(true);

    try {
      // -----------------------------------------
      // 1) ✅ Dashboard summary from backend:
      // GET /reports/admin/summary
      // returns:
      // { todayTotal, monthTotal, topProblemTypes:[{problemType,total}], topLocations:[{locationText,total}], dailySeries:[{date,total}] }
      // -----------------------------------------
      const sum = await fetchJson("/reports/admin/summary", {
        method: "GET",
      });

      const todayTotal = Number(sum?.todayTotal || 0);
      const monthTotal = Number(sum?.monthTotal || 0);

      const tp = Array.isArray(sum?.topProblemTypes) ? sum.topProblemTypes : [];
      const tl = Array.isArray(sum?.topLocations) ? sum.topLocations : [];

      // top problem
      const byType = {};
      for (const r of tp) {
        const type = String(r?.problemType || "OTHER");
        const n = Number(r?.total || r?._count?._all || 0);
        byType[type] = (byType[type] || 0) + n;
      }
      const top = maxByValue(byType);
      setTopProblem({
        label: top.key ? problemTh(top.key) : "-",
        count: top.value || 0,
      });

      // by type month (เรียงมาก -> น้อย)
      const byTypeArr = Object.entries(byType)
        .map(([k, v]) => ({ type: k, label: problemTh(k), total: v }))
        .sort((a, b) => b.total - a.total);
      setByTypeMonth(byTypeArr);

      // ✅ locations
      const locationsNorm = tl
        .map((x) => ({
          locationText: String(x?.locationText || "").trim(),
          total: Number(x?.total || x?._count?._all || 0),
        }))
        .filter((x) => x.locationText.length > 0)
        .sort((a, b) => b.total - a.total);
      setTopLocations(locationsNorm);

      setTodayCount(todayTotal);
      setMonthCount(monthTotal);

      // -----------------------------------------
      // 2) 7 วันล่าสุด: ถ้า backend ส่ง dailySeries มาก็ใช้เลย
      // ถ้าไม่มีก็ fallback ให้เป็น 0
      // -----------------------------------------
      const daily = Array.isArray(sum?.dailySeries) ? sum.dailySeries : [];
      const mapDay = {};
      for (const r of daily) {
        const key = String(r?.date || r?.period || "").trim(); // รองรับทั้ง date/period
        const n = Number(r?.total || 0);
        if (key) mapDay[key] = (mapDay[key] || 0) + n;
      }

      const from7 = addDays(today, -6);
      const series = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(from7, i);
        const key = fmtYYYYMMDD(d);
        series.push({ label: key.slice(5), total: mapDay[key] || 0 });
      }
      setSeries7d(series);

      // -----------------------------------------
      // 3) Top vehicles for selected range
      // GET /reports/top-vehicles?from&to&limit
      // -----------------------------------------
      const qs = new URLSearchParams({
        from: fmtYYYYMMDD(range.from),
        to: fmtYYYYMMDD(range.to),
        limit: "10",
      });

      const topV = await fetchJson(`/reports/top-vehicles?${qs.toString()}`);
      const tv = Array.isArray(topV?.data) ? topV.data : Array.isArray(topV) ? topV : [];
      const tvNorm = tv.map((x) => ({
        plateNo: String(x?.plateNo || "-"),
        brand: String(x?.brand || ""),
        model: String(x?.model || ""),
        total: Number(x?.total || 0),
      }));
      setTopVehicles(tvNorm);
    } catch (e) {
      setErr(e?.message || "โหลด Dashboard ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const max7 = useMemo(() => Math.max(1, ...series7d.map((x) => x.total)), [series7d]);
  const maxType = useMemo(() => Math.max(1, ...byTypeMonth.map((x) => x.total)), [byTypeMonth]);
  const maxLoc = useMemo(() => Math.max(1, ...topLocations.map((x) => x.total)), [topLocations]);

  return (
    <>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ md: "center" }}
        justifyContent="space-between"
        gap={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            อัปเดตล่าสุด: {now.toLocaleString()}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            icon={<TodayIcon />}
            label="วันนี้"
            variant={mode === "today" ? "filled" : "outlined"}
            onClick={() => setMode("today")}
            disabled={busy}
          />
          <Chip
            icon={<DateRangeIcon />}
            label="7 วันล่าสุด"
            variant={mode === "7d" ? "filled" : "outlined"}
            onClick={() => setMode("7d")}
            disabled={busy}
          />
          <Chip
            icon={<DateRangeIcon />}
            label="เดือนนี้"
            variant={mode === "month" ? "filled" : "outlined"}
            onClick={() => setMode("month")}
            disabled={busy}
          />
          <Button
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={busy}
            variant="outlined"
            sx={{ whiteSpace: "nowrap" }}
          >
            รีเฟรช
          </Button>
        </Stack>
      </Stack>

      {busy && <LinearProgress sx={{ mb: 2 }} />}

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <ReportProblemIcon fontSize="small" />
                <Typography color="text.secondary">รายงานวันนี้</Typography>
              </Stack>
              <Typography variant="h3" fontWeight={900}>
                {todayCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                รวมรายงานที่ถูกสร้างในวันนี้
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <TrendingUpIcon fontSize="small" />
                <Typography color="text.secondary">รายงานเดือนนี้</Typography>
              </Stack>
              <Typography variant="h3" fontWeight={900}>
                {monthCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                รวมรายงานตั้งแต่ต้นเดือนถึงวันนี้
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <ReportProblemIcon fontSize="small" />
                <Typography color="text.secondary">ปัญหายอดฮิต (เดือนนี้)</Typography>
              </Stack>
              <Typography variant="h5" fontWeight={900} sx={{ mt: 0.5 }}>
                {topProblem.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {topProblem.count} ครั้ง
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* 7 days chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography fontWeight={900} gutterBottom>
                แนวโน้มรายงาน (7 วันล่าสุด)
              </Typography>
              {series7d.length === 0 ? (
                <Typography color="text.secondary">ไม่มีข้อมูล</Typography>
              ) : (
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  {series7d.map((x) => (
                    <Box key={x.label}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          {x.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={800}>
                          {x.total}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(x.total / max7) * 100}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* by type */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography fontWeight={900} gutterBottom>
                สัดส่วนตามประเภทปัญหา (เดือนนี้)
              </Typography>

              {byTypeMonth.length === 0 ? (
                <Typography color="text.secondary">ไม่มีข้อมูล</Typography>
              ) : (
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  {byTypeMonth.map((x) => (
                    <Box key={x.type}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{x.label}</Typography>
                        <Typography variant="body2" fontWeight={800}>
                          {x.total}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(x.total / maxType) * 100}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ✅ Top locations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <PlaceIcon fontSize="small" />
                <Typography fontWeight={900}>สถานที่ที่โดนรายงานบ่อย (Top 8)</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                อ้างอิงจากช่อง “locationText” ในรายงาน
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              {topLocations.length === 0 ? (
                <Typography color="text.secondary">ยังไม่มีข้อมูลสถานที่ (หรือรายงานยังไม่กรอก locationText)</Typography>
              ) : (
                <Stack spacing={1.2}>
                  {topLocations.slice(0, 8).map((x, idx) => (
                    <Box key={`${x.locationText}-${idx}`}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={800}>
                          {idx + 1}. {x.locationText}
                        </Typography>
                        <Chip label={`${x.total} ครั้ง`} size="small" variant="outlined" />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(x.total / maxLoc) * 100}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top vehicles */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <DirectionsCarIcon fontSize="small" />
                <Typography fontWeight={900}>รถที่ถูกรายงานมากสุด (Top 10) — ช่วง: {range.title}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {fmtYYYYMMDD(range.from)} ถึง {fmtYYYYMMDD(range.to)}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              {topVehicles.length === 0 ? (
                <Typography color="text.secondary">ไม่มีข้อมูล</Typography>
              ) : (
                <Stack spacing={1}>
                  {topVehicles.map((v, idx) => (
                    <Box key={`${v.plateNo}-${idx}`} sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)" }}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ md: "center" }}
                        gap={0.5}
                      >
                        <Box>
                          <Typography fontWeight={900}>
                            {idx + 1}. {v.plateNo}{" "}
                            <Typography component="span" color="text.secondary" fontWeight={600}>
                              {`${v.brand} ${v.model}`.trim()}
                            </Typography>
                          </Typography>
                        </Box>
                        <Chip label={`${v.total} ครั้ง`} color="primary" variant="outlined" />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}