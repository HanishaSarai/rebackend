const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 1. MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 2. Data Schema
const InquirySchema = new mongoose.Schema({
  email: String,
  category: String,   // Added
  type: String,       // Added
  grade: String,      // Added
  quantity: String,
  name: String,
  phone: String,
  message: String,
  date: { type: Date, default: Date.now }
});
const Inquiry = mongoose.model('Inquiry', InquirySchema);

// 3. Email Config (Nodemailer)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Temporary storage for OTPs (In production, use Redis)
let otpStorage = {};

// --- ROUTES ---

// A. Route to Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStorage[email] = otp;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Verification Code',
      text: `Your OTP is ${otp}`
    });
    res.status(200).json({ message: "OTP Sent" });
  } catch (err) {
    res.status(500).json({ error: "Email failed" });
  }
});

// B. Route to Verify OTP & Save Data
app.post('/api/verify-and-save', async (req, res) => {
  const { email, otp, category, type, grade, quantity, name, phone, message } = req.body;

  if (otpStorage[email] === otp) {
    try {
      // Create new inquiry with ALL fields from the 7-step form
      const newInquiry = new Inquiry({ 
        email, 
        category, 
        type, 
        grade, 
        quantity, 
        name, 
        phone, 
        message 
      });
      
      await newInquiry.save();
      delete otpStorage[email]; 
      res.status(200).json({ message: "All details verified and saved to MongoDB!" });
    } catch (err) {
      console.error("Database Save Error:", err);
      res.status(500).json({ error: "Error saving to database" });
    }
  } else {
    res.status(400).json({ error: "Invalid OTP code" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(5000, () => console.log(`🚀 Server running on port ${PORT}`));