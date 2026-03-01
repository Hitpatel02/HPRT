const db = require('../config/db');

const SELECT_FIELDS = `
  id,
  name,
  group_id,
  email,
  gst_1,
  gst_2,
  gst_3,
  TO_CHAR(gst_1_date, 'YYYY-MM-DD') AS gst_1_date,
  TO_CHAR(gst_2_date, 'YYYY-MM-DD') AS gst_2_date,
  TO_CHAR(gst_3_date, 'YYYY-MM-DD') AS gst_3_date,
  description
`;

/**
 * Get all groups ordered by ID
 * @returns {Promise<Array>} Array of groups
 */
async function getAllGroups() {
    const result = await db.query(
        `SELECT ${SELECT_FIELDS} FROM "user".groups ORDER BY id`
    );
    return result.rows;
}

/**
 * Get a single group by ID
 * @param {number|string} id - Group ID
 * @returns {Promise<Object|null>} Group or null if not found
 */
async function getGroupById(id) {
    const result = await db.query(
        `SELECT ${SELECT_FIELDS} FROM "user".groups WHERE id = $1`,
        [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update group fields (partial update)
 * @param {number|string} id - Group ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
async function updateGroup(id, updates) {
    const validFields = [
        'gst_1', 'gst_2', 'gst_3',
        'gst_1_date', 'gst_2_date', 'gst_3_date',
        'description',
    ];

    const updateFields = [];
    const values = [];
    let index = 1;

    Object.keys(updates).forEach((key) => {
        if (validFields.includes(key)) {
            updateFields.push(`${key} = $${index}`);
            values.push(updates[key]);
            index++;
        }
    });

    if (updateFields.length === 0) {
        throw new Error('No valid updates provided');
    }

    values.push(id);
    await db.query(
        `UPDATE "user".groups SET ${updateFields.join(', ')} WHERE id = $${index}`,
        values
    );
}

/**
 * Reset all groups — clear GST status and dates
 * @returns {Promise<void>}
 */
async function resetAllGroups() {
    await db.query(
        `UPDATE "user".groups
     SET gst_1 = FALSE,
         gst_2 = FALSE,
         gst_3 = FALSE,
         gst_1_date = NULL,
         gst_2_date = NULL,
         gst_3_date = NULL`
    );
}

module.exports = {
    getAllGroups,
    getGroupById,
    updateGroup,
    resetAllGroups,
};
