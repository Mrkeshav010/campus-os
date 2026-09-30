const MessMenu = require('../models/MessMenu');

// POST /api/mess   (admin only) - set/update a day's menu
const upsertDayMenu = async (req, res, next) => {
  try {
    const { day, breakfast, lunch, dinner } = req.body;

    const menu = await MessMenu.findOneAndUpdate(
      { day },
      { day, breakfast, lunch, dinner },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'Menu saved', menu });
  } catch (error) {
    next(error);
  }
};

// GET /api/mess   (everyone) - full week's menu
const getWeekMenu = async (req, res, next) => {
  try {
    const menu = await MessMenu.find().sort({ day: 1 });
    res.status(200).json({ menu });
  } catch (error) {
    next(error);
  }
};

// POST /api/mess/:day/rate   (student only)
const rateMeal = async (req, res, next) => {
  try {
    const { meal, rating } = req.body; // meal: 'breakfast' | 'lunch' | 'dinner'

    const menu = await MessMenu.findOneAndUpdate(
      { day: req.params.day },
      { $push: { ratings: { student: req.user.id, meal, rating } } },
      { new: true }
    );

    if (!menu) return res.status(404).json({ message: 'Menu for this day not found' });
    res.status(200).json({ message: 'Rating submitted' });
  } catch (error) {
    next(error);
  }
};

// GET /api/mess/analytics   (admin only) - average rating per meal
const getMessAnalytics = async (req, res, next) => {
  try {
    const menus = await MessMenu.find();
    const breakdown = menus.map((m) => {
      const avg = (meal) => {
        const ratings = m.ratings.filter((r) => r.meal === meal).map((r) => r.rating);
        return ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
      };
      return {
        day: m.day,
        breakfastAvg: avg('breakfast'),
        lunchAvg: avg('lunch'),
        dinnerAvg: avg('dinner'),
      };
    });
    res.status(200).json({ breakdown });
  } catch (error) {
    next(error);
  }
};

module.exports = { upsertDayMenu, getWeekMenu, rateMeal, getMessAnalytics };