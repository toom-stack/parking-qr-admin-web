import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { api } from "../services/api";

// ป้องกัน DataGrid crash จาก valueFormatter
function pickValue(arg) {
  if (arg && typeof arg === "object" && "value" in arg) return arg.value;
  return arg;
}

export default function ReportsPage() {
  const [from, setFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [problemType, setProblemType] = useState("");

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const resetMsg = () => {
    setErr("");
    setInfo("");
  };

  async function load(next = {}) {
    setBusy(true);
    resetMsg();

    try {
      const effectivePage = next.page ?? page;
      const effectivePageSize = next.pageSize ?? pageSize;

      const data = await api.listReports({
        from,
        to,
        problemType: problemType || undefined,
        page: effectivePage,
        pageSize: effectivePageSize,
      });

      const items = Array.isArray(data?.items) ? data.items : [];
      setTotal(Number(data?.total ?? items.length));

      const mapped = items.map((r) => ({
        id: r.id,
        reportedAt: r.reportedAt,
        problemType: r.problemType,
        locationText: r.locationText || "",
        note: r.note || "",
        plateNo: r.vehicle?.plateNo || "-",
        ownerName: r.vehicle?.owner?.fullName || "-",
        guardName: r.guard?.username || "-",
        images: Array.isArray(r.images) ? r.images : [],
      }));

      setRows(mapped);
    } catch (e) {
      console.error("REPORT LOAD ERROR:", e);
      setErr(e?.message || "โหลดรายงานไม่สำเร็จ");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [page, pageSize]);

  // ========================
  // ดูรูป
  // ========================
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  function openView(row) {
    setViewRow(row);
    setViewOpen(true);
  }

  // ========================
  // แก้ไข
  // ========================
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  function openEdit(row) {
    setEditRow({
      ...row,
      edit: {
        problemType: row.problemType,
        locationText: row.locationText,
        note: row.note,
      },
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    try {
      setBusy(true);
      await api.updateReport(editRow.id, editRow.edit);
      setEditOpen(false);
      setInfo("✅ แก้ไขสำเร็จ");
      await load();
    } catch (e) {
      setErr(e?.message || "แก้ไขไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  // ========================
  // ลบ
  // ========================
  async function deleteReport(row) {
    const ok = window.confirm("ยืนยันลบรายงานนี้?");
    if (!ok) return;

    try {
      setBusy(true);
      await api.deleteReport(row.id);
      setInfo("✅ ลบสำเร็จ");
      await load();
    } catch (e) {
      setErr(e?.message || "ลบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        field: "reportedAt",
        headerName: "วันที่",
        flex: 1,
        valueFormatter: (arg) => {
          const v = pickValue(arg);
          return v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-";
        },
      },
      { field: "plateNo", headerName: "ทะเบียน", flex: 1 },
      { field: "ownerName", headerName: "เจ้าของ", flex: 1 },
      { field: "problemType", headerName: "ปัญหา", flex: 1 },
      { field: "guardName", headerName: "รายงานโดย", flex: 1 },
      {
        field: "_actions",
        headerName: "จัดการ",
        flex: 2,
        sortable: false,
        renderCell: (params) => {
          const row = params.row;
          return (
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => openView(row)} disabled={!row.images.length}>
                ดูรูป
              </Button>
              <Button size="small" onClick={() => openEdit(row)}>
                แก้ไข
              </Button>
              <Button size="small" color="error" onClick={() => deleteReport(row)}>
                ลบ
              </Button>
            </Stack>
          );
        },
      },
    ],
    []
  );

  return (
    <>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Reports
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField type="date" value={from} onChange={(e) => setFrom(e.target.value)} size="small" />
            <TextField type="date" value={to} onChange={(e) => setTo(e.target.value)} size="small" />
            <TextField
              select
              value={problemType}
              onChange={(e) => setProblemType(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">ทั้งหมด</MenuItem>
              <MenuItem value="PARK_RED_WHITE">เส้นขาวแดง</MenuItem>
              <MenuItem value="BLOCKING">กีดขวาง</MenuItem>
              <MenuItem value="NO_PARKING">ห้ามจอด</MenuItem>
              <MenuItem value="OTHER">อื่น ๆ</MenuItem>
            </TextField>

            <Button
              variant="contained"
              onClick={() => {
                setPage(0);
                load({ page: 0 });
              }}
            >
              ค้นหา
            </Button>
          </Stack>

          {(err || info) && (
            <Box sx={{ mt: 2 }}>
              {err && <Alert severity="error">{err}</Alert>}
              {info && <Alert severity="success">{info}</Alert>}
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ height: 550 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          loading={busy}
          rowCount={total}
          paginationMode="server"
          pageSizeOptions={[10, 20, 50]}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => {
            setPage(m.page);
            setPageSize(m.pageSize);
          }}
        />
      </Box>

      {/* Dialog ดูรูป */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>รูปหลักฐาน</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {(viewRow?.images || []).map((img) => (
              <Box key={img.id} sx={{ width: 220 }}>
                <img
                  src={img.url}
                  alt="evidence"
                  style={{ width: "100%", height: 150, objectFit: "cover" }}
                  onClick={() => window.open(img.url, "_blank")}
                />
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog แก้ไข */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>แก้ไขรายงาน</DialogTitle>
        <DialogContent>
          {editRow && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="ประเภท"
                value={editRow.edit.problemType}
                onChange={(e) =>
                  setEditRow((p) => ({
                    ...p,
                    edit: { ...p.edit, problemType: e.target.value },
                  }))
                }
              >
                <MenuItem value="PARK_RED_WHITE">เส้นขาวแดง</MenuItem>
                <MenuItem value="BLOCKING">กีดขวาง</MenuItem>
                <MenuItem value="NO_PARKING">ห้ามจอด</MenuItem>
                <MenuItem value="OTHER">อื่น ๆ</MenuItem>
              </TextField>

              <TextField
                label="สถานที่"
                value={editRow.edit.locationText}
                onChange={(e) =>
                  setEditRow((p) => ({
                    ...p,
                    edit: { ...p.edit, locationText: e.target.value },
                  }))
                }
              />

              <TextField
                label="หมายเหตุ"
                multiline
                minRows={3}
                value={editRow.edit.note}
                onChange={(e) =>
                  setEditRow((p) => ({
                    ...p,
                    edit: { ...p.edit, note: e.target.value },
                  }))
                }
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={saveEdit}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}