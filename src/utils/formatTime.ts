import * as dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const toLocalTime = (epoch: number, timezone: string = 'Europe/Berlin') => {
  return dayjs.unix(epoch).tz(timezone).format('HH:mm:ss');
};
