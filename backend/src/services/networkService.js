const net = require('net');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

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
  const isWindows = os.platform() === 'win32';

  let targetPath;
  if (isWindows && networkDrive) {
    targetPath = path.join(networkDrive + '\\', filename);
  } else {
    // On Linux simulate the network drive under a local directory
    const driveLetter = networkDrive ? networkDrive.replace(':', '') : 'unknown';
    targetPath = path.join(process.cwd(), 'network_drives', driveLetter, filename);
  }

  await fs.ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, csvContent, 'utf-8');
  return targetPath;
}

module.exports = { checkScaleStatus, copyToNetworkDrive };
