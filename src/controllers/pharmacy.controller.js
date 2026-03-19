// Pharmacy Orders Controller
const { query } = require('../config/database');

// Get available medications
const getMedications = async (req, res) => {
  try {
    const { search, category, pharmacyId } = req.query;
    
    let sql = `
      SELECT m.*, p.full_name as pharmacy_name, p.region, p.district
      FROM medications m
      JOIN pharmacies p ON m.pharmacy_id = p.id
      WHERE m.in_stock = true
    `;
    
    const params = [];
    if (search) {
      sql += ` AND (m.name ILIKE $${params.length + 1} OR m.generic_name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    if (category) {
      sql += ` AND m.category = $${params.length + 1}`;
      params.push(category);
    }
    if (pharmacyId) {
      sql += ` AND m.pharmacy_id = $${params.length + 1}`;
      params.push(pharmacyId);
    }
    
    sql += ` ORDER BY m.name`;
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      data: {
        medications: result.rows,
        total: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create pharmacy order
const createPharmacyOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, prescriptionId } = req.body;
    const patientId = req.user.id;
    
    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      const medResult = await query(
        'SELECT price FROM medications WHERE id = $1',
        [item.medicationId]
      );
      totalAmount += medResult.rows[0].price * item.quantity;
    }
    
    // Check wallet
    const walletResult = await query(
      'SELECT balance FROM wallet WHERE user_id = $1',
      [patientId]
    );
    
    if (!walletResult.rows[0] || walletResult.rows[0].balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }
    
    // Create order
    const orderResult = await query(
      `INSERT INTO pharmacy_orders (
        patient_id, total_amount, status, delivery_address, prescription_id
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [patientId, totalAmount, 'pending', deliveryAddress, prescriptionId]
    );
    
    const orderId = orderResult.rows[0].id;
    
    // Add order items
    for (const item of items) {
      await query(
        `INSERT INTO pharmacy_order_items (order_id, medication_id, quantity, price)
         VALUES ($1, $2, $3, (SELECT price FROM medications WHERE id = $2))`,
        [orderId, item.medicationId, item.quantity]
      );
    }
    
    // Deduct from wallet
    await query(
      'UPDATE wallet SET balance = balance - $1, total_spent = total_spent + $1 WHERE user_id = $2',
      [totalAmount, patientId]
    );
    
    // Record transaction
    await query(
      `INSERT INTO wallet_transactions (user_id, type, amount, description, related_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [patientId, 'spend', totalAmount, 'Pharmacy order', orderId]
    );
    
    res.json({
      success: true,
      data: { order: orderResult.rows[0] },
      message: 'Order placed successfully',
    });
  } catch (error) {
    console.error('Create pharmacy order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my pharmacy orders
const getMyPharmacyOrders = async (req, res) => {
  try {
    const patientId = req.user.id;
    
    const result = await query(
      `SELECT po.*, 
        json_agg(json_build_object(
          'medication_name', m.name,
          'quantity', poi.quantity,
          'price', poi.price
        )) as items
       FROM pharmacy_orders po
       LEFT JOIN pharmacy_order_items poi ON po.id = poi.order_id
       LEFT JOIN medications m ON poi.medication_id = m.id
       WHERE po.patient_id = $1
       GROUP BY po.id
       ORDER BY po.created_at DESC`,
      [patientId]
    );
    
    res.json({
      success: true,
      data: { orders: result.rows },
    });
  } catch (error) {
    console.error('Get pharmacy orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMedications,
  createPharmacyOrder,
  getMyPharmacyOrders,
};
