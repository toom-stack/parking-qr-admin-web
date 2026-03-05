import { useEffect, useMemo, useState } from "react";
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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { api, getToken } from "../services/api";

export default function RegisterPage() {
  // ===== messages/busy
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  function resetMsg() {
    setErr("");
    setInfo("");
  }

  // ===== create form (owner + vehicle)
  const [owner, setOwner] = useState({
    fullName: "",
    room: "",
    year: "",
    faculty: "",
    major: "",
    phone: "",
  });

  const [vehicle, setVehicle] = useState({
    plateNo: "",
    brand: "",
    model: "",
    color: "",
  });

  // ===== table
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  async function load(next = {}) {
    setBusy(true);
    setErr("");

    try {
      // backend: GET /vehicles include owner
      const data = await api.listVehicles({ q, page, pageSize, ...next });
      const items = Array.isArray(data?.items) ? data.items : [];
      setTotal(Number(data?.total || items.length));

      setRows(
        items.map((v) => ({
          id: v.id,
          ...v,
          ownerId: v.ownerId,
          ownerFullName: v.owner?.fullName || "-",
          ownerRoom: v.owner?.room || "-",
          ownerYear: v.owner?.year ?? "",
          ownerFaculty: v.owner?.faculty || "-",
          ownerMajor: v.owner?.major || "-",
          ownerPhone: v.owner?.phone || "-",
        }))
      );
    } catch (e) {
      setErr(e?.message || "โหลดรายการไม่สำเร็จ");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // ===== create both (owner -> vehicle)
  async function createBoth() {
    resetMsg();
    setBusy(true);

    try {
      if (!owner.fullName.trim()) throw new Error("กรอกชื่อเจ้าของก่อน");
      if (!vehicle.plateNo.trim()) throw new Error("กรอกทะเบียนรถก่อน");

      const yearNum = owner.year?.trim() ? Number(owner.year) : undefined;
      if (owner.year?.trim() && Number.isNaN(yearNum)) throw new Error("ชั้นปีต้องเป็นตัวเลข");

      // 1) create owner
      const createdOwner = await api.createOwner({
        fullName: owner.fullName.trim(),
        room: owner.room.trim() || undefined,
        year: yearNum,
        faculty: owner.faculty.trim() || undefined,
        major: owner.major.trim() || undefined,
        phone: owner.phone.trim() || undefined,
      });

      // 2) create vehicle
      await api.createVehicle({
        ownerId: createdOwner.id,
        plateNo: vehicle.plateNo.trim(),
        brand: vehicle.brand.trim() || undefined,
        model: vehicle.model.trim() || undefined,
        color: vehicle.color.trim() || undefined,
      });

      // reset form
      setOwner({ fullName: "", room: "", year: "", faculty: "", major: "", phone: "" });
      setVehicle({ plateNo: "", brand: "", model: "", color: "" });

      setInfo("✅ สมัครสำเร็จ (สร้างเจ้าของ + รถแล้ว)");
      setPage(0);
      await load({ page: 0 });
    } catch (e) {
      setErr(e?.message || "สมัครไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  // ===== open QR / badge (ต้องมี token)
  async function openAuthedFile(url, mime) {
    resetMsg();
    setBusy(true);

    try {
      const token = getToken();
      if (!token) throw new Error("ยังไม่ได้ Login หรือ token หาย");

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(new Blob([blob], { type: mime }));
      window.open(objUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(e?.message || "เปิดไฟล์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  // ===== edit dialog (owner + vehicle)
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  function openEdit(row) {
    resetMsg();
    setEditRow({
      ...row,
      editOwner: {
        fullName: row.owner?.fullName || row.ownerFullName || "",
        room: row.owner?.room || "",
        year: row.owner?.year ?? row.ownerYear ?? "",
        faculty: row.owner?.faculty || "",
        major: row.owner?.major || "",
        phone: row.owner?.phone || "",
      },
      editVehicle: {
        plateNo: row.plateNo || "",
        brand: row.brand || "",
        model: row.model || "",
        color: row.color || "",
      },
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    resetMsg();
    setBusy(true);

    try {
      if (!editRow) return;

      const ownerId = editRow.ownerId;
      const vehicleId = editRow.id;

      const o = editRow.editOwner;
      const v = editRow.editVehicle;

      if (!o.fullName.trim()) throw new Error("ชื่อเจ้าของห้ามว่าง");
      if (!v.plateNo.trim()) throw new Error("ทะเบียนรถห้ามว่าง");

      const yearNum = String(o.year).trim() ? Number(o.year) : undefined;
      if (String(o.year).trim() && Number.isNaN(yearNum)) throw new Error("ชั้นปีต้องเป็นตัวเลข");

      await api.updateOwner(ownerId, {
        fullName: o.fullName.trim(),
        room: o.room.trim() || undefined,
        year: yearNum,
        faculty: o.faculty.trim() || undefined,
        major: o.major.trim() || undefined,
        phone: o.phone.trim() || undefined,
      });

      await api.updateVehicle(vehicleId, {
        plateNo: v.plateNo.trim(),
        brand: v.brand.trim() || undefined,
        model: v.model.trim() || undefined,
        color: v.color.trim() || undefined,
      });

      setEditOpen(false);
      setInfo("✅ แก้ไขสำเร็จ");
      await load();
    } catch (e) {
      setErr(e?.message || "แก้ไขไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  // ===== delete row (ลบรถเป็นหลัก)
  async function deleteRow(row) {
    resetMsg();

    const ok = window.confirm(
      `ยืนยันลบรถทะเบียน ${row.plateNo} ?\n\nหมายเหตุ: ระบบจะลบรายงาน/รูปของรถคันนี้ก่อน แล้วลบรถ\nและถ้าเจ้าของคนนี้ไม่มีรถเหลือ ระบบจะลบเจ้าของให้อัตโนมัติ`
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await api.deleteVehicle(row.id);

      if (res?.deletedOwner) {
        setInfo("✅ ลบรถสำเร็จ และลบเจ้าของให้อัตโนมัติ (เพราะไม่มีรถเหลือแล้ว)");
      } else if (typeof res?.remainingVehicles === "number") {
        setInfo(`✅ ลบรถสำเร็จ (รถคงเหลือของเจ้าของ: ${res.remainingVehicles})`);
      } else {
        setInfo("✅ ลบรถสำเร็จ");
      }

      await load();
    } catch (e) {
      setErr(e?.message || "ลบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const columns = useMemo(
    () => [
      { field: "ownerFullName", headerName: "ชื่อ-นามสกุล", flex: 1.4, minWidth: 160 },
      { field: "ownerRoom", headerName: "ห้อง", flex: 0.6, minWidth: 80 },
      { field: "ownerYear", headerName: "ชั้นปี", flex: 0.5, minWidth: 80 },
      { field: "ownerFaculty", headerName: "คณะ", flex: 1, minWidth: 120 },
      { field: "ownerMajor", headerName: "สาขา", flex: 1, minWidth: 120 },
      { field: "ownerPhone", headerName: "เบอร์", flex: 1, minWidth: 120 },
      { field: "plateNo", headerName: "ทะเบียน", flex: 0.9, minWidth: 110 },
      { field: "brand", headerName: "ยี่ห้อ", flex: 0.9, minWidth: 110 },
      { field: "model", headerName: "รุ่น", flex: 0.9, minWidth: 110 },
      { field: "color", headerName: "สี", flex: 0.7, minWidth: 90 },

      // ✅ แก้จุดสำคัญ: คอลัมน์จัดการต้องไม่โดนบีบ
      {
        field: "_actions",
        headerName: "จัดการ",
        sortable: false,
        filterable: false,
        flex: 0,            // ✅ ไม่ให้ flex บีบ
        minWidth: 320,      // ✅ กว้างขั้นต่ำให้ปุ่มโผล่ครบ
        headerAlign: "right",
        align: "right",
        renderCell: (params) => {
          const row = params.row;
          const qrToken = row.qrToken;

          return (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"     // ✅ ให้ปุ่มขึ้นบรรทัดใหม่ได้
              justifyContent="flex-end"
              sx={{ width: "100%" }}
            >
              <Button
                size="small"
                variant="outlined"
                onClick={() => openEdit(row)}
                disabled={busy}
                sx={{ whiteSpace: "nowrap" }}
              >
                แก้ไข
              </Button>

              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => deleteRow(row)}
                disabled={busy}
                sx={{ whiteSpace: "nowrap" }}
              >
                ลบ
              </Button>

              {qrToken && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => openAuthedFile(api.qrPngUrl(qrToken), "image/png")}
                    disabled={busy}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    ดู QR
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => openAuthedFile(api.badgePdfUrl(qrToken), "application/pdf")}
                    disabled={busy}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    Badge
                  </Button>
                </>
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
        Register
      </Typography>

      {/* ===== Create (Owner + Vehicle) */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={800} gutterBottom>
            สมัคร (Owner + Vehicle) ในครั้งเดียว
          </Typography>

          <Typography fontWeight={700} sx={{ mt: 1 }}>
            ข้อมูลเจ้าของ
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 1 }}>
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

          <Typography fontWeight={700} sx={{ mt: 3 }}>
            ข้อมูลรถ
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="ทะเบียนรถ *"
              value={vehicle.plateNo}
              onChange={(e) => setVehicle({ ...vehicle, plateNo: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="ยี่ห้อ"
              value={vehicle.brand}
              onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="รุ่น"
              value={vehicle.model}
              onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
            <TextField
              label="สี"
              value={vehicle.color}
              onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
          </Stack>

          <Button variant="contained" sx={{ mt: 2 }} onClick={createBoth} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "สมัคร / สร้าง"}
          </Button>

          {(err || info) && (
            <Box sx={{ mt: 2 }}>
              {err && <Alert severity="error">{err}</Alert>}
              {info && <Alert severity="success">{info}</Alert>}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ===== Search */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <TextField
              label="ค้นหา (ชื่อ/เบอร์/ห้อง/ทะเบียน/ยี่ห้อ/รุ่น)"
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
              sx={{ whiteSpace: "nowrap" }}
            >
              ค้นหา
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ===== Table (แก้ให้เลื่อนแนวนอน + ปุ่มไม่ถูกตัด) */}
      <Box
        sx={{
          width: "100%",
          bgcolor: "background.paper",
          overflowX: "auto", // ✅ กันจอแคบ/คอลัมน์เยอะ
          borderRadius: 1,
        }}
      >
        <Box sx={{ height: 560, minWidth: 1100 }}>
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
            sx={{
              // ✅ ทำให้ cell ไม่ตัดปุ่มแปลก ๆ
              "& .MuiDataGrid-cell": { overflow: "visible" },
            }}
          />
        </Box>
      </Box>

      {/* ===== Edit Dialog (owner + vehicle) */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>แก้ไข (Owner + Vehicle)</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {editRow && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box>
                <Typography fontWeight={800} gutterBottom>
                  ข้อมูลเจ้าของ
                </Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="ชื่อ-นามสกุล *"
                    value={editRow.editOwner.fullName}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editOwner: { ...p.editOwner, fullName: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="ห้อง"
                    value={editRow.editOwner.room}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editOwner: { ...p.editOwner, room: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="ชั้นปี"
                    value={editRow.editOwner.year}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editOwner: { ...p.editOwner, year: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    label="คณะ"
                    value={editRow.editOwner.faculty}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editOwner: { ...p.editOwner, faculty: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="สาขา"
                    value={editRow.editOwner.major}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editOwner: { ...p.editOwner, major: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="เบอร์โทร"
                    value={editRow.editOwner.phone}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editOwner: { ...p.editOwner, phone: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                </Stack>
              </Box>

              <Box>
                <Typography fontWeight={800} gutterBottom>
                  ข้อมูลรถ
                </Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="ทะเบียนรถ *"
                    value={editRow.editVehicle.plateNo}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editVehicle: { ...p.editVehicle, plateNo: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="ยี่ห้อ"
                    value={editRow.editVehicle.brand}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editVehicle: { ...p.editVehicle, brand: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="รุ่น"
                    value={editRow.editVehicle.model}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editVehicle: { ...p.editVehicle, model: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="สี"
                    value={editRow.editVehicle.color}
                    onChange={(e) =>
                      setEditRow((p) => ({
                        ...p,
                        editVehicle: { ...p.editVehicle, color: e.target.value },
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                </Stack>
              </Box>
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