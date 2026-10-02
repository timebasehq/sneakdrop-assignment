import { getDatabase } from '../apps/api/src/db/client.js';
import { InventoryService } from '../apps/api/src/services/inventory.service.js';
import { SNEAKER_ITEM_ID, INITIAL_STOCK } from '../packages/shared/src/constants.js';

console.log('🚀 Seeding SneakDrop Database...');

const db = getDatabase();
const inventoryService = new InventoryService(db);

// Reset inventory to 20 pairs
inventoryService.resetAll(SNEAKER_ITEM_ID, INITIAL_STOCK);

// Seed 10 test users
const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, purchased_count)
  VALUES (?, ?, ?, 0)
  ON CONFLICT(id) DO UPDATE SET purchased_count = 0
`);

for (let i = 1; i <= 10; i++) {
  const userId = `user_${i}`;
  const userName = `Sneakerhead #${i}`;
  const userEmail = `user${i}@sneakdrop.local`;
  insertUser.run(userId, userName, userEmail);
}

const status = inventoryService.getInventoryStatus();
console.log('✅ Database seeded successfully!');
console.log('📊 Current Inventory Status:');
console.table({
  'Item ID': status.itemId,
  'Item Name': status.name,
  'Price': `$${status.price}`,
  'Total Stock': status.totalStock,
  'Available Stock': status.availableStock,
  'Reserved Stock': status.reservedStock,
  'Sold Stock': status.soldStock,
  'Waiting in Queue': status.waitingQueueCount,
});
