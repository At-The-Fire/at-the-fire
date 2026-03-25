const pool = require('../utils/pool');

module.exports = async (req, res, next) => {
  try {
    const sub = req.userAWSSub;
    if (!sub) {
      return res.status(403).json({
        message: 'You do not have permission: access denied',
        code: 403,
      });
    }

    const { rows } = await pool.query('SELECT is_admin FROM cognito_users WHERE sub = $1', [sub]);

    if (!rows.length || !rows[0].is_admin) {
      return res.status(403).json({
        message: 'You do not have permission: access denied',
        code: 403,
      });
    }

    next();
  } catch (e) {
    console.error('Unexpected Middleware Error:', e);
    return res.status(500).json({
      message: 'Internal Server Error',
      code: 500,
    });
  }
};
