import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { api, getToken } from "../services/api";

export default function VehiclesPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // ===== Owners autocomplete =====
  const [owners, setOwners] = useState([]);
  const [ownerInput, setOwnerInput] = useState("");
  const [selectedOwner, setSelectedOwner] = useState(null); // {id, fullName,...} or null

  // create form
  const [vehicle, setVehicle] = useState({
    plateNo: "",
    color: "",
    brand: "",
    model: "",
  });

  const baseColumns = useMemo(
    () => [
      { field: "plateNo", headerName: "ทะเบียน", flex: 1 },
      { field: "brand", headerName: "ยี่ห้อ", flex: 1 },
      { field: "model", headerName: "รุ่น", flex: 1 },
      { field: "color", headerName: "สี", flex: 1 },
      {
        field: "ownerName",
        headerName: "เจ้าของ",
        flex: 1.2,
        valueGetter: (p) => p?.row?.owner?.fullName || "-",
      },
      { field: "ownerId", headerName: "ownerId", flex: 1.2 },
      { field: "qrToken", headerName: "qrToken", flex: 1.4 },
    ],
    []
  );

  async function loadVehicles(next = {}) {
    setBusy(true);
    setErr("");
    try {
      const data = await api.listVehicles({ q, page, pageSize, ...next });
      const items = Array.isArray(data?.items) ? data.items : [];
      setRows(items);
      setTotal(Number(data?.total || 0));
    } catch (e) {
      setErr(e?.message || "โหลดรายการรถไม่สำเร็จ");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  // ✅ โหลดรถเมื่อ page/pageSize/q เปลี่ยน
  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q]);

  // ✅ โหลด owners ครั้งแรก (เอามาแสดงใน autocomplete)
  useEffect(() => {
    let alive = true;

    async function loadOwnersInitial() {
      try {
        // เอามาเยอะหน่อยสำหรับค้นหา (ปรับได้)
        const data = await api.listOwners({ q: "", page: 0, pageSize: 200 });
        if (!alive) return;
        setOwners(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        // ไม่ต้องขึ้นแดงก็ได้ แค่ console ไว้พอ
        console.error("โหลด owners ไม่สำเร็จ:", e);
      }
    }

    loadOwnersInitial();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ ค้นหา owners จาก backend ตามที่พิมพ์ (ทำ debounced แบบง่าย)
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const query = ownerInput.trim();
        // ถ้าไม่พิมพ์อะไร ใช้ list เดิมได้
        const data = await api.listOwners({ q: query, page: 0, pageSize: 50 });
        if (!alive) return;
        setOwners(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        // เงียบไว้ก็ได้
      }
    }, 300);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [ownerInput]);

  async function createVehicle() {
    setErr("");
    setBusy(true);
    try {
      const ownerId = selectedOwner?.id;
      if (!ownerId) throw new Error("ต้องเลือกเจ้าของก่อน");
      if (!vehicle.plateNo.trim()) throw new Error("ต้องกรอกทะเบียนรถก่อน");

      await api.createVehicle({
        ownerId,
        plateNo: vehicle.plateNo.trim(),
        color: vehicle.color.trim() || undefined,
        brand: vehicle.brand.trim() || undefined,
        model: vehicle.model.trim() || undefined,
      });

      setVehicle({ plateNo: "", color: "", brand: "", model: "" });
      // ไม่จำเป็นต้องล้างเจ้าของก็ได้ แต่แนะนำล้างเพื่อกันเผลอ
      // setSelectedOwner(null);

      setPage(0);
      await loadVehicles({ page: 0 });
    } catch (e) {
      setErr(e?.message || "สร้างรถไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function openAuthedFile(url, mime) {
    setErr("");
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

  const columns = useMemo(() => {
    return [
      ...baseColumns,
      {
        field: "_actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        flex: 1.2,
        renderCell: (params) => {
          const qrToken = params.row.qrToken;
          if (!qrToken) return null;
          return (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => openAuthedFile(api.qrPngUrl(qrToken), "image/png")}
                disabled={busy}
              >
                QR PNG
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => openAuthedFile(api.badgePdfUrl(qrToken), "application/pdf")}
                disabled={busy}
              >
                Badge PDF
              </Button>
            </Stack>
          );
        },
      },
    ];
  }, [baseColumns, busy]);

  return (
    <>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Vehicles
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={700} gutterBottom>
            เพิ่มรถ
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Autocomplete
              fullWidth
              options={owners}
              value={selectedOwner}
              onChange={(_e, newValue) => setSelectedOwner(newValue)}
              inputValue={ownerInput}
              onInputChange={(_e, newInput) => setOwnerInput(newInput)}
              getOptionLabel={(o) => {
                if (!o) return "";
                const room = o.room ? ` • ${o.room}` : "";
                const phone = o.phone ? ` • ${o.phone}` : "";
                return `${o.fullName}${room}${phone}`;
              }}
              isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
              loading={busy}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ค้นหา/เลือกเจ้าของ * (พิมพ์ชื่อ/เบอร์/ห้อง)"
                  size="small"
                  disabled={busy}
                />
              )}
            />

            <TextField
              label="ทะเบียนรถ *"
              value={vehicle.plateNo}
              onChange={(e) => setVehicle({ ...vehicle, plateNo: e.target.value })}
              size="small"
              fullWidth
              disabled={busy}
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
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

          <Button variant="contained" sx={{ mt: 2 }} onClick={createVehicle} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "สร้างรถ"}
          </Button>

          {selectedOwner && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ownerId ที่เลือก: <b>{selectedOwner.id}</b>
            </Typography>
          )}

          {err && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {err}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <TextField
              label="ค้นหา (ทะเบียน/ยี่ห้อ/รุ่น/เจ้าของ)"
              value={q}
              onChange={(e) => {
                setPage(0);
                setQ(e.target.value);
              }}
              size="small"
              fullWidth
              disabled={busy}
            />
            <Button variant="outlined" onClick={() => loadVehicles()} disabled={busy}>
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