const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const configService = require('./config.service');
const windowsPrinterService = require('./windows-printer.service');
const logger = require('../utils/logger');

const SUPPORTED_TYPES = ['text', 'zpl', 'epl', 'tspl'];

function runPowerShell(script) {
  const encodedCommand = Buffer.from(script, 'utf16le').toString('base64');

  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedCommand], {
      windowsHide: true,
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        return reject(error);
      }

      return resolve(stdout);
    });
  });
}

async function listPrinters() {
  return windowsPrinterService.listPrinters();
}

function validatePrintType(type) {
  if (!SUPPORTED_TYPES.includes(type)) {
    throw new Error(`Unsupported print type: ${type}. Use: ${SUPPORTED_TYPES.join(', ')}`);
  }
}

function getExtension(type) {
  return type === 'text' ? 'txt' : type;
}

function psString(value) {
  return `'${String(value || '').replace(/'/g, "''")}'`;
}

async function sendToPrinter(job, options = {}) {
  validatePrintType(job.type);

  const config = configService.getConfig();
  const printerName = job.printerName || config.defaultPrinter || config.defaultPrinterName || 'Default Printer';

  if (job.type !== 'text' && Number(job.copies || 1) > 1) {
    throw new Error('Impressao RAW termica bloqueada com mais de 1 copia por seguranca.');
  }

  if (config.printMode !== 'real') {
    logger.warn('Print mode is not real. Sending to Windows anyway because the print manager is in production print mode.', {
      configuredMode: config.printMode,
      printerName
    });
  }

  return sendToWindowsPrinter(job, printerName, options);
}

async function assertPrinterExists(printerName) {
  const printers = await listPrinters();
  const printer = printers.find(item => item.name.toLowerCase() === String(printerName).toLowerCase());

  if (!printer) {
    throw new Error(`Impressora nao encontrada no Windows: ${printerName}`);
  }

  return printer;
}

async function sendToWindowsPrinter(job, printerName, options = {}) {
  if (process.platform !== 'win32') {
    throw new Error('Real printing is currently prepared for Windows only.');
  }

  const printer = await assertPrinterExists(printerName);

  const extension = getExtension(job.type);
  const tempFile = path.join(os.tmpdir(), `credencia-print-${job.id}.${extension}`);
  logger.info('Enviando impressao para', {
    printerName,
    jobId: job.id,
    type: job.type,
    copy: options.copy || 1
  });

  fs.writeFileSync(tempFile, job.content, 'utf8');
  logger.info('Arquivo temporario criado', { tempFile });

  try {
    if (job.type === 'text') {
      await sendTextToPrinter(tempFile, printerName);
    } else {
      await sendRawToPrinter(tempFile, printer, job.type);
    }

    logger.info('Job enviado ao Windows', { printerName, jobId: job.id, type: job.type });
    logger.info('Impressao concluida', { printerName, jobId: job.id });

    return {
      mode: 'real',
      printerName,
      tempFile,
      type: job.type
    };
  } catch (error) {
    logger.error('Erro ao imprimir', {
      printerName,
      jobId: job.id,
      message: error.message,
      stderr: error.stderr
    });
    throw new Error(`Falha ao enviar para o Windows: ${error.stderr || error.message}`);
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch (error) {
      logger.warn('Nao foi possivel apagar arquivo temporario', {
        tempFile,
        message: error.message
      });
    }
  }
}

async function sendTextToPrinter(tempFile, printerName) {
  const script = `
    $ErrorActionPreference = 'Stop'
    $printerName = ${psString(printerName)}
    $filePath = ${psString(tempFile)}
    Get-Content -LiteralPath $filePath -Raw | Out-Printer -Name $printerName
  `;

  await runPowerShell(script);
}

function isIpAddress(value) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(value || '').trim());
}

async function sendRawToPrinter(tempFile, printer, type) {
  const stats = fs.statSync(tempFile);

  if (stats.size > 4096) {
    throw new Error(`Comando RAW muito grande para teste seguro: ${stats.size} bytes`);
  }

  if (isIpAddress(printer.port)) {
    logger.info('Enviando RAW direto para porta 9100 da impressora termica', {
      printerName: printer.name,
      port: printer.port,
      type,
      bytes: stats.size
    });

    await sendRawToNetworkPrinter(tempFile, printer.port);
    return;
  }

  await sendRawToWindowsSpooler(tempFile, printer.name, type, stats.size);
}

function sendRawToNetworkPrinter(tempFile, host) {
  const data = fs.readFileSync(tempFile);

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    function finish(error) {
      if (settled) return;
      settled = true;
      socket.destroy();

      if (error) {
        reject(error);
        return;
      }

      resolve();
    }

    socket.setTimeout(5000);
    socket.once('error', error => finish(error));
    socket.once('timeout', () => finish(new Error('Timeout ao enviar RAW para a porta 9100.')));
    socket.connect(9100, host, () => {
      socket.write(data, error => {
        if (error) {
          finish(error);
          return;
        }

        socket.end();
      });
    });
    socket.once('close', hadError => {
      if (!hadError) finish();
    });
  });
}

async function sendRawToWindowsSpooler(tempFile, printerName, type, byteSize) {
  const script = `
    $ErrorActionPreference = 'Stop'
    $printerName = ${psString(printerName)}
    $filePath = ${psString(tempFile)}

    Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA
  {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, Int32 dwCount, out Int32 dwWritten);

  public static void SendFile(string printerName, string filePath)
  {
    IntPtr hPrinter;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Credencia RAW Print";
    di.pDataType = "RAW";

    if (!OpenPrinter(printerName.Normalize(), out hPrinter, IntPtr.Zero)) {
      throw new Exception("OpenPrinter falhou: " + Marshal.GetLastWin32Error());
    }

    try {
      byte[] bytes = File.ReadAllBytes(filePath);
      int written = 0;

      if (!StartDocPrinter(hPrinter, 1, di)) throw new Exception("StartDocPrinter falhou: " + Marshal.GetLastWin32Error());
      if (!WritePrinter(hPrinter, bytes, bytes.Length, out written)) throw new Exception("WritePrinter falhou: " + Marshal.GetLastWin32Error());
      if (written != bytes.Length) throw new Exception("WritePrinter enviou bytes incompletos.");
      if (!EndDocPrinter(hPrinter)) throw new Exception("EndDocPrinter falhou: " + Marshal.GetLastWin32Error());
    }
    finally {
      ClosePrinter(hPrinter);
    }
  }
}
"@

    [RawPrinterHelper]::SendFile($printerName, $filePath)
  `;

  logger.info('Enviando RAW para spooler do Windows', { printerName, type, bytes: byteSize });
  await runPowerShell(script);
}

async function printJob(job) {
  return sendToPrinter(job);
}

module.exports = {
  listPrinters,
  printJob,
  sendToPrinter,
  SUPPORTED_TYPES
};
