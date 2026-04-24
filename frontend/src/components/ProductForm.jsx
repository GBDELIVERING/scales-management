import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  Alert,
} from '@mui/material';
import { createProduct, updateProduct } from '../services/api';
import { toast } from 'react-toastify';

export default function ProductForm({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    plu: '',
    description: '',
    price: '',
    weight_or_piece: 'W',
    item_group: '1',
    sell_by_days: '',
    ingredients: '',
    allergenes: '',
    barcode: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        plu: String(product.plu),
        description: product.description || '',
        price: product.price !== undefined ? (product.price / 100).toFixed(2) : '',
        weight_or_piece: product.weight_or_piece || 'W',
        item_group: String(product.item_group || 1),
        sell_by_days: product.sell_by_days !== null && product.sell_by_days !== undefined ? String(product.sell_by_days) : '',
        ingredients: product.ingredients || '',
        allergenes: product.allergenes || '',
        barcode: product.barcode || '',
      });
    }
  }, [product]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.description.trim()) return setError('Description is required');
    if (!form.price || isNaN(parseFloat(form.price))) return setError('Valid price is required');
    if (!isEdit && (!form.plu || isNaN(parseInt(form.plu)))) return setError('Valid PLU is required');

    setSaving(true);
    try {
      const data = {
        description: form.description.trim(),
        price: Math.round(parseFloat(form.price) * 100),
        weight_or_piece: form.weight_or_piece,
        item_group: parseInt(form.item_group) || 1,
        sell_by_days: form.sell_by_days ? parseInt(form.sell_by_days) : null,
        ingredients: form.ingredients || null,
        allergenes: form.allergenes || null,
        barcode: form.barcode || null,
      };

      if (isEdit) {
        await updateProduct(product.plu, data);
        toast.success('Product updated');
      } else {
        await createProduct({ ...data, plu: parseInt(form.plu) });
        toast.success('Product created');
      }
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? `Edit Product - PLU ${product.plu}` : 'Add New Product'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {!isEdit && (
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="PLU *" type="number" value={form.plu} onChange={handleChange('plu')} size="small" />
            </Grid>
          )}
          <Grid item xs={12} sm={isEdit ? 12 : 8}>
            <TextField fullWidth label="Description *" value={form.description} onChange={handleChange('description')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Price (RWF) *" type="number" value={form.price} onChange={handleChange('price')} size="small" inputProps={{ step: '0.01', min: '0' }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Item Group" type="number" value={form.item_group} onChange={handleChange('item_group')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Type</FormLabel>
              <RadioGroup row value={form.weight_or_piece} onChange={handleChange('weight_or_piece')}>
                <FormControlLabel value="W" control={<Radio />} label="Weight (W)" />
                <FormControlLabel value="P" control={<Radio />} label="Piece (P)" />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Sell-by Days" type="number" value={form.sell_by_days} onChange={handleChange('sell_by_days')} size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Barcode" value={form.barcode} onChange={handleChange('barcode')} size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Ingredients" value={form.ingredients} onChange={handleChange('ingredients')} size="small" multiline rows={2} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Allergenes" value={form.allergenes} onChange={handleChange('allergenes')} size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
