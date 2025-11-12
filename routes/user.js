import express from 'express';
import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../db/database.js';
import { getUserId } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { sql } from 'drizzle-orm';

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

// GET /user/signup-status
router.get('/signup-status', async (req, res) => {
  try {
    const db = getDatabase();
    const auth0Id = getUserId(req);
    
    if (!auth0Id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await getOrCreateUser(db, auth0Id);
    
    // Check if user has completed personal info and address
    const [personalInfo] = await db
      .select()
      .from(schema.personalInfo)
      .where(eq(schema.personalInfo.userId, user.id))
      .limit(1);
    
    const [address] = await db
      .select()
      .from(schema.addresses)
      .where(eq(schema.addresses.userId, user.id))
      .limit(1);
    
    const signupCompleted = !!(personalInfo && address);
    
    res.json({ signupCompleted });
  } catch (error) {
    console.error('Error checking signup status:', error);
    res.status(500).json({ error: 'Failed to check signup status' });
  }
});

// POST /user/personal-info
router.post('/personal-info', async (req, res) => {
  try {
    const db = getDatabase();
    const auth0Id = getUserId(req);
    
    if (!auth0Id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { fullName, dateOfBirth, email, phone } = req.body;

    // Validation
    if (!fullName || !dateOfBirth || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await getOrCreateUser(db, auth0Id);

    // Check if personal info already exists
    const [existing] = await db
      .select()
      .from(schema.personalInfo)
      .where(eq(schema.personalInfo.userId, user.id))
      .limit(1);
    
    if (existing) {
      // Update existing
      await db
        .update(schema.personalInfo)
        .set({
          fullName,
          dateOfBirth,
          email,
          phone,
          updatedAt: sql`NOW()`,
        })
        .where(eq(schema.personalInfo.userId, user.id));
    } else {
      // Insert new
      await db.insert(schema.personalInfo).values({
        userId: user.id,
        fullName,
        dateOfBirth,
        email,
        phone,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting personal info:', error);
    res.status(500).json({ error: 'Failed to submit personal info' });
  }
});

// POST /user/address
router.post('/address', async (req, res) => {
  try {
    const db = getDatabase();
    const auth0Id = getUserId(req);
    
    if (!auth0Id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { streetAddress, building, apartment, zip, city, stateRegion } = req.body;

    // Validation
    if (!streetAddress || !zip || !city || !stateRegion) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await getOrCreateUser(db, auth0Id);

    // Check if address already exists
    const [existing] = await db
      .select()
      .from(schema.addresses)
      .where(eq(schema.addresses.userId, user.id))
      .limit(1);
    
    if (existing) {
      // Update existing
      await db
        .update(schema.addresses)
        .set({
          streetAddress,
          building: building || null,
          apartment: apartment || null,
          zip,
          city,
          stateRegion,
          updatedAt: sql`NOW()`,
        })
        .where(eq(schema.addresses.userId, user.id));
    } else {
      // Insert new
      await db.insert(schema.addresses).values({
        userId: user.id,
        streetAddress,
        building: building || null,
        apartment: apartment || null,
        zip,
        city,
        stateRegion,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting address:', error);
    res.status(500).json({ error: 'Failed to submit address' });
  }
});

export default router;
