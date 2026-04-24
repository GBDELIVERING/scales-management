import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import { importCSV, exportCSV } from '../services/api';
import { toast } from 'react-toastify';

const formatPrice = (cents) => (cents / 100).toFixed(2);

export default function CSVImport({ onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setError('');

    // Parse locally for preview
    try {
      const text = await f.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) return;

      const isHeader = isNaN(parseInt(lines[0].split(';')[0]));
      const dataLines = isHeader ? lines.slice(1) : lines;
      const rows = dataLines.slice(0, 10).map((line) => {
        const cols = line.split(';');
        return {
          plu: cols[1],
          description: cols[2],
          price: cols[4],
          type: cols[6] || 'W',
          itemGroup: cols[8] || '1',
        };
      }).filter((r) => r.plu && !isNaN(parseInt(r.plu)));

      setPreview(rows);
    } catch {
      setError('Failed to parse file preview');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const res = await importCSV(file);
      toast.success(`Imported ${res.data.count} products`);
      setFile(null);
      setPreview([]);
      if (onImported) onImported();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await exportCSV();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Import Products from CSV</Typography>

      <Box
        sx={{
          border: '2px dashed #003366',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          bgcolor: '#f8fafc',
          cursor: 'pointer',
          mb: 2,
          '&:hover': { bgcolor: '#e8f0fe' },
        }}
        onClick={() => document.getElementById('csv-input').click()}
      >
        <UploadIcon sx={{ fontSize: 48, color: '#003366', mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          {file ? file.name : 'Click to select a CSV file or drag and drop'}
        </Typography>
        <input
          id="csv-input"
          type="file"
          accept=".csv,.txt"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
          onClick={handleImport}
          disabled={!file || importing}
        >
          {importing ? 'Importing...' : 'Import'}
        </Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate}>
          Download Template
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {preview.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Preview (first {preview.length} rows):
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>PLU</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Group</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.plu}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.price}</TableCell>
                    <TableCell>
                      <Chip label={row.type} size="small" color={row.type === 'W' ? 'primary' : 'secondary'} />
                    </TableCell>
                    <TableCell>{row.itemGroup}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
