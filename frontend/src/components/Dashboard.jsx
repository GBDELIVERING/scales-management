import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import DevicesIcon from '@mui/icons-material/Devices';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getProducts, getScales, getSyncLogs, syncAll } from '../services/api';
import { toast } from 'react-toastify';

function StatCard({ title, value, icon, color }) {
  return (
    <Card elevation={2}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ bgcolor: color, color: 'white', borderRadius: 2, p: 1.5, display: 'flex' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ onNavigate }) {
  const [products, setProducts] = useState([]);
  const [scales, setScales] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [p, s, l] = await Promise.all([getProducts(), getScales(), getSyncLogs()]);
        setProducts(p.data);
        setScales(s.data);
        setLogs(l.data.slice(0, 10));
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await syncAll();
      toast.success('Sync to all scales initiated');
      const l = await getSyncLogs();
      setLogs(l.data.slice(0, 10));
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const activeScales = scales.filter((s) => s.status === 'online').length;
  const lastSync = logs[0]?.synced_at ? new Date(logs[0].synced_at).toLocaleString() : 'Never';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Button
          variant="contained"
          startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          onClick={handleSyncAll}
          disabled={syncing}
        >
          Sync All Scales
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Products" value={products.length} icon={<InventoryIcon />} color="#003366" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Scales" value={scales.length} icon={<DevicesIcon />} color="#008080" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Scales" value={activeScales} icon={<CheckCircleIcon />} color="#1e8449" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Last Sync" value={logs.length > 0 ? logs.filter(l => l.status === 'success').length : 0} icon={<SyncIcon />} color="#d4ac0d" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Scales Overview</Typography>
              <Grid container spacing={1}>
                {scales.map((scale) => (
                  <Grid item xs={12} sm={6} key={scale.id}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e0e7ef',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{scale.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{scale.ip_address}</Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: scale.status === 'online' ? '#1e8449' : scale.status === 'error' ? '#c0392b' : '#aaa',
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Recent Sync Activity</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Scale</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Products</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.length === 0 && (
                      <TableRow><TableCell colSpan={4} align="center">No sync activity yet</TableCell></TableRow>
                    )}
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.scale_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={log.status}
                            size="small"
                            color={log.status === 'success' ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>{log.products_synced}</TableCell>
                        <TableCell>{new Date(log.synced_at).toLocaleTimeString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={() => onNavigate('products')}>Manage Products</Button>
        <Button variant="outlined" onClick={() => onNavigate('scales')}>Manage Scales</Button>
        <Button variant="outlined" onClick={() => onNavigate('csvimport')}>Import CSV</Button>
      </Box>
    </Box>
  );
}
