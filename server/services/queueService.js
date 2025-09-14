
const logger = require('../utils/logger') || console;

/**
 * Job shape:
 * {
 *   id: string,
 *   type: 'ocr' | 'import',
 *   data: any,
 *   attempts: number,
 *   maxAttempts: number,
 *   nextRunAt: number (timestamp ms),
 *   backoffMs: number
 * }
 */

const JOB_POLL_INTERVAL_MS = 1000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_BASE = 2000; // ms

const jobQueue = [];
let running = false;
let jobCounter = 0;

// Add a job to in-memory queue
function pushJob(type, data, opts = {}) {
  const job = {
    id: `local-${++jobCounter}-${Date.now()}`,
    type,
    data,
    attempts: 0,
    maxAttempts: opts.maxAttempts || DEFAULT_MAX_ATTEMPTS,
    backoffMs: opts.backoffMs || DEFAULT_BACKOFF_BASE,
    nextRunAt: Date.now()
  };
  jobQueue.push(job);
  logger.info(`[queue] job queued: ${job.id} type=${type}`);
  return job;
}

// Convenience wrappers: mirror the earlier API names
async function queueOCRJob(data, opts = {}) {
  return pushJob('ocr', data, opts);
}
async function queueImportJob(data, opts = {}) {
  return pushJob('import', data, opts);
}

// Core processor: you should provide handler functions when starting the worker
async function processJobOnce(job, handlers) {
  try {
    job.attempts += 1;
    logger.info(`[worker] processing job ${job.id} (attempt ${job.attempts})`);
    if (job.type === 'ocr' && typeof handlers.processOCR === 'function') {
      await handlers.processOCR(job.data);
    } else if (job.type === 'import' && typeof handlers.processImport === 'function') {
      await handlers.processImport(job.data);
    } else {
      throw new Error(`No handler for job type ${job.type}`);
    }
    logger.info(`[worker] job ${job.id} completed`);
    return { ok: true };
  } catch (err) {
    logger.error(`[worker] job ${job.id} failed:`, err);
    if (job.attempts < job.maxAttempts) {
      // exponential backoff
      job.nextRunAt = Date.now() + job.backoffMs * Math.pow(2, job.attempts - 1);
      logger.info(`[worker] job ${job.id} will retry at ${new Date(job.nextRunAt).toISOString()}`);
      return { ok: false, retry: true };
    } else {
      logger.error(`[worker] job ${job.id} reached max attempts (${job.maxAttempts})`);
      return { ok: false, retry: false };
    }
  }
}

// Background poller loop
function startLocalWorker(handlers = {}) {
  if (running) return;
  running = true;
  logger.info('[worker] starting local in-memory worker');

  const loop = async () => {
    if (!running) return;

    // find next runnable job (earliest nextRunAt)
    const now = Date.now();
    let idx = -1;
    let minTime = Infinity;
    for (let i = 0; i < jobQueue.length; i++) {
      if (jobQueue[i].nextRunAt <= now && jobQueue[i].nextRunAt < minTime) {
        minTime = jobQueue[i].nextRunAt;
        idx = i;
      }
    }

    if (idx >= 0) {
      const job = jobQueue.splice(idx, 1)[0];
      const res = await processJobOnce(job, handlers);
      if (!res.ok && res.retry) {
        // push back to queue for retry
        jobQueue.push(job);
      } else if (!res.ok && !res.retry) {
        if (typeof handlers.onFailed === 'function') {
          try { await handlers.onFailed(job); } catch (e) { logger.error(e); }
        }
      }
      // immediately continue loop
      setImmediate(loop);
      return;
    }

    // no runnable job now - wait and poll again
    setTimeout(loop, JOB_POLL_INTERVAL_MS);
  };

  // start loop
  setImmediate(loop);
}

// Stop the worker loop
function stopLocalWorker() {
  running = false;
  logger.info('[worker] stopped local in-memory worker');
}

// Export API
module.exports = {
  queueOCRJob,
  queueImportJob,
  startLocalWorker,
  stopLocalWorker
};
