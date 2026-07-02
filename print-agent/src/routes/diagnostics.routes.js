const express = require('express');
const windowsPrinterService = require('../services/windows-printer.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const diagnostics = await windowsPrinterService.getDiagnostics();
    res.json(diagnostics);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
