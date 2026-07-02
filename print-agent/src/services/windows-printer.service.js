const { execFile } = require('child_process');
const os = require('os');
const configService = require('./config.service');
const logger = require('../utils/logger');

let knownPrinterNames = null;

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr;
          return reject(error);
        }

        return resolve(stdout.trim());
      }
    );
  });
}

function parseJsonList(stdout) {
  if (!stdout) {
    return [];
  }

  const parsed = JSON.parse(stdout);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function getStatus(row) {
  if (row.WorkOffline) {
    return 'Offline';
  }

  if (typeof row.PrinterStatus === 'string') {
    const normalized = row.PrinterStatus.trim();
    if (!normalized || normalized === 'Normal' || normalized === 'Idle') {
      return 'Online';
    }
    return normalized;
  }

  const statusMap = {
    1: 'Other',
    2: 'Unknown',
    3: 'Online',
    4: 'Printing',
    5: 'Warming Up',
    6: 'Stopped',
    7: 'Offline'
  };

  if (row.DetectedErrorState && row.DetectedErrorState !== 2) {
    return 'Error';
  }

  return statusMap[row.PrinterStatus] || 'Unknown';
}

function normalizePrinter(row) {
  const isNetwork = Boolean(row.Network);
  const isLocal = Boolean(row.Local) || !isNetwork;

  return {
    name: row.Name || '',
    driver: row.DriverName || '',
    port: row.PortName || '',
    shared: Boolean(row.Shared),
    default: Boolean(row.Default),
    isDefault: Boolean(row.Default),
    status: getStatus(row),
    isNetwork,
    isLocal
  };
}

function logPrinterChanges(printers) {
  const names = new Set(printers.map(printer => printer.name));

  if (!knownPrinterNames) {
    printers.forEach(printer => logger.info('Impressora encontrada', {
      name: printer.name,
      driver: printer.driver,
      port: printer.port,
      status: printer.status
    }));
    knownPrinterNames = names;
    return;
  }

  printers.forEach(printer => {
    if (!knownPrinterNames.has(printer.name)) {
      logger.info('Impressora encontrada', {
        name: printer.name,
        driver: printer.driver,
        port: printer.port,
        status: printer.status
      });
    }
  });

  knownPrinterNames.forEach(name => {
    if (!names.has(name)) {
      logger.warn('Impressora removida', { name });
    }
  });

  knownPrinterNames = names;
}

async function listPrinters() {
  if (process.platform !== 'win32') {
    logger.warn('Falha de comunicacao com impressoras: sistema operacional nao Windows.');
    return [];
  }

  try {
    return await listPrintersWithCim();
  } catch (error) {
    logger.warn('Get-CimInstance Win32_Printer falhou. Tentando Get-Printer.', {
      message: error.message,
      stderr: error.stderr
    });
  }

  try {
    return await listPrintersWithGetPrinter();
  } catch (error) {
    logger.warn('Get-Printer falhou. Tentando registro do Windows.', {
      message: error.message,
      stderr: error.stderr
    });
  }

  try {
    return await listPrintersWithRegistry();
  } catch (error) {
    logger.error('Falha de comunicacao com o Windows ao listar impressoras', {
      message: error.message,
      stderr: error.stderr
    });
    return [];
  }
}

async function listPrintersWithCim() {
  const script = [
    'Get-CimInstance Win32_Printer',
    'Select-Object Name,DriverName,PortName,Shared,Default,WorkOffline,PrinterStatus,DetectedErrorState,Network,Local',
    'ConvertTo-Json -Compress'
  ].join(' | ');
  const stdout = await runPowerShell(script);
  const printers = parseJsonList(stdout)
    .filter(row => row && row.Name)
    .map(normalizePrinter)
    .sort((a, b) => a.name.localeCompare(b.name));

  logPrinterChanges(printers);
  return printers;
}

async function listPrintersWithGetPrinter() {
  const script = `
    $windows = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows' -ErrorAction SilentlyContinue;
    $defaultPrinter = '';
    if ($windows -and $windows.Device) { $defaultPrinter = ($windows.Device -split ',')[0]; }
    Get-Printer | Select-Object Name,DriverName,PortName,Shared,@{n='Default';e={$_.Name -eq $defaultPrinter}},@{n='WorkOffline';e={$false}},PrinterStatus,@{n='DetectedErrorState';e={2}},@{n='Network';e={($_.Type -match 'Connection|Network') -or ($_.PortName -match '^\\\\') -or ($_.PortName -match '^IP_') -or ($_.PortName -match '^WSD')}},@{n='Local';e={-not (($_.Type -match 'Connection|Network') -or ($_.PortName -match '^\\\\') -or ($_.PortName -match '^IP_') -or ($_.PortName -match '^WSD'))}} | ConvertTo-Json -Compress
  `;
  const stdout = await runPowerShell(script);
  const printers = parseJsonList(stdout)
    .filter(row => row && row.Name)
    .map(normalizePrinter)
    .sort((a, b) => a.name.localeCompare(b.name));

  logPrinterChanges(printers);
  return printers;
}

async function listPrintersWithRegistry() {
  const script = `
    $windows = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows' -ErrorAction SilentlyContinue;
    $defaultPrinter = '';
    if ($windows -and $windows.Device) { $defaultPrinter = ($windows.Device -split ',')[0]; }
    Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers' | ForEach-Object {
      $printer = Get-ItemProperty $_.PsPath;
      $port = [string]$printer.Port;
      $isNetwork = ($port -match '^\\\\') -or ($port -match '^IP_') -or ($port -match '^WSD') -or ($port -match '^http');
      [pscustomobject]@{
        Name = $_.PSChildName;
        DriverName = [string]$printer.'Printer Driver';
        PortName = $port;
        Shared = [bool]($printer.'Share Name');
        Default = ($_.PSChildName -eq $defaultPrinter);
        WorkOffline = $false;
        PrinterStatus = 'Online';
        DetectedErrorState = 2;
        Network = $isNetwork;
        Local = -not $isNetwork;
      }
    } | ConvertTo-Json -Compress
  `;
  const stdout = await runPowerShell(script);
  const printers = parseJsonList(stdout)
    .filter(row => row && row.Name)
    .map(normalizePrinter)
    .sort((a, b) => a.name.localeCompare(b.name));

  logPrinterChanges(printers);
  return printers;
}

function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  Object.values(interfaces).forEach(entries => {
    (entries || []).forEach(entry => {
      if (entry.family === 'IPv4' && !entry.internal) {
        ips.push(entry.address);
      }
    });
  });

  return ips;
}

async function getDiagnostics() {
  const config = configService.getConfig();
  const printers = await listPrinters();

  return {
    service: 'Online',
    printerCount: printers.length,
    defaultPrinter: config.defaultPrinter || config.defaultPrinterName || printers.find(printer => printer.default)?.name || '',
    version: config.version,
    port: config.port,
    operatingSystem: `${os.type()} ${os.release()}`,
    hostname: os.hostname(),
    localIp: getLocalIps()
  };
}

module.exports = {
  getDiagnostics,
  listPrinters
};
