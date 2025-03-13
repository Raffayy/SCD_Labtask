const cron = require('node-cron');
const nodemailer = require('nodemailer');
const eventModel = require('../events');

// Configure email transport (for demonstration purposes)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASS || 'password'
  }
});

/**
 * Send email notification
 * @param {Object} event The event data
 * @param {string} userEmail The user's email
 * @returns {Promise<void>}
 */
async function sendEmailNotification(event, userEmail) {
  if (!userEmail) return;
  
  const emailContent = {
    from: process.env.EMAIL_FROM || 'noreply@eventplanner.com',
    to: userEmail,
    subject: `Reminder: ${event.name}`,
    text: `Reminder for your event: ${event.name} scheduled for ${event.date} at ${event.time}.\n\nDescription: ${event.description}`
  };
  
  try {
    await transporter.sendMail(emailContent);
    console.log(`Reminder email sent for event: ${event.id}`);
  } catch (error) {
    console.error(`Failed to send reminder email: ${error.message}`);
  }
}

/**
 * Process reminders
 * @returns {Promise<void>}
 */
async function processReminders() {
  try {
    const events = await eventModel.getUpcomingReminders();
    const now = new Date();
    
    for (const event of events) {
      const eventDateTime = new Date(`${event.date} ${event.time}`);
      
      for (const reminder of event.reminders) {
        // Calculate when the reminder should trigger (e.g., 30 minutes before event)
        const reminderTime = new Date(eventDateTime);
        const timeParts = reminder.time.split(' ');
        const timeValue = parseInt(timeParts[0]);
        const timeUnit = timeParts[1];
        
        switch (timeUnit) {
          case 'minutes':
            reminderTime.setMinutes(reminderTime.getMinutes() - timeValue);
            break;
          case 'hours':
            reminderTime.setHours(reminderTime.getHours() - timeValue);
            break;
          case 'days':
            reminderTime.setDate(reminderTime.getDate() - timeValue);
            break;
        }
        
        // Check if it's time to send a reminder
        // Allow a 1-minute window to account for cron job interval
        const timeDiff = Math.abs(now - reminderTime);
        if (timeDiff <= 60000) {
          // Send notification based on reminder type
          if (reminder.type === 'email') {
            await sendEmailNotification(event, event.userEmail);
          } else {
            // For demo, just log the notification
            console.log(`Reminder notification for event: ${event.name} at ${now.toISOString()}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing reminders: ${error.message}`);
  }
}

/**
 * Initialize reminder service
 */
function initializeReminders() {
  // Check for reminders every minute
  cron.schedule('* * * * *', async () => {
    await processReminders();
  });
  
  console.log('Reminder service initialized');
}

module.exports = {
  initializeReminders,
  processReminders // Exported for testing purposes
};