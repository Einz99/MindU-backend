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

    // 🔍 DEBUG: Log everything
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const existing = await moodServices.getMoodByDate(student_id, today);
    console.log(existing);
    let result;
    if (existing) {
      await moodServices.updateMood({ 
        student_id, 
        mood, 
        emotion_dated: today
      });
      result = { message: "Mood updated for today" };
    } else {
      await moodServices.createMood({ 
        id: student_id, 
        mood, 
        emotion_dated: today 
      });
      result = { message: "Mood recorded for today" };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in upserting mood:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
