const moodServices = require("../services/moodServices");

exports.getMood = async (req, res) => {
  const startTime = Date.now();
  try {
    const { student_id } = req.params;
    
    console.log('[getMood] Request started', {
      timestamp: new Date().toISOString(),
      student_id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    const results = await moodServices.getMood(student_id);
    
    console.log('[getMood] Request successful', {
      timestamp: new Date().toISOString(),
      student_id,
      recordCount: results.length,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('[getMood] Request failed', {
      timestamp: new Date().toISOString(),
      student_id: req.params.student_id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.upsertMood = async (req, res) => {
  const startTime = Date.now();
  try {
    const { student_id, mood } = req.body;

    console.log('[upsertMood] Request started', {
      timestamp: new Date().toISOString(),
      student_id,
      mood,
      ip: req.ip
    });

    if (!student_id || !mood) {
      console.warn('[upsertMood] Validation failed - missing fields', {
        timestamp: new Date().toISOString(),
        student_id: !!student_id,
        mood: !!mood
      });
      
      return res.status(400).json({ message: "Missing required fields: student_id and mood" });
    }

    const validMoods = ['Happy', 'Motivated', 'Calm', 'Anxious', 'Tired', 'Sad', 'Angry'];
    if (!validMoods.includes(mood)) {
      console.warn('[upsertMood] Validation failed - invalid mood', {
        timestamp: new Date().toISOString(),
        student_id,
        providedMood: mood,
        validMoods
      });
      
      return res.status(400).json({ message: `Invalid mood. Valid options are: ${validMoods.join(', ')}` });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const existing = await moodServices.getMoodByDate(student_id, today);

    console.log('[upsertMood] Existing mood check', {
      timestamp: new Date().toISOString(),
      student_id,
      today,
      existingFound: !!existing,
      operation: existing ? 'update' : 'create'
    });

    let result;
    if (existing) {
      await moodServices.updateMood({ 
        student_id, 
        mood, 
        emotion_dated: today 
      });
      
      result = { message: "Mood updated for today" };
      
      console.log('[upsertMood] Mood updated', {
        timestamp: new Date().toISOString(),
        student_id,
        mood,
        date: today,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(200).json(result);
    } else {
      await moodServices.createMood({ 
        id: student_id, 
        mood, 
        emotion_dated: today 
      });

      const lastLogin = existing ? existing.emotion_dated : null;
      const lastStreak = existing ? existing.streak : 0;

      let streak = lastStreak;

      if (lastLogin !== today) {
        streak = 0;
      } else if (streak < 7) {
        streak++;
      }

      streak = Math.min(streak, 7);

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

      console.log('[upsertMood] Streak calculation', {
        timestamp: new Date().toISOString(),
        student_id,
        lastStreak,
        newStreak: streak,
        coinsToAdd
      });

      await moodServices.updatePetCoinsAndStreak(student_id, coinsToAdd, streak);

      result = { 
        message: "Mood recorded for today", 
        streak, 
        coinsAdded: coinsToAdd 
      };
      
      console.log('[upsertMood] Mood created with rewards', {
        timestamp: new Date().toISOString(),
        student_id,
        mood,
        date: today,
        streak,
        coinsAdded: coinsToAdd,
        duration: `${Date.now() - startTime}ms`
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[upsertMood] Request failed', {
      timestamp: new Date().toISOString(),
      student_id: req.body.student_id,
      mood: req.body.mood,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};