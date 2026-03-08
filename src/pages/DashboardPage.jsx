import { useEffect, useState } from "react";
import { Box, Grid, Card, CardContent, Typography } from "@mui/material";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PlaceIcon from "@mui/icons-material/Place";
import { api } from "../services/api";

function startOfDay(d) {
return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d) {
return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function DashboardPage() {
const [todayCount, setTodayCount] = useState(0);
const [monthCount, setMonthCount] = useState(0);
const [topProblem, setTopProblem] = useState("-");
const [topLocation, setTopLocation] = useState("-");

async function load() {
try {
const today = startOfDay(new Date());
const month = startOfMonth(new Date());

```
  const res = await api.listReports({
    page: 0,
    pageSize: 500,
  });

  const items = res?.items || [];

  let todayTotal = 0;
  let monthTotal = 0;

  const problemMap = {};
  const locationMap = {};

  for (const r of items) {
    const d = new Date(r.reportedAt);

    if (d >= today) todayTotal++;
    if (d >= month) monthTotal++;

    const p = r.problemType || "OTHER";
    problemMap[p] = (problemMap[p] || 0) + 1;

    const loc = r.locationText || "-";
    locationMap[loc] = (locationMap[loc] || 0) + 1;
  }

  let bestP = "-";
  let maxP = 0;

  for (const k in problemMap) {
    if (problemMap[k] > maxP) {
      maxP = problemMap[k];
      bestP = k;
    }
  }

  let bestL = "-";
  let maxL = 0;

  for (const k in locationMap) {
    if (locationMap[k] > maxL) {
      maxL = locationMap[k];
      bestL = k;
    }
  }

  setTodayCount(todayTotal);
  setMonthCount(monthTotal);
  setTopProblem(bestP);
  setTopLocation(bestL);
} catch (err) {
  console.error("Dashboard error:", err);
}
```

}

useEffect(() => {
load();
}, []);

return ( <Box>
<Typography variant="h5" sx={{ mb: 3, fontWeight: 800 }}>
Dashboard </Typography>

```
  <Grid container spacing={2}>
    <Grid item xs={12} md={3}>
      <Card>
        <CardContent>
          <ReportProblemIcon />
          <Typography variant="h4">{todayCount}</Typography>
          <Typography>รายงานวันนี้</Typography>
        </CardContent>
      </Card>
    </Grid>

    <Grid item xs={12} md={3}>
      <Card>
        <CardContent>
          <TrendingUpIcon />
          <Typography variant="h4">{monthCount}</Typography>
          <Typography>รายงานเดือนนี้</Typography>
        </CardContent>
      </Card>
    </Grid>

    <Grid item xs={12} md={3}>
      <Card>
        <CardContent>
          <WarningAmberIcon />
          <Typography variant="h4">{topProblem}</Typography>
          <Typography>ปัญหาที่พบบ่อย</Typography>
        </CardContent>
      </Card>
    </Grid>

    <Grid item xs={12} md={3}>
      <Card>
        <CardContent>
          <PlaceIcon />
          <Typography variant="h4">{topLocation}</Typography>
          <Typography>สถานที่ที่ถูกรายงานบ่อย</Typography>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
</Box>
```

);
}
