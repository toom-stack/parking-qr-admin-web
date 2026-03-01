import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { api } from "../services/api";

export default function OwnersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const [owner, setOwner] = useState({
    fullName: "",
    room: "",
    year: "",
    faculty: "",
    major: "",
    phone: "",
  });

  const columns = useMemo(
    () => [
      { field: "fullName", headerName: "ชื่อ-นามสกุล", flex: 1.3 },
      { field: "room", headerName: "ห้อง", flex: 0.6 },
      { field: "year", headerName: "ชั้นปี", flex: 0.5 },
      { field: "faculty", headerName: "คณะ", flex: 1 },
      { field: "major", headerName: "สาขา", flex: 1 },
      { field: "phone", headerName: "เบอร์", flex: 1 },
    ],
    []
  );

  async function load(next = {}) {
    setBusy(true);
    setErr("");
    setInfo("");

    try {
      const data = await api.listOwners({
        q,
        page,
        pageSize,
        ...next,
      });

      const items = Array.isArray(data?.items) ? data.items : [];
      setRows(items);
      setTotal(Number(data?.total || 0));
    } catch (e) {
      setErr(e?.message || "โหลดรายการไม่สำเร็จ");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  // โหลดเมื่อ page/pageSize/q เปลี่ยน
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q]);

  async function createOwner() {
    setErr("");
    setInfo("");
    setBusy(true);

    try {
      if (!owner.fullName.trim()) throw new Error("กรอกชื่อ-นามสกุลก่อน");

      const yearNum = owner.year?.trim() ? Number(owner.year) : undefined;
      if (owner.year?.trim() && Number.isNaN(yearNum)) throw new Error("ชั้นปีต้องเป็นตัวเลข");

      await api.createOwner({
        fullName: owner.fullName.trim(),
        room: owner.room.trim() || undefined,
        year: yearNum,
        faculty: owner.faculty.trim() || undefined,
        major: owner.major.trim() || undefined,
        phone: owner.phone.trim() || undefined,
      });

      setOwner({ fullName: "", room: "", year: "", faculty: "", major: "", phone: "" });
      setInfo("✅ สร้างเจ้าของสำเร็จ");

      // ✅ ให้ตารางตรงกับ backend (เรียง createdAt desc)
      setPage(0);
      await load({ page: 0 });
    } catch (e) {
      setErr(e?.message || "สร้างเจ้าของไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Owners
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={700} gutterBottom>
            เพิ่มเจ้าของ
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="ชื่อ-นามสกุล *"
              value={owner.fullName}
              onChange={(e) => setOwner({ ...owner, fullName: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="ห้อง"
              value={owner.room}
              onChange={(e) => setOwner({ ...owner, room: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="ชั้นปี"
              value={owner.year}
              onChange={(e) => setOwner({ ...owner, year: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="คณะ"
              value={owner.faculty}
              onChange={(e) => setOwner({ ...owner, faculty: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="สาขา"
              value={owner.major}
              onChange={(e) => setOwner({ ...owner, major: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="เบอร์โทร"
              value={owner.phone}
              onChange={(e) => setOwner({ ...owner, phone: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
          </Stack>

          <Button variant="contained" sx={{ mt: 2 }} onClick={createOwner} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "สร้างเจ้าของ"}
          </Button>

          {err && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {err}
            </Alert>
          )}
          {info && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {info}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <TextField
              label="ค้นหา (ชื่อ/เบอร์/ห้อง)"
              value={q}
              onChange={(e) => {
                setPage(0);
                setQ(e.target.value);
              }}
              size="small"
              fullWidth
              disabled={busy}
            />
            <Button variant="outlined" onClick={() => load()} disabled={busy}>
              รีเฟรช
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ height: 520, bgcolor: "background.paper" }}>
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
          disableRowSelectionOnClick
        />
      </Box>
    </>
  );
}