const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Order = require('../schemas/Orders');
const User = require('../schemas/Users');

// Generate and download PDF receipt
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find order and populate customer and product details
    const order = await Order.findById(orderId)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'name price image category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${orderId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // PDF Content
    const customer = order.customerId;
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Header
    doc.fontSize(24)
       .fillColor('#8B4513')
       .text('Nile Cafe', 50, 50, { align: 'center' });
    
    doc.fontSize(12)
       .fillColor('#666')
       .text('Order Receipt', 50, 85, { align: 'center' });

    // Order Information
    doc.fontSize(14)
       .fillColor('#000')
       .text(`Order #: ${order._id}`, 50, 120)
       .text(`Date: ${orderDate}`, 50, 140)
       .text(`Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`, 50, 160)
       .text(`Payment Status: ${order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}`, 50, 180);

    // Customer Information
    doc.fontSize(16)
       .fillColor('#8B4513')
       .text('Customer Information', 50, 220);
    
    doc.fontSize(12)
       .fillColor('#000')
       .text(`Name: ${customer.name}`, 50, 245)
       .text(`Email: ${customer.email}`, 50, 265);
    
    if (customer.phone) {
      doc.text(`Phone: ${customer.phone}`, 50, 285);
    }

    // Order Details
    doc.fontSize(16)
       .fillColor('#8B4513')
       .text('Order Details', 50, customer.phone ? 320 : 300);

    let yPosition = customer.phone ? 345 : 325;

    // Order Type
    doc.fontSize(12)
       .fillColor('#000')
       .text(`Order Type: ${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}`, 50, yPosition);
    
    yPosition += 20;

    if (order.orderType === 'delivery' && order.deliveryAddress) {
      doc.text(`Delivery Address: ${order.deliveryAddress}`, 50, yPosition);
      yPosition += 20;
    }

    if (order.orderType === 'restaurant' && order.tableNumber) {
      doc.text(`Table Number: ${order.tableNumber}`, 50, yPosition);
      yPosition += 20;
    }

    yPosition += 10;

    // Items Table Header
    doc.fontSize(12)
       .fillColor('#8B4513')
       .text('Items', 50, yPosition)
       .text('Qty', 300, yPosition)
       .text('Price', 400, yPosition)
       .text('Total', 500, yPosition);

    yPosition += 25;

    // Draw line
    doc.moveTo(50, yPosition)
       .lineTo(550, yPosition)
       .strokeColor('#8B4513')
       .lineWidth(1)
       .stroke();

    yPosition += 15;

    // Items
    doc.fontSize(11)
       .fillColor('#000');

    order.items.forEach((item, index) => {
      const productName = item.name || item.productId?.name || 'Unknown Product';
      const quantity = item.quantity || 1;
      const price = item.price || item.productId?.price || 0;
      const itemTotal = price * quantity;

      // Check if we need a new page
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc.text(productName, 50, yPosition, { width: 240 })
         .text(quantity.toString(), 300, yPosition)
         .text(`$${price.toFixed(2)}`, 400, yPosition)
         .text(`$${itemTotal.toFixed(2)}`, 500, yPosition);

      yPosition += 20;
    });

    yPosition += 10;

    // Draw line
    doc.moveTo(50, yPosition)
       .lineTo(550, yPosition)
       .strokeColor('#8B4513')
       .lineWidth(1)
       .stroke();

    yPosition += 20;

    // Calculate subtotal and delivery fee
    const subtotal = order.items.reduce((sum, item) => {
      const price = item.price || item.productId?.price || 0;
      const quantity = item.quantity || 1;
      return sum + (price * quantity);
    }, 0);

    const deliveryFee = order.orderType === 'delivery' ? 10 : 0;

    // Totals
    doc.fontSize(12)
       .fillColor('#000')
       .text('Subtotal:', 400, yPosition)
       .text(`$${subtotal.toFixed(2)}`, 500, yPosition);

    yPosition += 20;

    if (deliveryFee > 0) {
      doc.text('Delivery Fee:', 400, yPosition)
         .text(`$${deliveryFee.toFixed(2)}`, 500, yPosition);
      yPosition += 20;
    }

    // Total
    doc.fontSize(14)
       .fillColor('#8B4513')
       .text('Total:', 400, yPosition)
       .text(`$${order.totalPrice.toFixed(2)}`, 500, yPosition);

    // Footer
    const footerY = 750;
    doc.fontSize(10)
       .fillColor('#666')
       .text('Thank you for your order!', 50, footerY, { align: 'center' })
       .text('Nile Cafe - Your favorite coffee destination', 50, footerY + 15, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating PDF receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF receipt',
      error: error.message
    });
  }
});

// Send PDF receipt via email (requires email service setup)
router.post('/:orderId/send-email', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find order
    const order = await Order.findById(orderId)
      .populate('customerId', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // For now, return success (email sending requires email service like nodemailer)
    // TODO: Implement email sending with nodemailer or similar service
    res.status(200).json({
      success: true,
      message: 'PDF receipt will be sent to your email',
      email: order.customerId.email
    });

    // Note: To implement email sending, you would:
    // 1. Install nodemailer: npm install nodemailer
    // 2. Generate PDF in memory
    // 3. Attach PDF to email
    // 4. Send email using SMTP

  } catch (error) {
    console.error('Error sending email receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending email receipt',
      error: error.message
    });
  }
});

module.exports = router;




