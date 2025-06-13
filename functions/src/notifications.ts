import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin
admin.initializeApp();

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password,
  },
});

// Function to send email
const sendEmail = async (to: string, subject: string, html: string) => {
  const mailOptions = {
    from: `"BunkRide" <${functions.config().gmail.email}>`,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to', to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
};

// Trigger when a new trip request is created
export const onTripRequestCreated = functions.firestore
  .document('tripRequests/{requestId}')
  .onCreate(async (snapshot, context) => {
    const request = snapshot.data();
    
    // Get trip details
    const tripSnapshot = await admin.firestore().collection('trips').doc(request.tripId).get();
    const trip = tripSnapshot.data();
    
    // Get trip creator's email
    const userSnapshot = await admin.firestore().collection('users').doc(trip.creatorId).get();
    const user = userSnapshot.data();
    
    if (!user || !user.email) {
      console.error('User not found or email not set');
      return null;
    }
    
    // Get requester's name
    const requesterSnapshot = await admin.firestore().collection('users').doc(request.userId).get();
    const requester = requesterSnapshot.data();
    
    const subject = 'New Trip Request';
    const html = `
      <h2>New Trip Request</h2>
      <p>You have a new request to join your trip to ${trip.destination}.</p>
      <p><strong>Requester:</strong> ${requester.name || 'A user'}</p>
      <p><strong>Trip Date:</strong> ${new Date(trip.date).toLocaleDateString()}</p>
      <p><a href="${functions.config().app.url}/trip/${trip.id}">View Request</a></p>
    `;
    
    await sendEmail(user.email, subject, html);
    return null;
  });

// Trigger when a trip request is updated (accepted/rejected)
export const onTripRequestUpdated = functions.firestore
  .document('tripRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Only proceed if status changed to 'accepted'
    if (before.status === after.status || after.status !== 'accepted') {
      return null;
    }
    
    // Get trip details
    const tripSnapshot = await admin.firestore().collection('trips').doc(after.tripId).get();
    const trip = tripSnapshot.data();
    
    // Get requester's email
    const requesterSnapshot = await admin.firestore().collection('users').doc(after.userId).get();
    const requester = requesterSnapshot.data();
    
    if (!requester || !requester.email) {
      console.error('Requester not found or email not set');
      return null;
    }
    
    // Get trip creator's name
    const creatorSnapshot = await admin.firestore().collection('users').doc(trip.creatorId).get();
    const creator = creatorSnapshot.data();
    
    const subject = 'Trip Request Accepted';
    const html = `
      <h2>Request Accepted!</h2>
      <p>Your request to join the trip to ${trip.destination} has been accepted.</p>
      <p><strong>Trip Organizer:</strong> ${creator.name || 'A user'}</p>
      <p><strong>Trip Date:</strong> ${new Date(trip.date).toLocaleDateString()}</p>
      <p><a href="${functions.config().app.url}/trip/${trip.id}">View Trip Details</a></p>
    `;
    
    await sendEmail(requester.email, subject, html);
    return null;
  });
