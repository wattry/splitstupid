import axios from 'axios';

/**
 * TabScanner receipt OCR client (browser).
 *
 * Two-step API: POST the image to /process to get a token, then poll
 * /result/{token} until processing finishes. In the browser we hand the cropped
 * Blob straight to FormData — no filesystem / read stream needed; axios sets the
 * multipart boundary automatically (do NOT set Content-Type manually).
 */
const client = axios.create({
  baseURL: 'https://api.tabscanner.com/api',
  headers: {
    apikey: import.meta.env.VITE_TAB_SCAN_KEY,
  },
});

// TabScanner suggests ~5s to process; wait before the first poll, then poll 1s.
const FIRST_POLL_MS = 4000;
const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 20;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Submit an image for processing.
 *
 * @param {Blob|File} image cropped receipt image
 * @param {Record<string, string>} [params] optional process params
 *        (documentType, region, decimalPlaces, cents, defaultDateParsing)
 * @returns {Promise<string>} polling token
 */
export async function process(image, params = {}) {
  const form = new FormData();
  form.append('file', image, 'receipt.jpg');
  form.append('documentType', 'receipt');
  for (const [key, value] of Object.entries(params)) {
    form.append(key, value);
  }

  const { data } = await client.post('/2/process', form);
  const token = data?.token ?? data?.results?.token;
  if (!token) {
    throw new Error(data?.message || 'TabScanner: no token returned from /process');
  }
  return token;
}

/**
 * Poll for a processing result until it is done or failed.
 *
 * @param {string} token from {@link process}
 * @returns {Promise<object>} the parsed receipt result (lineItems, total, …)
 */
export async function getResult(token) {
  await delay(FIRST_POLL_MS);

  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    const { data } = await client.get(`/result/${token}`);

    if (data.status === 'done') return data.result;
    if (data.status === 'failed') {
      throw new Error(data.message || 'TabScanner: processing failed');
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error('TabScanner: timed out waiting for result');
}

/**
 * High-level helper: image in, item prices out.
 *
 * Maps each line item to its line total (falling back to unit price) and drops
 * anything non-positive. Returns prices in receipt order — ready to join into
 * the items textarea.
 *
 * @param {Blob|File} image cropped receipt image
 * @param {(stage: 'uploading' | 'processing') => void} [onStage]
 * @returns {Promise<number[]>}
 */
export async function scanReceipt(image, onStage) {
  onStage?.('uploading');
  const token = await process(image);

  onStage?.('processing');
  const result = await getResult(token);

  const items = result?.lineItems ?? [];
  return items
    .map((item) => (Number.isFinite(item.lineTotal) ? item.lineTotal : item.price))
    .filter((n) => Number.isFinite(n) && n > 0);
}
