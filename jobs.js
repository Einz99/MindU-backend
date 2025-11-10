const cron = require('node-cron');
const db = require('./db');

cron.schedule('*/15 * * * *', async () => {
  const timestamp = new Date().toISOString();
  
  try {
    const [result] = await db.query(`
      UPDATE backlogs
      SET status = 'Missed', modified_at = CURRENT_TIMESTAMP
      WHERE student_id IS NOT NULL
        AND status = 'Scheduled'
        AND sched_date IS NOT NULL
        AND NOW() >= DATE_ADD(sched_date, INTERVAL 1 HOUR)
    `);

    if (result.affectedRows > 0) {
      console.log(`✅ [${timestamp}] Marked ${result.affectedRows} appointment(s) as missed`);
    }
  } catch (error) {
    console.error(`❌ [${timestamp}] Missed appointments cron error:`, error.message);
  }
});

cron.schedule('*/10 * * * *', async () => {
  const currentTime = new Date();
  const minutes = currentTime.getMinutes();

  if (minutes % 10 === 0) {
    const timestamp = currentTime.toISOString();

    try {
      const [result] = await db.query(`
        UPDATE pets
        SET
          hunger = GREATEST(hunger - 5, 0),
          hygiene = GREATEST(hygiene - 3, 0),
          playfulness = GREATEST(playfulness - 10, 0),
          sleep = GREATEST(sleep - 5, 0)
        WHERE student_id IS NOT NULL
      `);
      
      if (result.affectedRows > 0) {
        console.log(`🐾 [${timestamp}] Updated stats for ${result.affectedRows} pet(s)`);
      }
    } catch (error) {
      console.error(`❌ [${timestamp}] Pet stats cron error:`, error.message);
    }
  }
});

console.log('✅ Cron jobs initialized');