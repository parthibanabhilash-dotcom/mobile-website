import './env';
import { expireReservations } from '../src/lib/commerce';
import { db } from '../src/lib/db';
expireReservations()
  .then((count) => console.log(JSON.stringify({ event: 'reservations_expired', orders: count })))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
