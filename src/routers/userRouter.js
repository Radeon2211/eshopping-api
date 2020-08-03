const express = require('express');
const User = require('../models/userModel');
const auth = require('../middleware/auth');
const router = new express.Router();

router.post('/users', async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    const token = await user.generateAuthToken();
    res.cookie('token', token, { httpOnly: true });
    res.status(201).send({ user });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password);
    const token = await user.generateAuthToken();
    res.cookie('token', token, { httpOnly: true });
    res.send({ user });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(({ token }) => token !== req.token);
    await req.user.save();
    res.send();
  } catch (err) {
    res.status(500).send();
  }
});

router.get('/users/me', auth, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id }).populate('cart.product');
    res.send({ user });
  } catch (err) {
    res.status(500).send();
  }

});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send();
    }
    const publicProfile = user.getPublicProfile();
    res.send(publicProfile);
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/users/me', auth, async (req, res) => {
  let updates = Object.keys(req.body);
  const allowedUpdates = ['email', 'password', 'firstName', 'lastName', 'street', 'zipCode', 'country', 'city', 'phone', 'contacts'];
  try {
    if (updates.includes('email') || updates.includes('password')) {
      updates = await req.user.checkCurrentCredentials(updates, req.body);
    }
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
      return res.status(400).send({ message: `You can't change these data` });
    }
    updates.forEach((update) => {
      req.user[update] = req.body[update];
    });
    await req.user.save();
    res.send(req.user);
  } catch (err) {
    res.status(400).send(err);
  }
});

router.patch('/users/single-user', auth, async (req, res) => {
  const role = req.body.role;
  try {
    if (req.user.role !== 'admin') {
      throw new Error({ message: 'You are not able to do that' });
    }
    const user = await User.findOne({ email: req.body.email });
    if (!role && user.role) {
      user.role = undefined;
    }
    if (role) {
      user.role = role;
    }
    await user.save();
    res.send();
  } catch (err) {
    res.status(400).send(err);
  }
});

router.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.remove();
    res.send(req.user);
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;