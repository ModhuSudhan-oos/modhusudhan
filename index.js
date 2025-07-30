const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({origin: true});

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password
  }
});

exports.submitContactForm = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { name, email, message, ipAddress } = req.body;
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    try {
      // Rate limiting check
      const recentMessages = await admin.firestore()
        .collection('contactMessages')
        .where('ipAddress', '==', ipAddress)
        .where('timestamp', '>', new Date(fiveMinutesAgo))
        .get();

      if (!recentMessages.empty) {
        return res.status(429).json({ 
          error: 'Too many requests. Please try again later.' 
        });
      }

      // Save to Firestore
      await admin.firestore().collection('contactMessages').add({
        name,
        email,
        message,
        ipAddress,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'new'
      });

      // Send email
      const mailOptions = {
        from: `"SaaS Directory" <${functions.config().gmail.email}>`,
        to: functions.config().admin.email,
        subject: `New Contact Message from ${name}`,
        html: `
          <h2>New Contact Message</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({ 
        success: true, 
        message: 'Message sent successfully!' 
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ 
        error: 'Something went wrong. Please try again later.' 
      });
    }
  });
});

exports.checkSubscriber = functions.firestore
  .document('subscribers/{subscriberId}')
  .onCreate(async (snap, context) => {
    const email = snap.data().email;
    
    const snapshot = await admin.firestore()
      .collection('subscribers')
      .where('email', '==', email)
      .get();

    if (!snapshot.empty) {
      await snap.ref.delete();
      throw new functions.https.HttpsError(
        'already-exists', 
        'This email is already subscribed.'
      );
    }
    
    return null;
  });
