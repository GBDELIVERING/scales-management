const path = require('path');
const net = require('net');
const fs = require('fs-extra');
const os = require('os');

/**
 * Sanitize a filename to prevent path traversal attacks.
 */
function sanitizeFilename(filename) {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Check if a scale is reachable via TCP on port 80.
 * Returns 'online' or 'offline'.
 */
function checkScaleStatus(ipAddress) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 3000;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve('online');
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve('offline');
    });

    socket.on('error', () => {
      socket.destroy();
      resolve('offline');
    });

    socket.connect(80, ipAddress);
  });
}

/**
 * Write CSV content to a network drive path.
 * On Windows: writes to `${networkDrive}\\${filename}`
 * On Linux/test: writes to a local directory simulating the network drive.
 */
async function copyToNetworkDrive(csvContent, networkDrive, filename) {
  const safeFilename = sanitizeFilename(filename);
  const isWindows = os.platform() === 'win32';

  let targetPath;
  if (isWindows && networkDrive) {
    targetPath = path.join(networkDrive, safeFilename);
  } else {
    // On Linux simulate the network drive under a local directory
    const driveLetter = networkDrive ? networkDrive.replace(':', '') : 'unknown';
    targetPath = path.join(process.cwd(), 'network_drives', driveLetter, safeFilename);
  }

  await fs.ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, csvContent, 'utf-8');
  return targetPath;
}

module.exports = { checkScaleStatus, copyToNetworkDrive };
