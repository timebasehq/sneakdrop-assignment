import { DBWrapper } from '../db/client.js';
import { EXPIRY_WORKER_INTERVAL_MS } from '@sneakdrop/shared';
import { ReservationService } from '../services/reservation.service.js';

export class ReservationExpiryWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    private db: DBWrapper,
    private reservationService: ReservationService,
    private intervalMs: number = EXPIRY_WORKER_INTERVAL_MS
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public tick(): number {
    try {
      const expiredList = this.db.prepare(`
        SELECT id FROM reservations
        WHERE status = 'ACTIVE' AND datetime(expires_at) <= datetime('now')
      `).all() as unknown as { id: string }[];

      for (const item of expiredList) {
        this.reservationService.expireHold(item.id);
      }

      return expiredList.length;
    } catch (err) {
      console.error('[ReservationExpiryWorker] Error during expiration tick:', err);
      return 0;
    }
  }
}
