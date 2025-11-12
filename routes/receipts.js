import express from 'express';
import { eq, desc } from 'drizzle-orm';
import { getDatabase, schema } from '../db/database.js';
import { getUserId } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper function to get or create user
const getOrCreateUser = async (db, auth0Id) => {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.auth0Id, auth0Id))
    .limit(1);
  
  if (!user) {
    const userId = uuidv4();
    await db.insert(schema.users).values({
      id: userId,
      auth0Id: auth0Id,
    });
    
    const [newUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.auth0Id, auth0Id))
      .limit(1);
    
    return newUser;
  }
  
  return user;
};

// POST /receipts/scan
router.post('/scan', async (req, res) => {
  try {
    const db = getDatabase();
    const auth0Id = getUserId(req);
    
    if (!auth0Id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'Missing qrData field' });
    }

    const user = await getOrCreateUser(db, auth0Id);
    const receiptId = uuidv4();

    // Insert receipt
    await db.insert(schema.receipts).values({
      id: receiptId,
      userId: user.id,
      qrData: qrData,
    });

    // TODO: Process QR data to extract amount and merchant if possible
    // For now, we'll leave them as null

    res.json({ success: true, receiptId });
  } catch (error) {
    console.error('Error submitting receipt scan:', error);
    res.status(500).json({ error: 'Failed to submit receipt scan' });
  }
});

// GET /receipts
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const auth0Id = getUserId(req);
    
    if (!auth0Id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.auth0Id, auth0Id))
      .limit(1);
    
    if (!user) {
      return res.json({ receipts: [] });
    }

    const receiptsList = await db
      .select({
        id: schema.receipts.id,
        qrData: schema.receipts.qrData,
        scannedAt: schema.receipts.scannedAt,
        amount: schema.receipts.amount,
        merchant: schema.receipts.merchant,
      })
      .from(schema.receipts)
      .where(eq(schema.receipts.userId, user.id))
      .orderBy(desc(schema.receipts.scannedAt));

    // Transform to match API response format
    const receipts = receiptsList.map(receipt => ({
      id: receipt.id,
      qrData: receipt.qrData,
      scannedAt: receipt.scannedAt?.toISOString() || receipt.scannedAt,
      amount: receipt.amount ?? undefined,
      merchant: receipt.merchant ?? undefined,
    }));

    res.json({ receipts });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

export default router;
