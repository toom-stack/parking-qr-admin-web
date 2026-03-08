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
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PlaceIcon from "@mui/icons-material/Place";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

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

function getReportLocation(report) {
  return report?.locationText?.trim() || "";
}

function getReportDate(report) {
  return report?.reportedAt || report?.createdAt || null;
}

// ---------------- small components ----------------
function SectionCard({ title, subtitle, children }) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box mb={2.5}>
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value, subtitle, icon }) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>

            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                lineHeight: 1.1,
                wordBreak: "break-word",
              }}
            >
              {value}
            </Typography>

            {subtitle ? (
              <Typography
                variant="body2"
                color="text.secondary"
                mt={1}
                sx={{ lineHeight: 1.5 }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>

          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              bgcolor: "action.hover",
              flexShrink: 0,
              ml: 1.5,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ReportItem({ report }) {
  const locationText = getReportLocation(report);
  const reportTime = getReportDate(report);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <Box>
          <Typography fontWeight={700} sx={{ mb: 0.5 }}>
            {report.vehicle?.plateNo || "ไม่ทราบทะเบียน"}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 1 }}
          >
            <Chip
              size="small"
              label={problemLabel(report.problemType)}
              color="warning"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`สถานที่: ${locationText || "-"}`}
              variant="outlined"
            />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            เวลา: {formatDateTime(reportTime)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
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

      console.log("dashboard items =", data?.items);
      console.log("first dashboard item =", data?.items?.[0]);

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
      (a, b) => new Date(getReportDate(b) || 0) - new Date(getReportDate(a) || 0)
    );

    const todayItems = safeItems.filter((r) => {
      const date = getReportDate(r);
      return date ? new Date(date) >= today : false;
    });

    const monthItems = safeItems.filter((r) => {
      const date = getReportDate(r);
      return date ? new Date(date) >= month : false;
    });

    const problemCount = {};
    const locationCount = {};

    safeItems.forEach((r) => {
      const p = r.problemType || "OTHER";
      const l = getReportLocation(r);

      problemCount[p] = (problemCount[p] || 0) + 1;

      if (l) {
        locationCount[l] = (locationCount[l] || 0) + 1;
      }
    });

    const topP = Object.entries(problemCount).sort((a, b) => b[1] - a[1])[0];
    const topL = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0];

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(startOfDay(d));
    }

    const chart = days.map((day) => {
      const count = safeItems.filter((r) => {
        const date = getReportDate(r);
        return date ? sameDay(new Date(date), day) : false;
      }).length;

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
      topLocation: topL ? topL[0] : "ยังไม่มีข้อมูลสถานที่",
      chartData: chart,
      latestReports: safeItems.slice(0, 5),
      topProblemsList: topProblems,
    };
  }, [items]);

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h5" fontWeight={800} mb={2}>
          Dashboard
        </Typography>
        <LinearProgress sx={{ borderRadius: 999 }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        bgcolor: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <Card
        sx={{
          mb: 3,
          borderRadius: 4,
          boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h4" fontWeight={900}>
                Dashboard
              </Typography>
              <Typography color="text.secondary" mt={0.5}>
                ภาพรวมรายงานปัญหาการจอดรถ
              </Typography>
            </Box>

            <Chip
              icon={<AccessTimeIcon />}
              label={`อัปเดตล่าสุด ${formatDateTime(new Date())}`}
              variant="outlined"
              sx={{ borderRadius: 999 }}
            />
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="รายงานวันนี้"
            value={todayCount}
            subtitle="จำนวนเคสที่ถูกรายงานในวันนี้"
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
            subtitle="สถานที่ที่ถูกรายงานบ่อยที่สุด"
            icon={<PlaceIcon color="success" />}
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <SectionCard
            title="แนวโน้มรายงาน 7 วันล่าสุด"
            subtitle="ดูจำนวนรายงานย้อนหลังในแต่ละวัน"
          >
            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [`${value} ครั้ง`, "จำนวนรายงาน"]}
                    labelFormatter={(label) => `วันที่ ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <SectionCard
            title="อันดับปัญหาที่พบบ่อย"
            subtitle="ประเภทปัญหาที่ถูกรายงานบ่อยที่สุด"
          >
            <Stack spacing={1.5}>
              {topProblemsList.length === 0 ? (
                <Typography color="text.secondary">ยังไม่มีข้อมูล</Typography>
              ) : (
                topProblemsList.map((item, index) => (
                  <Paper
                    key={item.label}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                        <FiberManualRecordIcon sx={{ fontSize: 10 }} />
                        <Typography fontWeight={600} sx={{ wordBreak: "break-word" }}>
                          {index + 1}. {item.label}
                        </Typography>
                      </Stack>

                      <Chip
                        label={`${item.count} ครั้ง`}
                        size="small"
                        sx={{ flexShrink: 0 }}
                      />
                    </Stack>
                  </Paper>
                ))
              )}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid item xs={12}>
          <SectionCard
            title="รายงานล่าสุด"
            subtitle="แสดง 5 รายการล่าสุดที่ถูกบันทึกเข้าสู่ระบบ"
          >
            <Stack spacing={1.5}>
              {latestReports.length === 0 ? (
                <Typography color="text.secondary">ยังไม่มีรายงาน</Typography>
              ) : (
                latestReports.map((r, index) => (
                  <Box key={r.id || index}>
                    <ReportItem report={r} />
                    {index !== latestReports.length - 1 ? (
                      <Divider sx={{ my: 1, opacity: 0 }} />
                    ) : null}
                  </Box>
                ))
              )}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}