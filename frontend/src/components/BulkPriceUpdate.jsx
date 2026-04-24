import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { getProducts, bulkUpdate } from '../services/api';
import { toast } from 'react-toastify';

const formatPrice = (cents) => (cents / 100).toFixed(2);

export default function BulkPriceUpdate() {
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [editPrices, setEditPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Percentage tab state
  const [selectedPlus, setSelectedPlus] = useState(new Set());
  const [percentage, setPercentage] = useState('');
  const [preview, setPreview] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await getProducts();
        setProducts(res.data);
        const prices = {};
        res.data.forEach((p) => { prices[p.plu] = formatPrice(p.price); });
        setEditPrices(prices);
      } catch {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleIndividualSave = async () => {
    const updates = products
      .filter((p) => {
        const newPrice = Math.round(parseFloat(editPrices[p.plu] || 0) * 100);
        return newPrice !== p.price;
      })
      .map((p) => ({ plu: p.plu, newPrice: Math.round(parseFloat(editPrices[p.plu]) * 100) }));

    if (updates.length === 0) return toast.info('No prices changed');
    setSaving(true);
    try {
      const res = await bulkUpdate({ updates });
      toast.success(`Updated ${res.data.updates.length} products`);
      const fresh = await getProducts();
      setProducts(fresh.data);
      const prices = {};
      fresh.data.forEach((p) => { prices[p.plu] = formatPrice(p.price); });
      setEditPrices(prices);
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSelect = (plu) => {
    setSelectedPlus((prev) => {
      const next = new Set(prev);
      next.has(plu) ? next.delete(plu) : next.add(plu);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPlus.size === products.length) {
      setSelectedPlus(new Set());
    } else {
      setSelectedPlus(new Set(products.map((p) => p.plu)));
    }
  };

  const handlePreview = () => {
    if (!percentage || isNaN(parseFloat(percentage))) return toast.error('Enter a valid percentage');
    const pct = parseFloat(percentage);
    const prev = products
      .filter((p) => selectedPlus.has(p.plu))
      .map((p) => ({
        plu: p.plu,
        description: p.description,
        oldPrice: p.price,
        newPrice: Math.round(p.price * (1 + pct / 100)),
      }));
    setPreview(prev);
  };

  const handlePercentageApply = async () => {
    if (preview.length === 0) return toast.info('Preview first');
    setSaving(true);
    try {
      const res = await bulkUpdate({ plus: Array.from(selectedPlus), percentage: parseFloat(percentage) });
      toast.success(`Updated ${res.data.updates.length} products`);
      const fresh = await getProducts();
      setProducts(fresh.data);
      setSelectedPlus(new Set());
      setPreview([]);
      setPercentage('');
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Bulk Price Update</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Individual Updates" />
        <Tab label="Percentage Update" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>Edit prices directly in the table. Only changed prices will be saved.</Alert>
          <Button variant="contained" onClick={handleIndividualSave} disabled={saving} sx={{ mb: 2 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <TableContainer component={Paper} elevation={2}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#003366' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>PLU</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Current Price</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>New Price</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Changed?</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p) => {
                  const newPrice = Math.round(parseFloat(editPrices[p.plu] || 0) * 100);
                  const changed = newPrice !== p.price;
                  return (
                    <TableRow key={p.plu} sx={{ bgcolor: changed ? '#fffde7' : 'inherit' }}>
                      <TableCell>{p.plu}</TableCell>
                      <TableCell>{p.description}</TableCell>
                      <TableCell>{formatPrice(p.price)}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={editPrices[p.plu] || ''}
                          onChange={(e) => setEditPrices((prev) => ({ ...prev, [p.plu]: e.target.value }))}
                          inputProps={{ step: '0.01', min: '0', style: { width: 100 } }}
                        />
                      </TableCell>
                      <TableCell>
                        {changed && <Chip label="Changed" size="small" color="warning" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Percentage (%)"
              type="number"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              size="small"
              sx={{ width: 160 }}
              placeholder="+10 or -5"
            />
            <Button variant="outlined" onClick={handlePreview}>Preview Changes</Button>
            <Button variant="contained" onClick={handlePercentageApply} disabled={saving || preview.length === 0}>
              {saving ? 'Applying...' : `Apply to ${selectedPlus.size} products`}
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={2}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#003366' }}>
                  <TableCell sx={{ color: 'white' }}>
                    <Checkbox
                      checked={selectedPlus.size === products.length && products.length > 0}
                      indeterminate={selectedPlus.size > 0 && selectedPlus.size < products.length}
                      onChange={handleSelectAll}
                      sx={{ color: 'white' }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>PLU</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Current Price</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>New Price (Preview)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p) => {
                  const prev = preview.find((pr) => pr.plu === p.plu);
                  return (
                    <TableRow key={p.plu} selected={selectedPlus.has(p.plu)}>
                      <TableCell>
                        <Checkbox checked={selectedPlus.has(p.plu)} onChange={() => handleToggleSelect(p.plu)} />
                      </TableCell>
                      <TableCell>{p.plu}</TableCell>
                      <TableCell>{p.description}</TableCell>
                      <TableCell>{formatPrice(p.price)}</TableCell>
                      <TableCell>
                        {prev ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>{formatPrice(prev.newPrice)}</Typography>
                            <Chip
                              label={`${prev.newPrice > prev.oldPrice ? '+' : ''}${(((prev.newPrice - prev.oldPrice) / prev.oldPrice) * 100).toFixed(1)}%`}
                              size="small"
                              color={prev.newPrice > prev.oldPrice ? 'success' : 'error'}
                            />
                          </Box>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
