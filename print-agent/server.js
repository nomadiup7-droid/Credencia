const express = require('express');
const cors = require('cors');

const healthRoutes = require('./src/routes/health.routes');
const printersRoutes = require('./src/routes/printers.routes');
const printRoutes = require('./src/routes/print.routes');
const queueRoutes = require('./src/routes/queue.routes');
const configRoutes = require('./src/routes/config.routes');
const diagnosticsRoutes = require('./src/routes/diagnostics.routes');
const configService = require('./src/services/config.service');
const logger = require('./src/utils/logger');

const config = configService.getConfig();
const app = express();

app.use(cors({ origin: config.cors.origin || '*' }));
app.use(express.json({ limit: '2mb' }));

app.use('/health', healthRoutes);
app.use('/printers', printersRoutes);
app.use('/', printRoutes);
app.use('/queue', queueRoutes);
app.use('/config', configRoutes);
app.use('/diagnostics', diagnosticsRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

app.use((error, req, res, next) => {
  logger.error('Unhandled API error', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

app.listen(config.port, config.host, () => {
  logger.info('Credencia Print Manager running');
  logger.info(`Endpoint: http://localhost:${config.port}`);
  logger.info(`Host: ${config.host}`);
  logger.info(`Print mode: ${config.printMode}`);
});
