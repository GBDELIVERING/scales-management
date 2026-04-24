/**
 * Generates a Bizerba-compatible CSV string from an array of products.
 */
function generateBizerbaCSV(products) {
  const header = 'Row;PLU;Description;;Price;;W/P;;ItemGroup;;Sell-by;;Ingredients;Allergenes;;;;;;;;;;;;;;;;;';
  const rows = products.map((p, index) => {
    const row = index + 1;
    const sellBy = p.sell_by_days !== null && p.sell_by_days !== undefined ? p.sell_by_days : 1;
    const barcode = p.barcode || '0201';
    const ingredients = p.ingredients || '';
    const allergenes = p.allergenes || '';
    return `${row};${p.plu};${p.description};0;${p.price};0;${p.weight_or_piece};;${p.item_group || 1};${p.item_group || 1};${sellBy};;;${barcode};;;;;;;;;;;null;null;0;0;0;0`;
  });

  return [header, ...rows].join('\r\n');
}

/**
 * Parse a Bizerba CSV string and return an array of product objects.
 */
function parseCSV(fileContent) {
  return new Promise((resolve, reject) => {
    try {
      const lines = fileContent.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) return resolve([]);

      // Detect if first line is a header
      const firstLine = lines[0];
      const isHeader = isNaN(parseInt(firstLine.split(';')[0]));
      const dataLines = isHeader ? lines.slice(1) : lines;

      const products = [];
      for (const line of dataLines) {
        if (!line.trim()) continue;
        const cols = line.split(';');
        // Format: Row;PLU;Description;;Price;;W/P;;ItemGroup;;Sell-by;;Ingredients;Allergenes...
        const plu = parseInt(cols[1]);
        if (!plu || isNaN(plu)) continue;

        const description = cols[2] || '';
        const price = parseInt(cols[4]) || 0;
        const weight_or_piece = cols[6] === 'P' ? 'P' : 'W';
        const item_group = parseInt(cols[8]) || 1;
        const sell_by_days = parseInt(cols[10]) || null;
        const ingredients = cols[13] || null;
        const allergenes = cols[14] || null;
        const barcode = cols[13] || null;

        products.push({
          plu,
          description,
          price,
          weight_or_piece,
          item_group,
          sell_by_days,
          ingredients: cols[12] || null,
          allergenes: cols[13] || null,
          barcode: cols[13] || null,
        });
      }

      resolve(products);
    } catch (err) {
      reject(err);
    }
  });
}

const fs = require('fs-extra');
const path = require('path');

/**
 * Write CSV content to a file path.
 */
async function exportToFile(products, filePath) {
  const csv = generateBizerbaCSV(products);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, csv, 'utf-8');
  return filePath;
}

module.exports = { generateBizerbaCSV, parseCSV, exportToFile };
