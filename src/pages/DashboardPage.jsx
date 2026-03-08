// src/pages/DashboardPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
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
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

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

function formatDateTime(d) {
  try {
    return new Date(d).toLocaleString("th-TH");
  } catch {
    return "-";
  }
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

  return {
    key: bestK,
    value: bestV === -Infinity ? 0 : bestV,
  };
}

function safeMessage(e) {
  if (typeof e === "string") return e;
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.message) return e.message;
  return "โหลด Dashboard ไม่สำเร็จ";
}

// ---------------- reusable ui ----------------
function SectionCard({ title, icon, subtitle, children, right }) {
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 4,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        border: "1px solid rgba(148,163,184,0.18)",
      }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          gap={1}
          sx={{ mb: 1.5 }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Avatar
              variant="rounded"
              sx={{
                width: 36,
                height: 36,
                bgcolor: "primary.50",
                color: "primary.main",
              }}
            >
              {icon}
            </Avatar>
            <Box>
              <Typography fontWeight={900}>{title}</Typography>
              {subtitle ? (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          {right}
        </Stack>

        {children}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, title, value, subtitle }) {
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 4,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
        border: "1px solid rgba(148,163,184,0.18)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
      }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 40,
              height: 40,
              bgcolor: "primary.main",
              color: "white",
            }}
          >
            {icon}
          </Avatar>
          <Typography color="text.secondary" fontWeight={600}>
            {title}
          </Typography>
        </Stack>

        <Typography
          variant="h3"
          fontWeight={900}
          sx={{ lineHeight: 1.1, mb: 0.5 }}
        >
          {value}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
}

function BarList({ items, maxValue, emptyText, getKey, renderLabel, renderValue }) {
  if (!items?.length) {
    return <Typography color="text.secondary">{emptyText}</Typography>;
  }

  return (
    <Stack spacing={1.2} sx={{ mt: 1 }}>
      {items.map((item, idx) => {
        const value = Number(renderValue(item));
        const percent = Math.max(0, Math.min(100, (value / Math.max(1, maxValue)) * 100));

        return (
          <Box key={getKey(item, idx)}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 0.4 }}
            >
              <Typography variant="body2" sx={{ pr: 2 }}>
                {renderLabel(item, idx)}
              </Typography>
              <Typography variant="body2" fontWeight={800}>
                {value}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={percent}
              sx={{
                height: 9,
                borderRadius: 999,
                bgcolor: "rgba(148,163,184,0.18)",
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

// ---------------- page ----------------
export default function DashboardPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [mode, setMode] = useState("month"); // today | 7d | month

  const [todayCount, setTodayCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [topProblem, setTopProblem] = useState({ label: "-", count: 0 });

  const [byTypeMonth, setByTypeMonth] = useState([]);
  const [series7d, setSeries7d] = useState([]);
  const [topVehicles, setTopVehicles] = useState([]);
  const [topLocations, setTopLocations] = useState([]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const monthStart = useMemo(() => startOfMonth(new Date()), []);

  const range = useMemo(() => {
    const t = startOfDay(new Date());

    if (mode === "today") {
      return { from: t, to: t, title: "วันนี้" };
    }

    if (mode === "7d") {
      return { from: addDays(t, -6), to: t, title: "7 วันล่าสุด" };
    }

    return { from: startOfMonth(new Date()), to: t, title: "เดือนนี้" };
  }, [mode]);

  async function load() {
    setErr("");
    setBusy(true);

    try {
      // 1) KPI + top problems + top locations จาก backend summary
      const adminSum = await api.adminSummary();

      const todayTotal = Number(adminSum?.todayTotal || 0);
      const monthTotal = Number(adminSum?.monthTotal || 0);

      const problemRows = Array.isArray(adminSum?.topProblems) ? adminSum.topProblems : [];
      const locationRows = Array.isArray(adminSum?.topLocations) ? adminSum.topLocations : [];

      const topP = problemRows[0];
      const topProblemLabel = topP?.problemType ? problemTh(topP.problemType) : "-";
      const topProblemCount = Number(topP?._count?.problemType || 0);

      const topLocArr = locationRows
        .filter((x) => String(x?.locationText || "").trim())
        .map((x) => ({
          label: String(x?.locationText || "-"),
          total: Number(x?._count?.locationText || 0),
        }));

      // 2) ประเภทปัญหาเดือนนี้
      const sumMonth = await api.reportsSummary({
        from: fmtYYYYMMDD(monthStart),
        to: fmtYYYYMMDD(today),
        group: "day",
      });

      const monthAgg = sumTotalsFromSummary(sumMonth);

      const byTypeArr = Object.entries(monthAgg.byType)
        .map(([k, v]) => ({
          type: k,
          label: problemTh(k),
          total: Number(v || 0),
        }))
        .sort((a, b) => b.total - a.total);

      // 3) กราฟ 7 วัน
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
        series.push({
          label: key.slice(5),
          total: mapDay[key] || 0,
        });
      }

      // 4) top vehicles ตามช่วงที่เลือก
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

      setTodayCount(todayTotal);
      setMonthCount(monthTotal);
      setTopProblem({ label: topProblemLabel, count: topProblemCount });
      setByTypeMonth(byTypeArr);
      setSeries7d(series);
      setTopVehicles(tvNorm);
      setTopLocations(topLocArr);
      setLastUpdated(new Date());
    } catch (e) {
      setErr(safeMessage(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [mode]);

  const max7 = useMemo(() => Math.max(1, ...series7d.map((x) => x.total)), [series7d]);
  const maxType = useMemo(() => Math.max(1, ...byTypeMonth.map((x) => x.total)), [byTypeMonth]);
  const maxLoc = useMemo(() => Math.max(1, ...topLocations.map((x) => x.total)), [topLocations]);

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100%", p: { xs: 1, md: 0 } }}>
      <Card
        sx={{
          mb: 2,
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(148,163,184,0.18)",
          background:
            "linear-gradient(135deg, rgba(25,118,210,0.12) 0%, rgba(255,255,255,1) 55%, rgba(16,185,129,0.08) 100%)",
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
            gap={2}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                variant="rounded"
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: "primary.main",
                  color: "white",
                }}
              >
                <DashboardRoundedIcon />
              </Avatar>

              <Box>
                <Typography variant="h5" fontWeight={900}>
                  Dashboard รายงานปัญหาการจอดรถ
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  ภาพรวมสถิติรายงาน, ประเภทปัญหา, สถานที่ที่ถูกรายงานบ่อย และรถที่มีการถูกรายงานสูงสุด
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.75 }}
                >
                  อัปเดตล่าสุด: {lastUpdated ? formatDateTime(lastUpdated) : "-"}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<TodayIcon />}
                label="วันนี้"
                variant={mode === "today" ? "filled" : "outlined"}
                color={mode === "today" ? "primary" : "default"}
                onClick={() => setMode("today")}
                disabled={busy}
              />
              <Chip
                icon={<DateRangeIcon />}
                label="7 วันล่าสุด"
                variant={mode === "7d" ? "filled" : "outlined"}
                color={mode === "7d" ? "primary" : "default"}
                onClick={() => setMode("7d")}
                disabled={busy}
              />
              <Chip
                icon={<DateRangeIcon />}
                label="เดือนนี้"
                variant={mode === "month" ? "filled" : "outlined"}
                color={mode === "month" ? "primary" : "default"}
                onClick={() => setMode("month")}
                disabled={busy}
              />
              <Button
                startIcon={<RefreshIcon />}
                onClick={load}
                disabled={busy}
                variant="contained"
                sx={{ borderRadius: 999, px: 2.2, whiteSpace: "nowrap" }}
              >
                รีเฟรช
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {busy && (
        <LinearProgress
          sx={{
            mb: 2,
            height: 6,
            borderRadius: 999,
          }}
        />
      )}

      {err && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
          {err}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            icon={<ReportProblemIcon />}
            title="รายงานวันนี้"
            value={todayCount}
            subtitle="รวมรายงานที่ถูกสร้างในวันนี้"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <StatCard
            icon={<TrendingUpIcon />}
            title="รายงานเดือนนี้"
            value={monthCount}
            subtitle="รวมรายงานตั้งแต่ต้นเดือนถึงวันนี้"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <StatCard
            icon={<WarningAmberRoundedIcon />}
            title="ปัญหายอดฮิต"
            value={topProblem.label}
            subtitle={`${topProblem.count} ครั้ง`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SectionCard
            title="แนวโน้มรายงาน"
            subtitle="สรุปจำนวนรายงานในช่วง 7 วันล่าสุด"
            icon={<TrendingUpIcon fontSize="small" />}
          >
            <BarList
              items={series7d}
              maxValue={max7}
              emptyText="ไม่มีข้อมูล"
              getKey={(x) => x.label}
              renderLabel={(x) => x.label}
              renderValue={(x) => x.total}
            />
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard
            title="สัดส่วนตามประเภทปัญหา"
            subtitle="รวมเฉพาะข้อมูลของเดือนนี้"
            icon={<ReportProblemIcon fontSize="small" />}
          >
            <BarList
              items={byTypeMonth}
              maxValue={maxType}
              emptyText="ไม่มีข้อมูล"
              getKey={(x) => x.type}
              renderLabel={(x) => x.label}
              renderValue={(x) => x.total}
            />
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard
            title="สถานที่ที่ถูกรายงานบ่อย"
            subtitle="จากข้อมูลสรุปฝั่ง backend"
            icon={<PlaceIcon fontSize="small" />}
          >
            <BarList
              items={topLocations}
              maxValue={maxLoc}
              emptyText="ยังไม่มี location"
              getKey={(x) => x.label}
              renderLabel={(x) => x.label}
              renderValue={(x) => x.total}
            />
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard
            title="รถที่ถูกรายงานมากสุด (Top 10)"
            subtitle={`${fmtYYYYMMDD(range.from)} ถึง ${fmtYYYYMMDD(range.to)}`}
            icon={<DirectionsCarIcon fontSize="small" />}
            right={
              <Chip
                label={`ช่วง: ${range.title}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            }
          >
            <Divider sx={{ mb: 1.5 }} />

            {topVehicles.length === 0 ? (
              <Typography color="text.secondary">ไม่มีข้อมูล</Typography>
            ) : (
              <Stack spacing={1}>
                {topVehicles.map((v, idx) => (
                  <Box
                    key={`${v.plateNo}-${idx}`}
                    sx={{
                      p: 1.4,
                      borderRadius: 3,
                      bgcolor: "rgba(15,23,42,0.03)",
                      border: "1px solid rgba(148,163,184,0.15)",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ sm: "center" }}
                      gap={1}
                    >
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: "primary.main",
                            fontSize: 14,
                            fontWeight: 800,
                          }}
                        >
                          {idx + 1}
                        </Avatar>

                        <Box>
                          <Typography fontWeight={900}>{v.plateNo}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {`${v.brand} ${v.model}`.trim() || "-"}
                          </Typography>
                        </Box>
                      </Stack>

                      <Chip
                        label={`${v.total} ครั้ง`}
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}