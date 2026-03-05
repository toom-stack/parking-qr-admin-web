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

function sumTotalsFromSummary(summaryJson) {
  const rows = Array.isArray(summaryJson?.data) ? summaryJson.data : [];
  let total = 0;
  const byType = {};
  for (const r of rows) {
    const type = String(r?.problemType || "OTHER");
    const n = Number(r?.total || 0);
    total += n;
    byType[type] = (byType[type] || 0) + n;
  }
  return { total, byType, rows };
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

function normLoc(s) {
  const x = String(s || "").trim();
  if (!x) return "";
  // รวมที่คล้ายกันแบบง่าย ๆ (ปรับได้)
  return x.replace(/\s+/g, " ");
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

  const [byTypeMonth, setByTypeMonth] = useState([]);
  const [series7d, setSeries7d] = useState([]); // [{label, total}]
  const [topVehicles, setTopVehicles] = useState([]);

  // ✅ ใหม่: top locations (จาก /reports/admin)
  const [topLocations, setTopLocations] = useState([]); // [{label,total}]

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => startOfDay(new Date()), []);
  const monthStart = useMemo(() => startOfMonth(new Date()), []);

  const range = useMemo(() => {
    const t = startOfDay(new Date());
    if (mode === "today") return { from: t, to: t, title: "วันนี้" };
    if (mode === "7d") return { from: addDays(t, -6), to: t, title: "7 วันล่าสุด" };
    return { from: startOfMonth(new Date()), to: t, title: "เดือนนี้" };
  }, [mode]);

  async function load() {
    setErr("");
    setBusy(true);

    try {
      // 1) Today count
      const sumToday = await api.reportsSummary({
        from: fmtYYYYMMDD(today),
        to: fmtYYYYMMDD(today),
        group: "day",
      });
      const t = sumTotalsFromSummary(sumToday).total;

      // 2) Month count + byType + top problem in month
      const sumMonth = await api.reportsSummary({
        from: fmtYYYYMMDD(monthStart),
        to: fmtYYYYMMDD(today),
        group: "day",
      });
      const monthAgg = sumTotalsFromSummary(sumMonth);
      const m = monthAgg.total;

      const top = maxByValue(monthAgg.byType);
      const topProblemLabel = top.key ? problemTh(top.key) : "-";

      const byTypeArr = Object.entries(monthAgg.byType)
        .map(([k, v]) => ({ type: k, label: problemTh(k), total: v }))
        .sort((a, b) => b.total - a.total);

      // 3) 7 days series
      const from7 = addDays(today, -6);
      const sum7 = await api.reportsSummary({
        from: fmtYYYYMMDD(from7),
        to: fmtYYYYMMDD(today),
        group: "day",
      });

      const rows7 = Array.isArray(sum7?.data) ? sum7.data : [];
      const mapDay = {};
      for (const r of rows7) {
        const p = String(r?.period || "");
        const n = Number(r?.total || 0);
        if (!p) continue;
        mapDay[p] = (mapDay[p] || 0) + n;
      }

      const series = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(from7, i);
        const key = fmtYYYYMMDD(d);
        series.push({ label: key.slice(5), total: mapDay[key] || 0 }); // MM-DD
      }

      // 4) Top vehicles for selected range
      const topV = await api.topVehicles({
        from: fmtYYYYMMDD(range.from),
        to: fmtYYYYMMDD(range.to),
        limit: 10,
      });
      const tv = Array.isArray(topV?.data) ? topV.data : [];
      const tvNorm = tv.map((x) => ({
        plateNo: String(x?.plateNo || "-"),
        brand: String(x?.brand || ""),
        model: String(x?.model || ""),
        total: Number(x?.total || 0),
      }));

      // ✅ 5) Top locations (จากรายงานจริง /reports/admin)
      // หมายเหตุ: ถ้ารายงานเยอะมาก คุณค่อยทำ endpoint สรุปฝั่ง backend เพิ่มทีหลังได้
      const locRes = await api.listReports({
        from: fmtYYYYMMDD(range.from),
        to: fmtYYYYMMDD(range.to),
        page: 0,
        pageSize: 200, // เอาพอประมาณก่อน
      });

      const locItems = Array.isArray(locRes?.items) ? locRes.items : [];
      const locMap = {};
      for (const r of locItems) {
        const loc = normLoc(r?.locationText);
        if (!loc) continue;
        locMap[loc] = (locMap[loc] || 0) + 1;
      }

      const locArr = Object.entries(locMap)
        .map(([label, total]) => ({ label, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      setTodayCount(t);
      setMonthCount(m);
      setTopProblem({ label: topProblemLabel, count: top.value || 0 });
      setByTypeMonth(byTypeArr);
      setSeries7d(series);
      setTopVehicles(tvNorm);
      setTopLocations(locArr);
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

        <Stack direction="row" spacing={1} alignItems="center">
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
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <PlaceIcon fontSize="small" />
                <Typography fontWeight={900}>สถานที่ที่ถูกรายงานบ่อย — ช่วง: {range.title}</Typography>
              </Stack>

              {topLocations.length === 0 ? (
                <Typography color="text.secondary">ยังไม่มี location ในช่วงนี้</Typography>
              ) : (
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  {topLocations.map((x) => (
                    <Box key={x.label}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{x.label}</Typography>
                        <Typography variant="body2" fontWeight={800}>
                          {x.total}
                        </Typography>
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

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                * ดึงจาก /reports/admin (pageSize 200) ถ้ารายงานเยอะมากค่อยทำ endpoint summary ฝั่ง backend เพิ่ม
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Top vehicles */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <DirectionsCarIcon fontSize="small" />
                  <Typography fontWeight={900}>
                    รถที่ถูกรายงานมากสุด (Top 10) — ช่วง: {range.title}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {fmtYYYYMMDD(range.from)} ถึง {fmtYYYYMMDD(range.to)}
                </Typography>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {topVehicles.length === 0 ? (
                <Typography color="text.secondary">ไม่มีข้อมูล</Typography>
              ) : (
                <Stack spacing={1}>
                  {topVehicles.map((v, idx) => (
                    <Box key={`${v.plateNo}-${idx}`} sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)" }}>
                      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={0.5}>
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