import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PlaceIcon from "@mui/icons-material/Place";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { api } from "../services/api";

// ---------------- utils ----------------
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateLabel(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function problemLabel(problemType) {
  switch (problemType) {
    case "PARK_RED_WHITE":
      return "จอดเส้นขาว-แดง";
    case "BLOCKING":
      return "ขวางทาง";
    case "NO_PARKING":
      return "จอดในที่ห้ามจอด";
    case "OTHER":
      return "อื่น ๆ";
    default:
      return problemType || "-";
  }
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

function StatCard({ title, value, icon, subtitle }) {
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 3,
        boxShadow: 3,
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" mt={1}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>

          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: "action.hover",
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const data = await api.listReports({
        pageSize: 500,
      });

      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err?.message || "โหลดข้อมูล dashboard ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const {
    todayCount,
    monthCount,
    topProblem,
    topLocation,
    chartData,
    latestReports,
    topProblemsList,
  } = useMemo(() => {
    const today = startOfDay(new Date());
    const month = startOfMonth(new Date());

    const safeItems = [...items].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const todayItems = safeItems.filter((r) => new Date(r.createdAt) >= today);
    const monthItems = safeItems.filter((r) => new Date(r.createdAt) >= month);

    const problemCount = {};
    const locationCount = {};

    safeItems.forEach((r) => {
      const p = r.problemType || "OTHER";
      const l = r.location || "ไม่ระบุ";

      problemCount[p] = (problemCount[p] || 0) + 1;
      locationCount[l] = (locationCount[l] || 0) + 1;
    });

    const topP = Object.entries(problemCount).sort((a, b) => b[1] - a[1])[0];
    const topL = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0];

    // 7 วันล่าสุด
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(startOfDay(d));
    }

    const chart = days.map((day) => {
      const count = safeItems.filter((r) => sameDay(new Date(r.createdAt), day)).length;
      return {
        date: formatDateLabel(day),
        count,
      };
    });

    const topProblems = Object.entries(problemCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({
        label: problemLabel(key),
        count,
      }));

    return {
      todayCount: todayItems.length,
      monthCount: monthItems.length,
      topProblem: topP ? problemLabel(topP[0]) : "-",
      topLocation: topL ? topL[0] : "-",
      chartData: chart,
      latestReports: safeItems.slice(0, 5),
      topProblemsList: topProblems,
    };
  }, [items]);

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        mb={3}
        spacing={1}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Dashboard
          </Typography>
          <Typography color="text.secondary">
            ภาพรวมรายงานปัญหาการจอดรถ
          </Typography>
        </Box>

        <Chip
          icon={<AccessTimeIcon />}
          label={`อัปเดตล่าสุด ${formatDateTime(new Date())}`}
          variant="outlined"
        />
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="รายงานวันนี้"
            value={todayCount}
            subtitle="จำนวนเคสที่ถูกรายงานวันนี้"
            icon={<ReportProblemIcon color="error" />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="รายงานเดือนนี้"
            value={monthCount}
            subtitle="จำนวนเคสตั้งแต่ต้นเดือน"
            icon={<TrendingUpIcon color="primary" />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="ปัญหาที่พบบ่อย"
            value={topProblem}
            subtitle="ประเภทปัญหาที่พบมากที่สุด"
            icon={<WarningAmberIcon color="warning" />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="จุดที่พบปัญหามาก"
            value={topLocation}
            subtitle="สถานที่ที่ถูกรายงานบ่อยสุด"
            icon={<PlaceIcon color="success" />}
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>
                รายงาน 7 วันล่าสุด
              </Typography>

              <Box sx={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>
                ปัญหาที่พบบ่อย
              </Typography>

              <Stack spacing={1.5}>
                {topProblemsList.length === 0 ? (
                  <Typography color="text.secondary">ยังไม่มีข้อมูล</Typography>
                ) : (
                  topProblemsList.map((item, index) => (
                    <Box key={item.label}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography>
                          {index + 1}. {item.label}
                        </Typography>
                        <Chip label={`${item.count} ครั้ง`} size="small" />
                      </Stack>
                      {index !== topProblemsList.length - 1 ? <Divider sx={{ mt: 1.5 }} /> : null}
                    </Box>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>
                รายงานล่าสุด
              </Typography>

              <Stack spacing={2}>
                {latestReports.length === 0 ? (
                  <Typography color="text.secondary">ยังไม่มีรายงาน</Typography>
                ) : (
                  latestReports.map((r, index) => (
                    <Box key={r.id || index}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                      >
                        <Box>
                          <Typography fontWeight={700}>
                            {r.vehicle?.plateNo || "ไม่ทราบทะเบียน"} •{" "}
                            {problemLabel(r.problemType)}
                          </Typography>

                          <Typography variant="body2" color="text.secondary">
                            สถานที่: {r.location || "-"}
                          </Typography>

                          <Typography variant="body2" color="text.secondary">
                            เวลา: {formatDateTime(r.createdAt)}
                          </Typography>
                        </Box>

                        <Chip
                          label={problemLabel(r.problemType)}
                          color="warning"
                          variant="outlined"
                        />
                      </Stack>

                      {index !== latestReports.length - 1 ? <Divider sx={{ mt: 2 }} /> : null}
                    </Box>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}