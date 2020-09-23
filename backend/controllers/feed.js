const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');
const io = require('../socket');

module.exports = {
  //get all posts --> GET /posts
  getPosts: async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;
    try {
      totalItems = await Post.countDocuments();

      const posts = await Post.find({})
        .populate('creator')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
      res.status(200).json({ message: 'Products fetched!', posts, totalItems });
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  },
  //get a post with id --> GET /post/:postId
  getPost: async (req, res, next) => {
    const postId = req.params.postId;
    try {
      const post = await Post.findById(postId).populate('creator');
      if (!post) {
        const error = new Error('Could not find post');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ message: 'Post found', post });
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  },
  getStatus: async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        const error = new Error('Not Authorized');
        error.statusCode = 403;
        throw error;
      }
      res
        .status(200)
        .json({ message: 'Fetched status successfully', status: user.status });
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  },
  setStatus: async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        const error = new Error('Not Authorized');
        error.statusCode = 403;
        throw error;
      }
      const { status } = req.body;
      user.status = status;
      await user.save();
      res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  },
  // upload a post --> POST /post
  createPost: async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const error = new Error('Validation Failed, Please check entered data');
      error.statusCode = 422;
      next(error);
    }

    if (!req.file) {
      const error = new Error('No image provided');
      error.statusCode = 422;
      next(error);
    }

    const imageUrl = req.file.path.split('/backend/')[1];
    const { title, content } = req.body;
    const post = new Post({
      title,
      content,
      imageUrl,
      creator: req.userId,
    });
    try {
      const result = await post.save();
      const user = await User.findById(req.userId);
      user.posts.push(post);
      await user.save();
      io.getIO().emit('posts', {
        action: 'create',
        post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
      });
      res.status(201).json({
        message: 'Post created successfully!',
        post: result,
        creator: { _id: user._id, name: user.name },
      });
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  },
  //edit a post --> PUT /post/postId
  editPost: async (req, res, next) => {
    const postId = req.params.postId;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const error = new Error('Validation Failed, Please check entered data');
      error.statusCode = 422;
      next(error);
    }

    const { title, content } = req.body;
    let imageUrl = req.body.image;
    if (req.file) {
      imageUrl = req.file.path.split('/backend/')[1];
    }
    if (!imageUrl) {
      const error = new Error('No file chosen');
      error.statusCode = 422;
      next(error);
    }
    try {
      const post = await Post.findById(postId).populate('creator');
      if (!post) {
        const error = new Error('Could not find post');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator._id.toString() !== req.userId) {
        const error = new Error('Not Authorized');
        error.statusCode = 403;
        throw error;
      }
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;

      const result = await post.save();

      io.getIO().emit('posts', { action: 'update', post: result });

      res.status(200).json({
        message: 'Post updated successfully',
        post,
      });
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  },
  //Delete a post --> DELETE /post/postId
  deletePost: async (req, res, next) => {
    const postId = req.params.postId;
    try {
      const post = await Post.findById(postId);
      if (!post) {
        const error = new Error('Could not find post');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not Authorized');
        error.statusCode = 403;
        throw error;
      }
      clearImage(post.imageUrl);
      await Post.findByIdAndDelete(postId);

      const user = await User.findById(req.userId);
      user.posts.pull(postId);
      await user.save();

      io.getIO().emit('posts', { action: 'delete', post: postId });

      res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  },
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
