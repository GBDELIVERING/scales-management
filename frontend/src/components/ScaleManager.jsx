import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Grid,
  Alert,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { getScales, createScale, updateScale, deleteScale, syncScale, getScaleStatus } from '../services/api';
import { toast } from 'react-toastify';

const statusColor = { online: 'success', offline: 'default', error: 'error', inactive: 'default' };

function ScaleFormDialog({ scale, onClose, onSaved }) {
  const isEdit = !!scale;
  const [form, setForm] = useState({
    name: scale?.name || '',
    location: scale?.location || '',
    ip_address: scale?.ip_address || '',
    network_drive: scale?.network_drive || '',
    model: scale?.model || 'KHII 800',
    device_number: scale?.device_number || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) return setError('Name is required');
    if (!form.location.trim()) return setError('Location is required');
    if (!form.ip_address.trim()) return setError('IP address is required');
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        location: form.location.trim(),
        ip_address: form.ip_address.trim(),
        network_drive: form.network_drive.trim() || null,
        model: form.model.trim() || 'KHII 800',
        device_number: form.device_number.trim() || null,
      };
      if (isEdit) {
        await updateScale(scale.id, data);
        toast.success('Scale updated');
      } else {
        await createScale(data);
        toast.success('Scale added');
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Scale' : 'Add Scale'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Name *" value={form.name} onChange={handleChange('name')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Location *" value={form.location} onChange={handleChange('location')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="IP Address *" value={form.ip_address} onChange={handleChange('ip_address')} size="small" placeholder="192.168.1.100" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Network Drive" value={form.network_drive} onChange={handleChange('network_drive')} size="small" placeholder="X:" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Model" value={form.model} onChange={handleChange('model')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Device Number" value={form.device_number} onChange={handleChange('device_number')} size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Add'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ScaleManager() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editScale, setEditScale] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [checkingId, setCheckingId] = useState(null);

  const loadScales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getScales();
      setScales(res.data);
    } catch {
      toast.error('Failed to load scales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadScales(); }, [loadScales]);

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      const res = await syncScale(id);
      toast.success(`Sync ${res.data.status}: ${res.data.products_synced} products`);
      loadScales();
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleCheckStatus = async (id) => {
    setCheckingId(id);
    try {
      const res = await getScaleStatus(id);
      toast.info(`Scale status: ${res.data.status}`);
      loadScales();
    } catch {
      toast.error('Status check failed');
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteScale(deleteTarget.id);
      toast.success('Scale deleted');
      setDeleteTarget(null);
      loadScales();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Scale Manager</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditScale(null); setShowForm(true); }}>
          Add Scale
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              {['Name', 'Location', 'IP Address', 'Network Drive', 'Model', 'Status', 'Last Sync', 'Actions'].map((h) => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : scales.map((scale) => (
              <TableRow key={scale.id} hover>
                <TableCell fontWeight={600}>{scale.name}</TableCell>
                <TableCell>{scale.location}</TableCell>
                <TableCell>{scale.ip_address}</TableCell>
                <TableCell>{scale.network_drive || '—'}</TableCell>
                <TableCell>{scale.model}</TableCell>
                <TableCell>
                  <Chip label={scale.status} size="small" color={statusColor[scale.status] || 'default'} />
                </TableCell>
                <TableCell>{scale.last_sync ? new Date(scale.last_sync).toLocaleString() : 'Never'}</TableCell>
                <TableCell>
                  <Tooltip title="Check Status">
                    <IconButton size="small" onClick={() => handleCheckStatus(scale.id)} disabled={checkingId === scale.id}>
                      {checkingId === scale.id ? <CircularProgress size={16} /> : scale.status === 'online' ? <WifiIcon color="success" fontSize="small" /> : <WifiOffIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sync">
                    <IconButton size="small" onClick={() => handleSync(scale.id)} disabled={syncingId === scale.id}>
                      {syncingId === scale.id ? <CircularProgress size={16} /> : <SyncIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => { setEditScale(scale); setShowForm(true); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(scale)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {showForm && (
        <ScaleFormDialog scale={editScale} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadScales(); }} />
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Scale</DialogTitle>
        <DialogContent>
          <DialogContentText>Delete scale "{deleteTarget?.name}"? All sync logs will also be deleted.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
