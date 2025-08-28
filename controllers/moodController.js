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

    // Validate input
    if (!student_id || !mood) {
      return res.status(400).json({ message: "Missing required fields: student_id and mood" });
    }

    const validMoods = ['Happy', 'Motivated', 'Calm', 'Anxious', 'Tired', 'Sad', 'Angry'];
    if (!validMoods.includes(mood)) {
      return res.status(400).json({ message: `Invalid mood. Valid options are: ${validMoods.join(', ')}` });
    }

    const today = new Date().toLocaleDateString('en-CA'); // Outputs 'YYYY-MM-DD'

    // Check if there's already a mood record for today
    const existing = await moodServices.getMoodByDate(student_id, today);

    let result;
    if (existing) {
      // Update existing mood for today
      await moodServices.updateMood({ student_id, mood, emotion_date: today });
      result = { message: "Mood updated for today" };
    } else {
      // Create new mood record
      await moodServices.createMood({ id: student_id, mood, emotion_dated: today });
      result = { message: "Mood recorded for today" };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in upserting mood:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
