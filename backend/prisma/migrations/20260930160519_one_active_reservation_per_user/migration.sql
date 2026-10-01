CREATE UNIQUE INDEX "Reservation_one_active_per_user" ON "Reservation" ("userId") WHERE "status" = 'ACTIVE';
