const express = require('express');
const cors = require('cors');

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

// In-memory storage for demo
let users = [];
let shifts = [];
let blockedTimes = [];
let nextId = 1;

// Helper function to generate ID
const generateId = () => (nextId++).toString();

// Routes

// Get all users (for testing)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a user (for initial setup)
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const user = {
      _id: generateId(),
      name: req.body.name,
      email: req.body.email
    };
    users.push(user);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Shift routes
app.post('/api/shifts', authenticateToken, async (req, res) => {
  try {
    const shift = {
      _id: generateId(),
      userId: req.body.userId,
      date: new Date(req.body.date),
      fromTime: req.body.fromTime,
      toTime: req.body.toTime
    };
    shifts.push(shift);
    res.status(201).json(shift);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/shifts/:userId', authenticateToken, async (req, res) => {
  try {
    const userShifts = shifts.filter(shift => shift.userId === req.params.userId);
    res.json(userShifts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/shifts/:id', authenticateToken, async (req, res) => {
  try {
    const index = shifts.findIndex(shift => shift._id === req.params.id);
    if (index > -1) {
      shifts.splice(index, 1);
      res.json({ message: 'Shift deleted successfully' });
    } else {
      res.status(404).json({ error: 'Shift not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Blocked time routes
app.post('/api/blocked', authenticateToken, async (req, res) => {
  try {
    const blockedTime = {
      _id: generateId(),
      userId: req.body.userId,
      date: new Date(req.body.date),
      fromTime: req.body.fromTime,
      toTime: req.body.toTime,
      reason: req.body.reason
    };
    blockedTimes.push(blockedTime);
    res.status(201).json(blockedTime);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/blocked/:userId', authenticateToken, async (req, res) => {
  try {
    const userBlockedTimes = blockedTimes.filter(blocked => blocked.userId === req.params.userId);
    res.json(userBlockedTimes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/blocked/:id', authenticateToken, async (req, res) => {
  try {
    const index = blockedTimes.findIndex(blocked => blocked._id === req.params.id);
    if (index > -1) {
      blockedTimes.splice(index, 1);
      res.json({ message: 'Blocked time deleted successfully' });
    } else {
      res.status(404).json({ error: 'Blocked time not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get combined calendar data
app.get('/api/calendar/:userId', authenticateToken, async (req, res) => {
  try {
    const userShifts = shifts.filter(shift => shift.userId === req.params.userId);
    const userBlockedTimes = blockedTimes.filter(blocked => blocked.userId === req.params.userId);
    res.json({ shifts: userShifts, blockedTimes: userBlockedTimes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Demo server running on port ${PORT}`);
  console.log('Using in-memory storage (data will reset on server restart)');
});
