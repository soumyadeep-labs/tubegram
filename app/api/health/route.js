import { jsonResponse } from '../../../lib/http.js';
import { APP_VERSION } from '../../../lib/version.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return jsonResponse({
    status: 'ok',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
}
