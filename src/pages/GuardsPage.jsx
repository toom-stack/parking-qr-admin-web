import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { api } from "../services/api";

export default function GuardsPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const [q, setQ] = useState("");
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // ===== create form
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    employeeCode: "",
    phone: "",
    email: "",
  });

  // ===== edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState(null); // { id, username, ... , password(optional), disabled }

  function resetMsg() {
    setErr("");
    setInfo("");
  }

  async function load(next = {}) {
    setBusy(true);
    setErr("");
    try {
      const data = await api.listGuards({
        q,
        page,
        pageSize,
        includeDisabled,
        ...next,
      });

      const items = Array.isArray(data?.items) ? data.items : [];
      setTotal(Number(data?.total || items.length));

      setRows(
        items.map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName || "-",
          employeeCode: u.employeeCode || "-",
          phone: u.phone || "-",
          email: u.email || "-",
          createdAt: u.createdAt,
          disabledAt: u.disabledAt,
          status: u.disabledAt ? "DISABLED" : "ACTIVE",
        }))
      );
    } catch (e) {
      setErr(e?.message || "โหลดรายชื่อ Guard ไม่สำเร็จ");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, includeDisabled]);

  async function createGuard() {
    resetMsg();
    setBusy(true);
    try {
      if (!form.username.trim()) throw new Error("กรอก username");
      if (!form.password.trim() || form.password.trim().length < 6) throw new Error("รหัสผ่านอย่างน้อย 6 ตัว");
      if (!form.fullName.trim()) throw new Error("กรอกชื่อ-นามสกุล");
      if (!form.employeeCode.trim()) throw new Error("กรอกรหัสพนักงาน");

      await api.createGuard({
        username: form.username.trim(),
        password: form.password.trim(),
        fullName: form.fullName.trim(),
        employeeCode: form.employeeCode.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });

      setForm({ username: "", password: "", fullName: "", employeeCode: "", phone: "", email: "" });
      setInfo("✅ สมัคร Guard สำเร็จ");
      setPage(0);
      await load({ page: 0 });
    } catch (e) {
      setErr(e?.message || "สมัคร Guard ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(row) {
    resetMsg();
    setEdit({
      id: row.id,
      username: row.username,
      fullName: row.fullName === "-" ? "" : row.fullName,
      employeeCode: row.employeeCode === "-" ? "" : row.employeeCode,
      phone: row.phone === "-" ? "" : row.phone,
      email: row.email === "-" ? "" : row.email,
      password: "", // ถ้ากรอก จะเป็นการรีเซ็ต
      disabled: !!row.disabledAt,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    resetMsg();
    setBusy(true);
    try {
      if (!edit) return;

      if (!edit.fullName.trim()) throw new Error("ชื่อ-นามสกุลห้ามว่าง");
      if (!edit.employeeCode.trim()) throw new Error("รหัสพนักงานห้ามว่าง");
      if (edit.password && edit.password.trim().length < 6) throw new Error("รหัสผ่านใหม่อย่างน้อย 6 ตัว");

      const payload = {
        fullName: edit.fullName.trim(),
        employeeCode: edit.employeeCode.trim(),
        phone: edit.phone.trim() || undefined,
        email: edit.email.trim() || undefined,
        disabled: !!edit.disabled,
      };
      if (edit.password?.trim()) payload.password = edit.password.trim();

      await api.updateGuard(edit.id, payload);

      setEditOpen(false);
      setInfo("✅ แก้ไข Guard สำเร็จ");
      await load();
    } catch (e) {
      setErr(e?.message || "แก้ไขไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function disableGuard(row) {
    resetMsg();
    const ok = window.confirm(`ยืนยันปิดใช้งาน Guard: ${row.fullName} (${row.username}) ?`);
    if (!ok) return;

    setBusy(true);
    try {
      await api.disableGuard(row.id);
      setInfo("✅ ปิดใช้งาน Guard แล้ว");
      await load();
    } catch (e) {
      setErr(e?.message || "ปิดใช้งานไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const columns = useMemo(
    () => [
      { field: "username", headerName: "username", flex: 1 },
      { field: "fullName", headerName: "ชื่อ-นามสกุล", flex: 1.4 },
      { field: "employeeCode", headerName: "รหัสพนักงาน", flex: 1 },
      { field: "phone", headerName: "เบอร์โทร", flex: 1 },
      { field: "email", headerName: "อีเมล", flex: 1.2 },
      { field: "status", headerName: "สถานะ", flex: 0.7 },
      {
        field: "_actions",
        headerName: "จัดการ",
        sortable: false,
        filterable: false,
        flex: 1.2,
        renderCell: (params) => {
          const row = params.row;
          return (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => openEdit(row)} disabled={busy}>
                แก้ไข
              </Button>
              {!row.disabledAt && (
                <Button size="small" variant="outlined" color="error" onClick={() => disableGuard(row)} disabled={busy}>
                  ปิดใช้งาน
                </Button>
              )}
            </Stack>
          );
        },
      },
    ],
    [busy]
  );

  return (
    <>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        รปภ
      </Typography>

      {/* Create Guard */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={800} gutterBottom>
            สมัคร รปภ (Admin ตั้ง username+password)
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Username *"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="Password * (>= 6)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              size="small"
              type="password"
              fullWidth
              disabled={busy}
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="ชื่อ-นามสกุล *"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="รหัสพนักงาน *"
              value={form.employeeCode}
              onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="เบอร์โทร"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="อีเมล"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
          </Stack>

          <Button variant="contained" sx={{ mt: 2 }} onClick={createGuard} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "สมัคร Guard"}
          </Button>

          {(err || info) && (
            <Box sx={{ mt: 2 }}>
              {err && <Alert severity="error">{err}</Alert>}
              {info && <Alert severity="success">{info}</Alert>}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <TextField
              label="ค้นหา (ชื่อ/username/รหัสพนักงาน/เบอร์/อีเมล)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              fullWidth
              disabled={busy}
            />
            <Button
              variant="outlined"
              onClick={() => {
                setPage(0);
                load({ page: 0 });
              }}
              disabled={busy}
            >
              ค้นหา
            </Button>

            <FormControlLabel
              control={
                <Checkbox
                  checked={includeDisabled}
                  onChange={(e) => setIncludeDisabled(e.target.checked)}
                  disabled={busy}
                />
              }
              label="รวมที่ถูกปิดใช้งาน"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      <Box sx={{ height: 560, bgcolor: "background.paper" }}>
        <DataGrid
          rows={rows}
          columns={columns}
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>แก้ไข Guard</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {edit && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Username" value={edit.username} size="small" disabled fullWidth />

              <TextField
                label="ชื่อ-นามสกุล *"
                value={edit.fullName}
                onChange={(e) => setEdit({ ...edit, fullName: e.target.value })}
                size="small"
                fullWidth
              />
              <TextField
                label="รหัสพนักงาน *"
                value={edit.employeeCode}
                onChange={(e) => setEdit({ ...edit, employeeCode: e.target.value })}
                size="small"
                fullWidth
              />
              <TextField
                label="เบอร์โทร"
                value={edit.phone}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                size="small"
                fullWidth
              />
              <TextField
                label="อีเมล"
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                size="small"
                fullWidth
              />

              <TextField
                label="ตั้งรหัสผ่านใหม่ (ถ้าต้องการ) >= 6"
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                size="small"
                type="password"
                fullWidth
              />

              <FormControlLabel
                control={
                  <Checkbox checked={edit.disabled} onChange={(e) => setEdit({ ...edit, disabled: e.target.checked })} />
                }
                label="ปิดใช้งาน Guard"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={saveEdit} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}