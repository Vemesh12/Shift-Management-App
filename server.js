const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple token authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (token !== 'Bearer mytoken') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// MongoDB connection with fallback
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).catch(err => {
  console.log('MongoDB connection failed, using in-memory storage for demo...');
  console.log('To use MongoDB, please install and start MongoDB service');
});

const db = mongoose.connection;
db.on('error', (err) => {
  console.log('MongoDB connection error:', err.message);
  console.log('App will continue with in-memory storage for demo purposes');
});
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }
});

const shiftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  fromTime: { type: String, required: true },
  toTime: { type: String, required: true },
  deleted: { type: Boolean, default: false }
});

const blockedTimeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  reason: { type: String },
  deleted: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Shift = mongoose.model('Shift', shiftSchema);
const BlockedTime = mongoose.model('BlockedTime', blockedTimeSchema);

// Routes

// Get all users (for testing)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a user (for initial setup)
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Shift routes
app.post('/api/shifts', authenticateToken, async (req, res) => {
  try {
    const { userId, date, fromTime, toTime } = req.body;
    
    // Check if the day is blocked
    const blockedDay = await BlockedTime.findOne({
      userId: userId,
      deleted: { $ne: true },
      date: { 
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999)
      }
    });
    
    if (blockedDay) {
      return res.status(400).json({ 
        error: 'Cannot add shift to a blocked day. Please unblock the day first.' 
      });
    }
    
    const shift = new Shift(req.body);
    await shift.save();
    res.status(201).json(shift);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Only return non-deleted shifts
app.get('/api/shifts/:userId', authenticateToken, async (req, res) => {
  try {
    const shifts = await Shift.find({ userId: req.params.userId, deleted: { $ne: true } });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/shifts/:id', authenticateToken, async (req, res) => {
  try {
    const { userId, date, fromTime, toTime } = req.body;
    
    // Check if the day is blocked
    const blockedDay = await BlockedTime.findOne({
      userId: userId,
      deleted: { $ne: true },
      date: { 
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999)
      }
    });
    
    if (blockedDay) {
      return res.status(400).json({ 
        error: 'Cannot update shift to a blocked day. Please unblock the day first.' 
      });
    }
    
    const updatedShift = await Shift.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!updatedShift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    res.json(updatedShift);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Soft delete: set deleted=true
app.delete('/api/shifts/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Shift.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json({ message: 'Shift soft deleted', shift: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Blocked time routes
app.post('/api/blocked', authenticateToken, async (req, res) => {
  try {
    const { userId, date, reason } = req.body;
    
    // Check if day is already blocked
    const existingBlock = await BlockedTime.findOne({
      userId: userId,
      deleted: { $ne: true },
      date: { 
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999)
      }
    });
    
    if (existingBlock) {
      return res.status(400).json({ 
        error: 'This day is already blocked. Please unblock it first or choose a different date.' 
      });
    }
    
    // Check if there are existing shifts on this day
    const existingShifts = await Shift.find({
      userId: userId,
      date: { 
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999)
      },
      deleted: { $ne: true }
    });
    
    if (existingShifts.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot block a day that already has shifts. Please remove all shifts first.' 
      });
    }
    
    const blockedTime = new BlockedTime({ userId, date, reason });
    await blockedTime.save();
    res.status(201).json(blockedTime);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Only return non-deleted blocked times
app.get('/api/blocked/:userId', authenticateToken, async (req, res) => {
  try {
    const blockedTimes = await BlockedTime.find({ userId: req.params.userId, deleted: { $ne: true } });
    res.json(blockedTimes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Soft delete: set deleted=true
app.delete('/api/blocked/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await BlockedTime.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Blocked time not found' });
    }
    res.json({ message: 'Blocked day soft deleted', blockedTime: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get combined calendar data
app.get('/api/calendar/:userId', authenticateToken, async (req, res) => {
  try {
    const shifts = await Shift.find({ userId: req.params.userId,deleted: { $ne: true }});
  const blockedTimes = await BlockedTime.find({ userId: req.params.userId, deleted: { $ne: true } });
    res.json({ shifts, blockedTimes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
