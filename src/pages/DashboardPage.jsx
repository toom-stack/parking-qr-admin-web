import { Card, CardContent, Grid, Typography } from "@mui/material";

export default function DashboardPage() {
  // ตอนนี้ทำเป็น placeholder ก่อน (ต่อจาก API /reports summary ได้ทีหลัง)
  return (
    <>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">รายงานวันนี้</Typography>
              <Typography variant="h4" fontWeight={800}>—</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">รายงานเดือนนี้</Typography>
              <Typography variant="h4" fontWeight={800}>—</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">ปัญหายอดฮิต</Typography>
              <Typography variant="h4" fontWeight={800}>—</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}