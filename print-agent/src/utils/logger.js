function timestamp() {
  return new Date().toISOString();
}

function info(message, data) {
  if (data) {
    console.log(`[${timestamp()}] [INFO] ${message}`, data);
    return;
  }

  console.log(`[${timestamp()}] [INFO] ${message}`);
}

function warn(message, data) {
  if (data) {
    console.warn(`[${timestamp()}] [WARN] ${message}`, data);
    return;
  }

  console.warn(`[${timestamp()}] [WARN] ${message}`);
}

function error(message, data) {
  if (data) {
    console.error(`[${timestamp()}] [ERROR] ${message}`, data);
    return;
  }

  console.error(`[${timestamp()}] [ERROR] ${message}`);
}

function queueAdded(job) {
  info(`Queue item added: ${job.id}`, {
    printerName: job.printerName,
    type: job.type,
    copies: job.copies,
    maxAttempts: job.maxAttempts
  });
}

function printStarted(job) {
  info(`Print started: ${job.id}`, {
    attempt: job.attempts,
    maxAttempts: job.maxAttempts,
    printerName: job.printerName,
    type: job.type
  });
}

function printSuccess(job) {
  info(`Print success: ${job.id}`, {
    attempts: job.attempts,
    printedAt: job.printedAt
  });
}

function printError(job, data) {
  error(`Print error: ${job.id}`, {
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    message: data.message
  });
}

function queueRetry(job) {
  info(`Queue retry requested: ${job.id}`, {
    attempts: job.attempts,
    maxAttempts: job.maxAttempts
  });
}

function queueCanceled(job) {
  warn(`Queue item canceled: ${job.id}`, {
    attempts: job.attempts,
    status: job.status
  });
}

module.exports = {
  queueAdded,
  queueCanceled,
  queueRetry,
  printError,
  printStarted,
  printSuccess,
  info,
  warn,
  error
};
