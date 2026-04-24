import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getSyncLogs, getScales, syncAll, syncScale } from '../services/api';
import { toast } from 'react-toastify';

const statusColor = { success: 'success', failed: 'error', pending: 'warning' };

export default function SyncStatus() {
  const [logs, setLogs] = useState([]);
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [logsRes, scalesRes] = await Promise.all([getSyncLogs(), getScales()]);
      setLogs(logsRes.data);
      setScales(scalesRes.data);
    } catch {
      toast.error('Failed to load sync data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await syncAll();
      const successes = res.data.results.filter((r) => r.status === 'success').length;
      toast.success(`Synced ${successes}/${res.data.results.length} scales`);
      await loadData();
    } catch {
      toast.error('Sync all failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncOne = async (id, name) => {
    setSyncingId(id);
    try {
      const res = await syncScale(id);
      toast.success(`${name}: ${res.data.status}`);
      await loadData();
    } catch {
      toast.error(`Sync failed for ${name}`);
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Sync Status</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
            label="Auto-refresh (10s)"
          />
          <Tooltip title="Refresh now">
            <IconButton onClick={loadData}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            onClick={handleSyncAll}
            disabled={syncing}
          >
            Sync All Scales
          </Button>
        </Box>
      </Box>

      {/* Scales with sync buttons */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Scales</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {scales.map((scale) => (
            <Button
              key={scale.id}
              variant="outlined"
              size="small"
              startIcon={syncingId === scale.id ? <CircularProgress size={14} /> : <SyncIcon />}
              disabled={syncingId === scale.id}
              onClick={() => handleSyncOne(scale.id, scale.name)}
              sx={{ textTransform: 'none' }}
            >
              {scale.name}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Sync Logs */}
      <Typography variant="h6" gutterBottom>Recent Sync Logs</Typography>
      {logs.length === 0 && <Alert severity="info">No sync logs yet. Use the Sync buttons to sync products to scales.</Alert>}
      {logs.length > 0 && (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#003366' }}>
                {['Scale', 'Location', 'Status', 'Products Synced', 'Time', 'Error'].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{log.scale_name}</TableCell>
                  <TableCell>{log.location}</TableCell>
                  <TableCell>
                    <Chip label={log.status} size="small" color={statusColor[log.status] || 'default'} />
                  </TableCell>
                  <TableCell>{log.products_synced}</TableCell>
                  <TableCell>{new Date(log.synced_at).toLocaleString()}</TableCell>
                  <TableCell sx={{ color: 'error.main', fontSize: '0.75rem' }}>
                    {log.error_message || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
