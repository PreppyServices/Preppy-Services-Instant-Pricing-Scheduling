import { handleJobberBooking, type JobberEnv } from "../../../../lib/jobberBooking";

export const runtime = "nodejs";

function readEnv(): JobberEnv {
  return {
    JOBBER_SYNC_ENABLED: process.env.JOBBER_SYNC_ENABLED,
    JOBBER_CLIENT_ID: process.env.JOBBER_CLIENT_ID,
    JOBBER_CLIENT_SECRET: process.env.JOBBER_CLIENT_SECRET,
    JOBBER_REFRESH_TOKEN: process.env.JOBBER_REFRESH_TOKEN,
    JOBBER_API_VERSION: process.env.JOBBER_API_VERSION,
    BOOKING_ALERT_WEBHOOK_URL: process.env.BOOKING_ALERT_WEBHOOK_URL,
  };
}

export async function POST(request: Request): Promise<Response> {
  return handleJobberBooking(request, {
    env: readEnv(),
    fetch,
    log: (line) => {
      console.log(line);
    },
  });
}
