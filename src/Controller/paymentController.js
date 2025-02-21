import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../Model/paymentModel.js';
import Course from '../Model/courseModel.js';
import { ApiResponse } from '../Utils/apiResponse.js';
import { ApiError } from '../Utils/apiError.js';
import User from "../Model/userModel.js";
import asynchandler from '../Utils/asyncHandler.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
 

export const createOrder = asynchandler(async (req, res) => {
    try {
        const { courseId, paymentMethod } = req.body;
        const { userId } = req.params;

        const findUser = await User.findById(userId);
        if (!findUser) {
            throw new ApiError(404, 'User not found');
        }

        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(404, 'Course not found');
        }

        const amount = course.discountPrice * 100; // Convert to paise

        // ✅ Ensure await is used
        const order = await razorpay.orders.create({
            amount: amount,
            currency: 'INR',
            receipt: `rcpt_${courseId}_${userId}`.slice(0, 40),
            payment_capture: 1
        });

        console.log("Razorpay Order:", JSON.stringify(order, null, 2));  // Debugging

        if (!order || !order.id) {
            throw new ApiError(500, "Failed to create order in Razorpay");
        }

        // ✅ Save order details in database
        const payment = await Payment.create({
            userId,
            courseId,
            paymentMethod,
            paymentStatus: 'pending',
            amount: amount / 100, // Convert back to rupees
            currency: 'INR',
            orderId: order.id,
            razorpayPaymentId:null
        });

        // Set response header explicitly
        res.setHeader('Content-Type', 'application/json');

        return res.status(200).json(new ApiResponse(200, { order, payment }, 'Order created successfully'));

    } catch (error) {
        console.error("Error in createOrder:", error);
        return res.status(500).json(new ApiResponse(500, {}, error.message || "Something went wrong"));
    }
});


export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        console.log("Payment Verification Data:", req.body);

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        const payment = await Payment.findOneAndUpdate(
            { orderId: razorpay_order_id }, // Razorpay Order ID से Match करें
            {
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                paymentStatus: 'paid'
            },
            { new: true }
        );

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found in database" });
        }

        const user = await User.findByIdAndUpdate(
            payment.userId, 
            { $addToSet: { courses: payment.courseId } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res
        .status(200)
        .json(new ApiResponse(200, payment, 'Payment verified successfully'));

    } catch (error) {
        console.error("Payment Verification Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// Handle Webhook
export const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const payload = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature === expectedSignature) {
      const event = req.body;

      // Handle the event (e.g., payment.captured)
      if (event.event === 'payment.captured') {
        await Payment.findOneAndUpdate(
          { orderId: event.payload.payment.entity.order_id },
          { paymentId: event.payload.payment.entity.id, status: 'paid' },
          { new: true }
        );
      }

      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

