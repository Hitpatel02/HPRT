const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { 
    getGroups, 
    getGroupById, 
    updateGroup, 
    resetGroups 
} = require("../controllers/groupController");
const router = express.Router();

/**
 * @route   GET /api/groups
 * @desc    Get all groups with GST status
 * @access  Private
 */
router.get("/", authenticateToken, getGroups);

/**
 * @route   GET /api/groups/:id
 * @desc    Get a single group by ID
 * @access  Private
 */
router.get("/:id", authenticateToken, getGroupById);

/**
 * @route   PATCH /api/groups/:id
 * @desc    Update group GST status and dates (partial update)
 * @access  Private
 */
router.patch("/:id", authenticateToken, updateGroup);

/**
 * @route   POST /api/groups/reset
 * @desc    Reset all groups' GST status
 * @access  Private
 */
router.post("/reset", authenticateToken, resetGroups);

module.exports = router;
