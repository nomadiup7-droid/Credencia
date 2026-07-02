const printerService = require('./printer.service');
const configService = require('./config.service');
const logger = require('../utils/logger');

const VALID_STATUSES = ['pending', 'printing', 'printed', 'error', 'canceled'];
const queue = [];
let isProcessing = false;

function createId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function getDefaultMaxAttempts() {
  const config = configService.getConfig();
  return Math.max(Number(config.queue?.maxAttempts || 3), 1);
}

function serializeJob(job) {
  return {
    id: job.id,
    printerName: job.printerName,
    content: job.content,
    type: job.type,
    copies: job.copies,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    printedAt: job.printedAt,
    errorMessage: job.errorMessage
  };
}

function getQueue(filters = {}) {
  let rows = queue;

  if (filters.status) {
    rows = rows.filter(job => job.status === filters.status);
  }

  return rows.map(serializeJob);
}

function validateStatus(status) {
  if (!status) {
    return { ok: true };
  }

  if (!VALID_STATUSES.includes(status)) {
    return {
      ok: false,
      error: `Invalid status filter. Use: ${VALID_STATUSES.join(', ')}`
    };
  }

  return { ok: true };
}

function normalizeJobInput(data) {
  return {
    printerName: data.printerName || '',
    content: data.content,
    type: data.type || 'text',
    copies: Math.max(Number(data.copies || 1), 1),
    maxAttempts: Math.max(Number(data.maxAttempts || getDefaultMaxAttempts()), 1)
  };
}

function addJob(data) {
  const normalized = normalizeJobInput(data);
  const createdAt = now();
  const job = {
    id: createId(),
    printerName: normalized.printerName,
    content: normalized.content,
    type: normalized.type,
    copies: normalized.copies,
    status: 'pending',
    attempts: 0,
    maxAttempts: normalized.maxAttempts,
    createdAt,
    updatedAt: createdAt,
    printedAt: null,
    errorMessage: null
  };

  queue.push(job);
  logger.queueAdded(job);
  scheduleProcessing();

  return serializeJob(job);
}

function findJob(id) {
  return queue.find(job => job.id === id);
}

function retryJob(id) {
  const job = findJob(id);

  if (!job) {
    return {
      ok: false,
      statusCode: 404,
      error: 'Print job not found'
    };
  }

  if (!['error', 'printed'].includes(job.status)) {
    return {
      ok: false,
      statusCode: 409,
      error: 'Only jobs with error or printed status can be retried'
    };
  }

  if (job.status === 'error' && job.attempts >= job.maxAttempts) {
    return {
      ok: false,
      statusCode: 409,
      error: 'Maximum print attempts reached'
    };
  }

  job.status = 'pending';
  job.errorMessage = null;
  job.printedAt = null;
  job.updatedAt = now();
  logger.queueRetry(job);
  scheduleProcessing();

  return {
    ok: true,
    job: serializeJob(job)
  };
}

function cancelJob(id) {
  const job = findJob(id);

  if (!job) {
    return {
      ok: false,
      statusCode: 404,
      error: 'Print job not found'
    };
  }

  if (!['pending', 'error'].includes(job.status)) {
    return {
      ok: false,
      statusCode: 409,
      error: 'Only jobs with pending or error status can be canceled'
    };
  }

  job.status = 'canceled';
  job.updatedAt = now();
  logger.queueCanceled(job);

  return {
    ok: true,
    job: serializeJob(job)
  };
}

function scheduleProcessing() {
  const config = configService.getConfig();

  if (!config.queue?.autoProcess) {
    return;
  }

  setTimeout(processQueue, 0);
}

async function processQueue() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    let nextJob = queue.find(job => job.status === 'pending');

    while (nextJob) {
      await processJob(nextJob);
      nextJob = queue.find(job => job.status === 'pending');
    }
  } finally {
    isProcessing = false;
  }
}

async function processJob(job) {
  if (job.status !== 'pending') {
    return;
  }

  try {
    job.status = 'printing';
    job.attempts += 1;
    job.updatedAt = now();
    logger.printStarted(job);

    for (let copy = 0; copy < job.copies; copy += 1) {
      await printerService.sendToPrinter(job, { copy: copy + 1 });
    }

    job.status = 'printed';
    job.printedAt = now();
    job.updatedAt = job.printedAt;
    job.errorMessage = null;
    logger.printSuccess(job);
  } catch (error) {
    job.status = 'error';
    job.errorMessage = error.message;
    job.updatedAt = now();
    logger.printError(job, error);
  }
}

module.exports = {
  addJob,
  cancelJob,
  getQueue,
  processQueue,
  retryJob,
  validateStatus,
  VALID_STATUSES
};
