import express from 'express';
import { createOrder, verifyPayment, handleWebhook } from "../Controller/paymentController.js"

const router = express.Router();

// Route to create an order
router.post('/create-order/:userId', createOrder);

// Route to verify payment
router.post('/verify-payment', verifyPayment);

// Route to handle webhooks
router.post('/webhook', handleWebhook);

export default router;
