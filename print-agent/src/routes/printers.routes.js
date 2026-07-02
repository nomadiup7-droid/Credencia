const express = require('express');
const printerService = require('../services/printer.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const printers = await printerService.listPrinters();
    res.json({ printers });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
