import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import AddIcon from '@mui/icons-material/Add';
import { getProducts, deleteProduct, exportCSV } from '../services/api';
import { toast } from 'react-toastify';
import ProductForm from './ProductForm';
import CSVImport from './CSVImport';

const formatPrice = (cents) => (cents / 100).toFixed(2);

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterWP, setFilterWP] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [editProduct, setEditProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterWP) params.weight_or_piece = filterWP;
      if (filterGroup) params.item_group = filterGroup;
      const res = await getProducts(params);
      setProducts(res.data);
      setPage(0);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, filterWP, filterGroup]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleExport = async () => {
    try {
      const res = await exportCSV();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(deleteTarget.plu);
      toast.success('Product deleted');
      setDeleteTarget(null);
      loadProducts();
    } catch {
      toast.error('Delete failed');
    }
  };

  const paged = products.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Products</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} size="small">Export CSV</Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setShowImport(true)} size="small">Import CSV</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditProduct(null); setShowForm(true); }} size="small">Add Product</Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
          placeholder="Description or PLU..."
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select value={filterWP} onChange={(e) => setFilterWP(e.target.value)} label="Type">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="W">Weight (W)</MenuItem>
            <MenuItem value="P">Piece (P)</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Item Group</InputLabel>
          <Select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} label="Item Group">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="1">Group 1</MenuItem>
            <MenuItem value="2">Group 2</MenuItem>
            <MenuItem value="3">Group 3</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>PLU</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Description</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Price (RWF)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Group</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No products found</TableCell></TableRow>
            ) : (
              paged.map((product) => (
                <TableRow key={product.plu} hover>
                  <TableCell>{product.plu}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell align="right">{formatPrice(product.price)}</TableCell>
                  <TableCell>
                    <Chip label={product.weight_or_piece} size="small" color={product.weight_or_piece === 'W' ? 'primary' : 'secondary'} />
                  </TableCell>
                  <TableCell>{product.item_group}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => { setEditProduct(product); setShowForm(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(product)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={products.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>

      {/* Product Form Dialog */}
      {showForm && (
        <ProductForm
          product={editProduct}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadProducts(); }}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete PLU {deleteTarget?.plu} - {deleteTarget?.description}? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import */}
      <Dialog open={showImport} onClose={() => setShowImport(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import CSV</DialogTitle>
        <DialogContent>
          <CSVImport onImported={() => { setShowImport(false); loadProducts(); }} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
