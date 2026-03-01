const { logger } = require('../utils/logger');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authQueries = require("../queries/authQueries");

/**
 * @desc    Authenticate admin user & get token
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await authQueries.getUserByEmail(email);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        let validPassword = false;

        if (user.password_hash.startsWith('$2')) {
            validPassword = await bcrypt.compare(password, user.password_hash);
        } else {
            // Legacy plain-text password — upgrade to bcrypt on successful match
            validPassword = password === user.password_hash;
            if (validPassword) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                await authQueries.updateUserPassword(user.id, hashedPassword);
            }
        }

        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        await authQueries.updateLastLogin(user.id);

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email },
        });
    } catch (error) {
        logger.error('Error in login:', error);
        next(error);
    }
};

/**
 * @desc    Get all admin users
 */
exports.getUsers = async (req, res, next) => {
    try {
        const users = await authQueries.getAllUsers();
        res.json(users);
    } catch (error) {
        logger.error('Error fetching users:', error);
        next(error);
    }
};

/**
 * @desc    Delete an admin user
 */
exports.deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const userCount = await authQueries.getUserCount();
        if (userCount <= 1) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete the only admin user. Create another admin user first.',
            });
        }

        if (req.user.id.toString() === id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account while logged in.',
            });
        }

        const deleted = await authQueries.deleteUser(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        logger.error('Error deleting user:', error);
        next(error);
    }
};

/**
 * @desc    Create a new admin user
 */
exports.createUser = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
        }

        if (await authQueries.usernameExists(username)) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        if (await authQueries.emailExists(email)) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await authQueries.createUser({ username, email, hashedPassword });

        res.status(201).json({ success: true, message: 'User created successfully', user: newUser });
    } catch (error) {
        logger.error('Error creating user:', error);
        next(error);
    }
};

/**
 * @desc    Update an admin user
 */
exports.updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { username, email } = req.body;

        if (!username || !email) {
            return res.status(400).json({ success: false, message: 'Username and email are required' });
        }

        const existingUser = await authQueries.getUserById(id);
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (username !== existingUser.username && await authQueries.usernameExists(username)) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        if (email !== existingUser.email && await authQueries.emailExists(email)) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const updatedUser = await authQueries.updateUser(id, { username, email });

        res.json({ success: true, message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        logger.error('Error updating user:', error);
        next(error);
    }
};

/**
 * @desc    Change password
 */
exports.changePassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required' });
        }

        if (req.user.id.toString() !== id && !req.user.isAdmin) {
            return res.status(403).json({ success: false, message: "Not authorized to change this user's password" });
        }

        const user = await authQueries.getUserById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await authQueries.changePassword(id, hashedPassword);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Error changing password:', error);
        next(error);
    }
};

/**
 * @desc    Verify user token and return user information
 */
exports.verifyToken = async (req, res, next) => {
    try {
        const user = await authQueries.getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email },
        });
    } catch (error) {
        logger.error('Error in verify-auth:', error);
        next(error);
    }
};