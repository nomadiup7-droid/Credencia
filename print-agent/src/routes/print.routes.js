const express = require('express');
const queueService = require('../services/queue.service');
const configService = require('../services/config.service');
const printerService = require('../services/printer.service');

const router = express.Router();

function formatDateTime() {
  return new Date().toLocaleString('pt-BR');
}

function sanitizeThermalText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/"/g, "'")
    .replace(/[^\x20-\x7E]/g, '');
}

function buildTestPrintContent(type) {
  const dateTime = sanitizeThermalText(formatDateTime());

  if (type === 'zpl') {
    return [
      '^XA',
      '^CI28',
      '^PW720',
      '^LL320',
      '^PQ1,0,1,N',
      '^FO40,35^A0N,34,34^FDCREDENCIA PRINT MANAGER^FS',
      '^FO40,90^A0N,28,28^FDTESTE DE IMPRESSAO^FS',
      `^FO40,140^A0N,24,24^FD${dateTime}^FS`,
      '^XZ'
    ].join('\r\n') + '\r\n';
  }

  if (type === 'epl') {
    return [
      'N',
      'q720',
      'Q320,24',
      'S2',
      'D10',
      'A40,35,0,4,1,1,N,"CREDENCIA PRINT MANAGER"',
      'A40,90,0,3,1,1,N,"TESTE DE IMPRESSAO"',
      `A40,140,0,2,1,1,N,"${dateTime}"`,
      'P1,1'
    ].join('\r\n') + '\r\n';
  }

  if (type === 'tspl') {
    return [
      'SIZE 90 mm,40 mm',
      'GAP 3 mm,0',
      'CLS',
      'TEXT 40,35,"3",0,1,1,"CREDENCIA PRINT MANAGER"',
      'TEXT 40,90,"3",0,1,1,"TESTE DE IMPRESSAO"',
      `TEXT 40,140,"2",0,1,1,"${dateTime}"`,
      'PRINT 1,1'
    ].join('\r\n') + '\r\n';
  }

  return [
    'CREDENCIA PRINT MANAGER',
    'TESTE DE IMPRESSAO',
    formatDateTime()
  ].join('\n');
}

router.post('/print', (req, res) => {
  const { printerName, content, type = 'text', copies = 1, maxAttempts } = req.body || {};

  if (!content || typeof content !== 'string') {
    return res.status(400).json({
      error: 'content is required and must be a string'
    });
  }

  if (!printerService.SUPPORTED_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Unsupported print type. Use: ${printerService.SUPPORTED_TYPES.join(', ')}`
    });
  }

  const job = queueService.addJob({
    printerName,
    content,
    type,
    copies,
    maxAttempts
  });

  return res.status(202).json({
    message: 'Print job queued',
    job
  });
});

router.post('/test-print', (req, res) => {
  const config = configService.getConfig();
  const type = req.body?.type || 'text';

  if (!printerService.SUPPORTED_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Unsupported print type. Use: ${printerService.SUPPORTED_TYPES.join(', ')}`
    });
  }

  const content = buildTestPrintContent(type);

  const job = queueService.addJob({
    printerName: config.defaultPrinter || config.defaultPrinterName || req.body?.printerName || 'Default Printer',
    content,
    type,
    copies: 1,
    maxAttempts: req.body?.maxAttempts
  });

  return res.status(202).json({
    message: 'Test print job queued',
    job
  });
});

module.exports = router;
