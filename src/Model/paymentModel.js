// Razorpay Schema
import mongoose from 'mongoose';
import { type } from 'os';

const PaymentSchema = new mongoose.Schema({
    courseId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    userId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true
    },
    paymentMethod:{
      type:String,
      enum:['card','cash','UPI','wallet','netbanking']
    },
    paymentStatus:{
      type:String,
      enum:['pending','successful','failed', 'refunded'],
      default:'pending'
    },
    amount:{
      type:Number,
      required:true
    },
    currency:{
      type:String,
      default:'INR'
    },
    paymentDate:{
      type:Date,
      default:Date.now
    },
    orderId:{
        type:String
    },
    razorpayPaymentId: {
      type: String,
      required: false,
    },
    razorpaySignature: {
      type: String, // Signature verification field (specific to Razorpay)
      required: false,
    },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Payment = mongoose.model('Payment', PaymentSchema);
export default Payment;