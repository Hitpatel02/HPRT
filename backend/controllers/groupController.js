const { logger } = require('../utils/logger');
const groupQueries = require('../queries/groupQueries');

/**
 * @desc    Get all groups with GST status
 */
exports.getGroups = async (req, res, next) => {
    try {
        const groups = await groupQueries.getAllGroups();
        res.json(groups);
    } catch (error) {
        logger.error('Error fetching groups:', error);
        next(error);
    }
};

/**
 * @desc    Get a single group by ID
 */
exports.getGroupById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const group = await groupQueries.getGroupById(id);

        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        res.json(group);
    } catch (error) {
        logger.error('Error fetching group:', error);
        next(error);
    }
};

/**
 * @desc    Update group GST status and dates (partial update)
 */
exports.updateGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        await groupQueries.updateGroup(id, updates);
        res.json({ success: true, message: 'Group updated successfully' });
    } catch (error) {
        if (error.message === 'No valid updates provided') {
            return res.status(400).json({ success: false, message: error.message });
        }
        logger.error('Error updating group:', error);
        next(error);
    }
};

/**
 * @desc    Reset all groups' GST status
 */
exports.resetGroups = async (req, res, next) => {
    try {
        await groupQueries.resetAllGroups();
        res.json({ success: true, message: 'All groups reset successfully' });
    } catch (error) {
        logger.error('Error resetting groups:', error);
        next(error);
    }
};