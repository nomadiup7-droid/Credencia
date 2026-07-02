const express = require('express');
const configService = require('../services/config.service');
const logger = require('../utils/logger');

const router = express.Router();

function publicConfig(config) {
  return {
    appName: config.appName,
    version: config.version,
    port: config.port,
    host: config.host,
    printMode: config.printMode,
    defaultPrinter: config.defaultPrinter || config.defaultPrinterName || '',
    defaultPrinterName: config.defaultPrinterName,
    queue: config.queue,
    ui: config.ui
  };
}

router.get('/', (req, res) => {
  res.json({
    config: publicConfig(configService.getConfig())
  });
});

router.patch('/default-printer', (req, res) => {
  const printerName = String(req.body?.printerName || '').trim();

  if (!printerName) {
    return res.status(400).json({
      error: 'printerName is required'
    });
  }

  const config = configService.updateConfig({
    defaultPrinter: printerName,
    defaultPrinterName: printerName
  });

  logger.info('Default printer updated', { printerName });

  return res.json({
    message: 'Default printer saved',
    config: publicConfig(config)
  });
});

module.exports = router;
