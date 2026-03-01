import { NavLink, Outlet } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";

// icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import SecurityIcon from "@mui/icons-material/Security";

const drawerWidth = 240;

export default function AdminLayout() {
  const menu = [
    { label: "Dashboard", to: "/dashboard", icon: <DashboardIcon /> },
    { label: "ลงทะเบียน", to: "/register", icon: <HowToRegIcon /> },
    { label: "Reports", to: "/reports", icon: <AssignmentIcon /> },
    { label: "รปภ", to: "/guards", icon: <SecurityIcon /> },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Parking QR • Admin
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <Divider />
        <List>
          {menu.map((m) => (
            <ListItemButton
              key={m.to}
              component={NavLink}
              to={m.to}
              sx={{
                "&.active": {
                  bgcolor: "action.selected",
                  borderRight: "3px solid",
                  borderRightColor: "primary.main",
                },
              }}
            >
              <ListItemIcon>{m.icon}</ListItemIcon>
              <ListItemText primary={m.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}