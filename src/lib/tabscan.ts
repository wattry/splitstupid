import axios from 'axios';

interface TabScanLineItem {
  lineTotal?: number;
  price?: number;
}

interface TabScanResult {
  lineItems?: TabScanLineItem[];
  total?: number;
}

interface ProcessResponse {
  token?: string;
  message?: string;
  results?: { token?: string };
}

interface ResultResponse {
  status: string;
  result: TabScanResult;
  message?: string;
}

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

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Submit an image for processing.
 *
 * @param image cropped receipt image
 * @param params optional process params
 *        (documentType, region, decimalPlaces, cents, defaultDateParsing)
 * @returns polling token
 */
export async function process(image: Blob | File, params: Record<string, string> = {}): Promise<string> {
  const form = new FormData();
  form.append('file', image, 'receipt.jpg');
  form.append('documentType', 'receipt');
  for (const [key, value] of Object.entries(params)) {
    form.append(key, value);
  }

  const { data } = await client.post<ProcessResponse>('/2/process', form);
  const token = data?.token ?? data?.results?.token;
  if (!token) {
    throw new Error(data?.message || 'TabScanner: no token returned from /process');
  }
  return token;
}

/**
 * Poll for a processing result until it is done or failed.
 *
 * @param token from {@link process}
 * @returns the parsed receipt result (lineItems, total, …)
 */
export async function getResult(token: string): Promise<TabScanResult> {
  await delay(FIRST_POLL_MS);

  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    const { data } = await client.get<ResultResponse>(`/result/${token}`);

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
 * @param image cropped receipt image
 * @param onStage progress callback
 */
export async function scanReceipt(
  image: Blob | File,
  onStage?: (stage: 'uploading' | 'processing') => void
): Promise<number[]> {
  onStage?.('uploading');
  const token = await process(image);

  onStage?.('processing');
  const result = await getResult(token);

  const items = result?.lineItems ?? [];
  return items
    .map((item) => (Number.isFinite(item.lineTotal) ? item.lineTotal : item.price))
    .filter((n): n is number => n != null && Number.isFinite(n) && n > 0);
}
