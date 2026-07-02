const express = require('express');
const configService = require('../services/config.service');

const router = express.Router();

router.get('/', (req, res) => {
  const config = configService.getConfig();

  res.json({
    status: 'online',
    app: 'Credencia Print Manager',
    version: config.version,
    port: config.port
  });
});

module.exports = router;
