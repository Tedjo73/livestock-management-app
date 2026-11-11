const { FarmingTip, User } = require('../models');

/**
 * GET /api/tips
 * Public - get all published farming tips
 */
const getTips = async (req, res) => {
  try {
    const { category } = req.query;
    const where = { is_published: true };
    if (category) where.category = category;

    const tips = await FarmingTip.findAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'role'] }],
      order: [['created_at', 'DESC']],
    });

    return res.json({ tips });
  } catch (err) {
    console.error('Get tips error:', err);
    return res.status(500).json({ error: 'Failed to fetch tips.' });
  }
};

/**
 * GET /api/tips/:id
 */
const getTipById = async (req, res) => {
  try {
    const tip = await FarmingTip.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'role'] }],
    });
    if (!tip) return res.status(404).json({ error: 'Tip not found.' });
    return res.json({ tip });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tip.' });
  }
};

/**
 * POST /api/tips
 * Advisor or admin only
 */
const createTip = async (req, res) => {
  try {
    const { title, content, category, image_url } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const tip = await FarmingTip.create({
      title,
      content,
      category: category || 'general',
      author_id: req.user.id,
      image_url,
    });

    return res.status(201).json({ message: 'Tip created.', tip });
  } catch (err) {
    console.error('Create tip error:', err);
    return res.status(500).json({ error: 'Failed to create tip.' });
  }
};

/**
 * DELETE /api/tips/:id
 * Admin only
 */
const deleteTip = async (req, res) => {
  try {
    const tip = await FarmingTip.findByPk(req.params.id);
    if (!tip) return res.status(404).json({ error: 'Tip not found.' });
    await tip.destroy();
    return res.json({ message: 'Tip deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete tip.' });
  }
};

module.exports = { getTips, getTipById, createTip, deleteTip };
