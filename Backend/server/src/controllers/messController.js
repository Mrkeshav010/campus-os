const MessDay = require('../models/MessDay');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'dinner'];

const cleanMeal = (m) => ({
  items: String(m?.items || '').trim().slice(0, 300),
  time: String(m?.time || '').trim().slice(0, 40),
});

// GET /api/mess   (student + warden) - always returns all 7 days
const getMenu = async (req, res, next) => {
  try {
    const docs = (await MessDay.find()).map((d) => d.toObject());
    const byDay = Object.fromEntries(docs.map((d) => [d.day, d]));
    const blank = { items: '', time: '' };

    const menu = DAYS.map((day) => ({
      day,
      breakfast: byDay[day]?.breakfast || blank,
      lunch: byDay[day]?.lunch || blank,
      dinner: byDay[day]?.dinner || blank,
    }));

    const updatedAt = docs.reduce((latest, d) => (!latest || d.updatedAt > latest ? d.updatedAt : latest), null);
    res.status(200).json({ menu, updatedAt });
  } catch (error) {
    next(error);
  }
};

// PUT /api/mess   (warden only) body: { menu: [{ day, breakfast, lunch, dinner }] }
const saveMenu = async (req, res, next) => {
  try {
    const incoming = req.body?.menu;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ message: 'Menu is required' });
    }

    const ops = [];
    for (const entry of incoming) {
      if (!DAYS.includes(entry?.day)) {
        return res.status(400).json({ message: 'Invalid day in menu' });
      }
      const set = { updatedBy: req.user._id };
      for (const meal of MEALS) set[meal] = cleanMeal(entry[meal]);
      ops.push({ updateOne: { filter: { day: entry.day }, update: { $set: set }, upsert: true } });
    }

    await MessDay.bulkWrite(ops);
    res.status(200).json({ message: 'Mess menu updated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMenu, saveMenu };