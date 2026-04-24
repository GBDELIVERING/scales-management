import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
  CssBaseline,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import DevicesIcon from '@mui/icons-material/Devices';
import SyncIcon from '@mui/icons-material/Sync';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import ScaleManager from './components/ScaleManager';
import SyncStatus from './components/SyncStatus';
import BulkPriceUpdate from './components/BulkPriceUpdate';
import CSVImport from './components/CSVImport';

const DRAWER_WIDTH = 220;

const theme = createTheme({
  palette: {
    primary: { main: '#003366' },
    secondary: { main: '#008080' },
    background: { default: '#f0f4f8' },
  },
  typography: { fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif" },
});

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, page: 'dashboard' },
  { label: 'Products', icon: <InventoryIcon />, page: 'products' },
  { label: 'Scales', icon: <DevicesIcon />, page: 'scales' },
  { label: 'Sync', icon: <SyncIcon />, page: 'sync' },
  { label: 'Price Update', icon: <AttachMoneyIcon />, page: 'priceupdate' },
  { label: 'CSV Import', icon: <UploadFileIcon />, page: 'csvimport' },
];

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'products': return <ProductList />;
      case 'scales': return <ScaleManager />;
      case 'sync': return <SyncStatus />;
      case 'priceupdate': return <BulkPriceUpdate />;
      case 'csvimport': return <CSVImport />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  const currentLabel = navItems.find((n) => n.page === currentPage)?.label || 'Bizerba Scale Management';

  const drawer = (
    <Box sx={{ bgcolor: '#003366', height: '100%', color: 'white' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>
          🔵 Bizerba Scale Mgmt
        </Typography>
      </Box>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.page} disablePadding>
            <ListItemButton
              selected={currentPage === item.page}
              onClick={() => { setCurrentPage(item.page); setMobileOpen(false); }}
              sx={{
                color: 'rgba(255,255,255,0.8)',
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)', color: 'white' },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position="fixed"
          sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: '#003366', ml: { sm: `${DRAWER_WIDTH}px` }, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}
        >
          <Toolbar>
            {isMobile && (
              <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" noWrap component="div">
              {currentLabel}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' },
          }}
          open
        >
          {drawer}
        </Drawer>

        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, bgcolor: '#f0f4f8', minHeight: '100vh' }}>
          {renderPage()}
        </Box>
      </Box>

      <ToastContainer position="bottom-right" autoClose={3000} />
    </ThemeProvider>
  );
}

export default App;
