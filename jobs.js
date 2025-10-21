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

// ⏱ Run every 10 minutes, but sync to the clock (e.g., 6:10, 6:20, 6:30, etc.)
cron.schedule('*/10 * * * *', async () => {
  // Get the current time
  const currentTime = new Date();
  const minutes = currentTime.getMinutes();

  // Check if the current time is aligned with 10-minute intervals (like 6:10, 6:20, etc.)
  if (minutes % 10 === 0) {
    console.log(`🕒 Running pet status update job at ${currentTime.toLocaleString()}`);

    try {
      // Decrease hunger by 5 and hygiene by 3 for all pets
      const [result] = await db.query(`
        UPDATE pets
        SET
          hunger = GREATEST(hunger - 5, 0),  -- Decrease hunger, but not below 0
          hygiene = GREATEST(hygiene - 3, 0) -- Decrease hygiene, but not below 0
        WHERE student_id IS NOT NULL  -- Ensure it's an actual pet (having student_id)
      `);

      console.log(`✅ Updated ${result.affectedRows} pet(s) hunger and hygiene.`);
    } catch (error) {
      console.error('❌ Error updating pet status:', error.message);
    }
  }
});

let sleepingPets = {};  // A sample object holding pets that are sleeping (keys could be pet IDs or some other identifier)

cron.schedule('*/10 * * * *', async () => {
  const currentTime = new Date();
  const minutes = currentTime.getMinutes();

  if (minutes % 10 === 0) {
    try {
      // First query: Decrement sleep for pets not in sleepingPets
      const [result] = await db.query(`
        UPDATE pets
        SET sleep = GREATEST(sleep - 5, 0)
        WHERE id NOT IN (${Object.keys(sleepingPets).join(', ')})`);
      
      // Second query: Add sleep for pets in sleepingPets
      if (Object.keys(sleepingPets).length > 0) {
        const petIds = Object.keys(sleepingPets).join(', ');  // Get all pet IDs from sleepingPets
        await db.query(`
          UPDATE pets
          SET sleep = sleep + 3
          WHERE id IN (${petIds})`);
      }

    } catch (error) {
      console.error("Error updating sleep times:", error);
    }
  }
});

// Function to toggle pet sleep state (add/remove from sleepingPets)
function togglePetSleep(petId, isSleeping) {
  if (isSleeping) {
    // Add the pet to sleepingPets when it's asleep
    sleepingPets[petId] = true;
    console.log(`Pet ${petId} added to sleepingPets.`);
  } else {
    // Remove the pet from sleepingPets when it wakes up
    delete sleepingPets[petId];
    console.log(`Pet ${petId} removed from sleepingPets.`);
  }
}