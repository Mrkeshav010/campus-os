const express = require('express');
const router = express.Router();
const { createPost, getAllPosts, markClaimed } = require('../controllers/lostFoundController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createPost);
router.get('/', protect, getAllPosts);
router.patch('/:id/claim', protect, markClaimed);

module.exports = router;