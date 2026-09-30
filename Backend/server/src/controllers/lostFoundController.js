const LostFound = require('../models/LostFound');

// POST /api/lost-found   (any logged-in user)
const createPost = async (req, res, next) => {
  try {
    const { type, itemName, description, location, photoUrl } = req.body;

    const post = await LostFound.create({
      postedBy: req.user.id,
      type,
      itemName,
      description,
      location,
      photoUrl,
    });

    res.status(201).json({ message: 'Post created', post });
  } catch (error) {
    next(error);
  }
};

// GET /api/lost-found   (any logged-in user) - unclaimed posts, newest first
const getAllPosts = async (req, res, next) => {
  try {
    const posts = await LostFound.find({ isClaimed: false })
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ posts });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/lost-found/:id/claim   (any logged-in user - simple MVP, no verification flow)
const markClaimed = async (req, res, next) => {
  try {
    const post = await LostFound.findByIdAndUpdate(req.params.id, { isClaimed: true }, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.status(200).json({ message: 'Marked as claimed', post });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPost, getAllPosts, markClaimed };