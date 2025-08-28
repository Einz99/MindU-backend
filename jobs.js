const cron = require('node-cron');
const db = require('./db');

// ⏱ Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('🕒 Running missed status update job:', new Date().toLocaleString());

  try {
    const [result] = await db.query(`
      UPDATE backlogs
      SET status = 'Missed', modified_at = CURRENT_TIMESTAMP
      WHERE student_id IS NOT NULL
        AND status = 'Scheduled'
        AND sched_date IS NOT NULL
        AND NOW() >= DATE_ADD(sched_date, INTERVAL 1 HOUR)
    `);

    console.log(`✅ Marked ${result.affectedRows} backlog(s) as Missed.`);
  } catch (error) {
    console.error('❌ Error updating missed backlogs:', error.message);
  }
});