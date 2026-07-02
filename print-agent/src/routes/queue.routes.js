const express = require('express');
const queueService = require('../services/queue.service');

const router = express.Router();

router.get('/', (req, res) => {
  const statusValidation = queueService.validateStatus(req.query.status);

  if (!statusValidation.ok) {
    return res.status(400).json({
      error: statusValidation.error
    });
  }

  res.json({
    queue: queueService.getQueue({
      status: req.query.status
    })
  });
});

router.post('/:id/retry', (req, res) => {
  const result = queueService.retryJob(req.params.id);

  if (!result.ok) {
    return res.status(result.statusCode).json({
      error: result.error
    });
  }

  return res.json({
    message: 'Print job queued for retry',
    job: result.job
  });
});

router.post('/:id/cancel', (req, res) => {
  const result = queueService.cancelJob(req.params.id);

  if (!result.ok) {
    return res.status(result.statusCode).json({
      error: result.error
    });
  }

  return res.json({
    message: 'Print job canceled',
    job: result.job
  });
});

module.exports = router;
