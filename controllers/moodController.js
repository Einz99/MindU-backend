const moodServices = require("../services/moodServices");

exports.getMood = async (req, res) => {
  try {
    const { student_id } = req.params;
    const results = await moodServices.getMood(student_id); // ✅ keep entire array
    return res.status(200).json(results);
  } catch (error) {
    console.log("Error getting mood:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.upsertMood = async (req, res) => {
  try {
    const { student_id, mood } = req.body;

    if (!student_id || !mood) {
      return res.status(400).json({ message: "Missing required fields: student_id and mood" });
    }

    const validMoods = ['Happy', 'Motivated', 'Calm', 'Anxious', 'Tired', 'Sad', 'Angry'];
    if (!validMoods.includes(mood)) {
      return res.status(400).json({ message: `Invalid mood. Valid options are: ${validMoods.join(', ')}` });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Get today's date in 'YYYY-MM-DD' format

    // Check if mood has already been updated for today
    const existing = await moodServices.getMoodByDate(student_id, today);

    let result;
    if (existing) {
      // Mood is being updated (not created)
      await moodServices.updateMood({ 
        student_id, 
        mood, 
        emotion_dated: today 
      });
      result = { message: "Mood updated for today" };
      
      return res.status(200).json(result);
    } else {
      // Create new mood
      await moodServices.createMood({ 
        id: student_id, 
        mood, 
        emotion_dated: today 
      });

      // Add coins and streak on the first mood update of the day
      const lastLogin = existing ? existing.emotion_dated : null;
      const lastStreak = existing ? existing.streak : 0;

      let streak = lastStreak;

      // If last mood was updated yesterday, reset streak, otherwise increment
      if (lastLogin !== today) {
        streak = 0;
      } else if (streak < 7) {
        streak++;
      }

      // Cap streak to 7 if it exceeds that value.
      streak = Math.min(streak, 7);

      // Calculate coins based on streak
      let coinsToAdd = 0;
      switch (streak) {
        case 0: coinsToAdd = 5; break;
        case 1: coinsToAdd = 10; break;
        case 2: coinsToAdd = 15; break;
        case 3: coinsToAdd = 20; break;
        case 4: coinsToAdd = 25; break;
        case 5: coinsToAdd = 30; break;
        case 6: coinsToAdd = 35; break;
        case 7: coinsToAdd = 50; break;
        default: coinsToAdd = 5;
      }

      // Update the pet's coins and streak in the pets table
      await moodServices.updatePetCoinsAndStreak(student_id, coinsToAdd, streak);

      result = { 
        message: "Mood recorded for today", 
        streak, 
        coinsAdded: coinsToAdd 
      };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in upserting mood:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};