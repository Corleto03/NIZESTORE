import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export function getDeviceId(): string {
  const cookieStore = cookies();
  const deviceIdCookie = cookieStore.get('nizestore_device_id');

  if (deviceIdCookie) {
    return deviceIdCookie.value;
  }

  // If we are in a server action or route handler that can set cookies:
  const newDeviceId = uuidv4();
  // Note: calling set in server components throws, this should ideally be handled in middleware.
  return newDeviceId;
}
