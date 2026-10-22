const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  body: { type: String, required: true },
  html: { type: String },
  template: { type: String, default: 'default' },
  logoUrl: { type: String },
  buttonText: { type: String },
  buttonUrl: { type: String },
  hiddenLinkText: { type: String },
  hiddenLinkUrl: { type: String },
  footer: { type: String },
  direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
  messageId: { type: String },
  provider: { type: String },
  sentAt: { type: Date, default: Date.now },
});

const emailSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true, index: true },
    title: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed', 'pending'], default: 'sent' },
    messages: [messageSchema],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

emailSchema.index({ title: 'text', recipient: 'text' });

module.exports = mongoose.model('Email', emailSchema);
