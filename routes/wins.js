import express from 'express';
import { desc, sql } from 'drizzle-orm';
import { getDatabase, schema } from '../db/database.js';

const router = express.Router();

// GET /wins/recent
router.get('/recent', async (req, res) => {
  try {
    const db = getDatabase();
    const limit = parseInt(req.query.limit) || 10;
    
    // Get recent wins with user information
    const winsList = await db
      .select({
        id: schema.wins.id,
        userId: schema.wins.userId,
        userName: sql<string>`COALESCE(${schema.personalInfo.fullName}, 'Anonymous')`.as('userName'),
        amount: schema.wins.amount,
        wonAt: schema.wins.wonAt,
      })
      .from(schema.wins)
      .leftJoin(schema.users, sql`${schema.wins.userId} = ${schema.users.id}`)
      .leftJoin(schema.personalInfo, sql`${schema.users.id} = ${schema.personalInfo.userId}`)
      .orderBy(desc(schema.wins.wonAt))
      .limit(limit);

    // Transform to match API response format
    const wins = winsList.map(win => ({
      id: win.id,
      userId: win.userId,
      userName: win.userName,
      amount: win.amount,
      wonAt: win.wonAt?.toISOString() || win.wonAt,
    }));

    res.json({ wins });
  } catch (error) {
    console.error('Error fetching recent wins:', error);
    res.status(500).json({ error: 'Failed to fetch recent wins' });
  }
});

export default router;
