const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

module.exports = {
  postSignup: async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation Failed!');
      error.statusCode = 422;
      next(error);
    }
    const { email, name, password } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
        email,
        password: hashedPassword,
        name,
      });
      await user.save();
      res.status(200).json({ message: 'User Created!' });
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  },
  postLogin: async (req, res, next) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 401;
        throw error;
      }

      bcrypt
        .compare(password, user.password)
        .then((isEqual) => {
          if (!isEqual) {
            const error = new Error('User not found');
            error.statusCode = 401;
            throw error;
          }
          const token = jwt.sign(
            { email: user.email, userId: user._id.toString() },
            'mySecretest$ecre+',
            { expiresIn: '1h' }
          );
          res.status(200).json({ token, userId: user._id.toString() });
        })
        .catch((error) => {
          error.statusCode = error.statusCode || 500;
          next(error);
        });
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  },
};
