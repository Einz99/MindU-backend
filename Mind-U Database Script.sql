CREATE DATABASE MindU;
USE MindU;

#DROPPING DATABASE AND TABLES
#DROP DATABASE MindU;
#DROP TABLE students;
#DROP TABLE staffs;
#DROP TABLE announcements;
#DROP TABLE resources;
#DROP TABLE backlogs;
#DROP TABLE mood_data;
#DROP TABLE students_login;
#DROP TABLE StudentActivityLog;
#DROP TABLE chatbot_history;
#DROP TABLE office_chat

#SELECTING TABLES
SELECT * FROM students;
SELECT * FROM staffs;
SELECT * FROM announcements;
SELECT * FROM resources;
SELECT * FROM ActivityLog;
SELECT * FROM backlogs;
SELECT * FROM mood_data;
SELECT * FROM students_login;
SELECT * FROM StudentActivityLog;
SELECT * FROM chatbot_history;
SELECT * FROM office_chat;
SELECT * FROM alerts;
SELECT * FROM pets;
SELECT * FROM faqs;
SELECT * FROM chatbotTriggers;
SELECT * FROM pet_toys;
SELECT * FROM pet_accessories;
SELECT * FROM pet_bath_soap;

#SHOW TABLES
SHOW TABLES;

# initial staff and super super admin
INSERT INTO staffs (name, email, password, passwordLength, position)
VALUES ('Ronald Villarde','ronaldvillarde999@gmail.com', '1234567890', 10, 'Admin');

UPDATE staffs
SET position = "Adviser"
WHERE id = 1;

CREATE TABLE students (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    passwordLength INT,
    lastName VARCHAR(50) NOT NULL,
    firstName Varchar(50) NOT NULL,
    section Varchar(100) NOT NULL,
    adviser VARCHAR(255) NOT NULL,
    status ENUM('Active', 'Deactivated') DEFAULT 'Active',
    age INT,
    gender CHAR,
    profilePic VARCHAR(255),
    firstLogin BOOLEAN DEFAULT TRUE,
    isAskingHelp BOOLEAN DEFAULT FALSE,
    chatStatus ENUM('Pending', 'On-going', 'Completed') DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staffs (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    name VARCHAR(500) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    passwordLength INT NOT NULL,
    position ENUM('Adviser', 'Guidance Staff', 'Guidance Counselor', 'Admin') NOT NULL,
    section VARCHAR(255) UNIQUE,
    picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE announcements (
	ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    announcementContent TEXT NOT NULL,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resources (
	ID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    isResource TINYINT(1),
    title VARCHAR(1000) NOT NULL,
    category VARCHAR(255),
    resourceType VARCHAR(255),
    banner VARCHAR(255),
    status ENUM('Posted', 'Draft'),
    description TEXT NULL,  -- 👈 Changed to NULL
    filepath VARCHAR(10000) NULL,  -- 👈 Changed to NULL
    views INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    posted_at DATETIME DEFAULT NULL,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE backlogs (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    title ENUM("Appointment Request", "Guidance Related Events") DEFAULT "Appointment Request",
    student_id INT NULL,
    isStaffRequest BOOL,
    staff_id INT NULL,
    comment TEXT,
    message TEXT,
    name VARCHAR(255),
    sched_date DATETIME DEFAULT NULL,
    time_request DATETIME DEFAULT NULL,
    status ENUM('Pending', 'Scheduled', 'Missed', 'Completed', 'Cancelled', 'Trash', 'Denied') DEFAULT 'Pending',
    proposal VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE CASCADE
);

CREATE TABLE ActivityLog(
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mood_data (
	mood_id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    emotion ENUM('Happy', 'Motivated', 'Calm', 'Anxious', 'Tired', 'Sad', 'Angry'),
    emotion_dated DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chatbot_history (
	chat_id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    is_from_bot BOOL DEFAULT FALSE NOT NULL,
    is_agent BOOL DEFAULT FALSE NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE office_chat (
	chat_id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    is_from_office BOOL DEFAULT FALSE NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	student_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students_login(
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE studentActivityLog(
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    module ENUM('Resource', 'Wellness', 'Chatbot', 'Mood', 'Pet', 'Scheduler') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE pets (
    id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    pet_name VARCHAR(255) NOT NULL,
    pet_type ENUM('cat_1', 'cat_2', 'cat_3', 'dog_1', 'dog_2', 'dog_3') NOT NULL,
    coins INT NOT NULL DEFAULT 100,  -- Starting coins
    food_stack INT DEFAULT 5,  -- Starting food
    pet_head INT DEFAULT NULL,  -- Accessory ID for pet's head (NULL means no accessory) 1-4
    pet_neck INT DEFAULT NULL,  -- Accessory ID for pet's neck 5-8
    pet_eyes INT DEFAULT NULL,  -- Accessory ID for pet's eyes 9-12
    hunger INT DEFAULT 100,  -- Pet's hunger level (0-100)
    playfulness INT DEFAULT 100,  -- Pet's playfulness level (0-100)
    hygiene INT DEFAULT 100,  -- Pet's hygiene level (0-100)
    sleep INT DEFAULT 100,  -- Pet's sleep level (0-100)
    daily_login DATE,
    daily_login_progress INT,
    streak INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE faqs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  status ENUM('Draft', 'Posted') DEFAULT 'Posted',
  posted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chatbotTriggers(
  ID INT PRIMARY KEY AUTO_INCREMENT,
  category ENUM('Word', 'Phrase') NOT NULL,
  chatTriggers TEXT NOT NULL,
  status ENUM('Draft', 'Posted') DEFAULT 'Posted',
  posted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE pet_toys (
    pet_id INT NOT NULL,
    toy_type ENUM('toy_1', 'toy_2', 'toy_3', 'toy_4', 'toy_5', 'toy_6') NOT NULL,  -- Six different toys
    PRIMARY KEY (pet_id, toy_type),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE TABLE pet_accessories (
    pet_id INT NOT NULL,
    accessory_id INT, -- Head 1-4, Eyes 5-8, Collars 9-12
    accessory_category ENUM('hat', 'collar', 'glasses') NOT NULL,  -- Accessory category
    PRIMARY KEY (pet_id, accessory_id),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE TABLE pet_bath_soap (
    pet_id INT NOT NULL,
    soap_type VARCHAR(255) NOT NULL,  -- Different types of soaps
    quantity INT NOT NULL DEFAULT 5,  -- Quantity of soap
    is_in_use BOOLEAN DEFAULT FALSE,  -- Whether this soap is being used
    PRIMARY KEY (pet_id, soap_type),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

# New Tables and Alterations

CREATE TABLE alerts (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	student_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    is_resolved BOOL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Simple FAQ Table with draft/posted status
CREATE TABLE faqs (
  ID INT PRIMARY KEY AUTO_INCREMENT,
  category VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  status ENUM('Draft', 'Posted') DEFAULT 'Posted',
  posted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chatbotTriggers(
  ID INT PRIMARY KEY AUTO_INCREMENT,
  category ENUM('Word', 'Phrase') NOT NULL,
  chatTriggers TEXT NOT NULL,
  status ENUM('Draft', 'Posted') DEFAULT 'Posted',
  posted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- Sample Data Insert (all active by default)
INSERT INTO faqs (category, question, answer) VALUES
-- Emotional & Mental Wellness
('Emotional & Mental Wellness', 'What is emotional wellness?', 'Emotional wellness means being aware of your feelings, handling stress in a healthy way, and being okay with both good and tough emotions. It''s about knowing when to ask for help too — and that''s totally okay! 😊'),
('Emotional & Mental Wellness', 'How can I manage stress or anxiety?', 'Try deep breathing, taking breaks, journaling, or even a quick walk. Also, talk to someone you trust — it really helps! 💬'),
('Emotional & Mental Wellness', 'When should I talk to someone about how I feel?', 'If you''re feeling down, anxious, or overwhelmed for more than a few days, it''s a good idea to talk to a school counselor, teacher, or trusted adult. You don''t have to go through it alone. 💛'),
('Emotional & Mental Wellness', 'Any quick ways to boost my mood?', 'Yes! Listen to your favorite music, text a friend, drink some water, or do something creative. Even a 5-minute break can reset your day! 🎶💡'),

-- Social Wellness
('Social Wellness', 'What is social wellness?', 'It''s all about having good relationships, feeling connected, and being part of a supportive community. Even one or two close friends can make a big difference! 👯'),
('Social Wellness', 'How do I make new friends?', 'Try joining a club, talking to someone new in class, or starting with a compliment. Friendships often start with small moments! ✨'),
('Social Wellness', 'What if I feel left out?', 'That''s tough — but you''re not alone. Talk to someone you trust and try connecting with others who share your interests. You belong! 💖'),
('Social Wellness', 'How do I deal with drama or conflict?', 'Stay calm, listen, and speak honestly — not with anger. It''s okay to take space and come back to a convo later. Respect goes a long way. 🛑➡💬'),

-- Financial & Occupational Wellness
('Financial & Occupational Wellness', 'What does financial wellness mean for a student?', 'It means learning to manage your money wisely — saving, spending smart, and understanding the value of a budget. 💡'),
('Financial & Occupational Wellness', 'How can I start saving money?', 'Even saving a little from lunch money, allowance, or a part-time job helps. Use a savings jar or app and watch it grow! 💰🌱'),
('Financial & Occupational Wellness', 'What should I think about for my future career?', 'Think about what you''re good at and what you enjoy. Explore careers online or ask a teacher or counselor for advice. It''s okay not to have all the answers yet! 🔍🎨'),
('Financial & Occupational Wellness', 'How do I balance school, work, and life?', 'Use a planner, set limits, and make sure you rest. It''s okay to say no sometimes — your well-being matters! 📅⚖'),

-- Physical Wellness
('Physical Wellness', 'How much exercise do I really need?', 'Aim for about 30–60 minutes a day of activity — even walking, dancing, or sports count! Keep it fun! 🏀'),
('Physical Wellness', 'What are some healthy snack ideas?', 'Try fruit, yogurt, trail mix, or veggies with hummus. Tasty and good for you! 🍎🥕'),
('Physical Wellness', 'How do I sleep better at night?', 'Power down your phone early, keep a regular bedtime, and try not to nap too long after school. 😴📴'),
('Physical Wellness', 'What if I don''t feel confident in my body?', 'You''re not alone — lots of people feel this way. Focus on what your body can do, not just how it looks. Every body is worthy. 💙'),

-- Spiritual Wellness
('Spiritual Wellness', 'What is spiritual wellness?', 'It''s about finding meaning, purpose, and feeling connected to something bigger than yourself. 🙏'),
('Spiritual Wellness', 'Do I have to be religious to be spiritual?', 'Nope! Some people connect through religion, others through nature, music, art, or helping others. 🕊🌳'),
('Spiritual Wellness', 'How can I feel more grounded or peaceful?', 'Try breathing exercises, journaling, or sitting quietly with your thoughts. Even 2 minutes can help! ✍'),
('Spiritual Wellness', 'What are some things I can try every day?', 'Say one thing you''re thankful for, take a quiet moment for yourself, or reflect on what went well today. 🙌'),

-- Intellectual Wellness
('Intellectual Wellness', 'What is intellectual wellness?', 'It''s about learning new things, thinking critically, and staying curious about the world. 🧠'),
('Intellectual Wellness', 'How can I stay curious and creative?', 'Try reading, solving puzzles, exploring hobbies, or learning a new skill — like drawing or coding! 🎨💻'),
('Intellectual Wellness', 'What are ways to study smarter?', 'Use flashcards, teach what you learn to someone else, and take short breaks. Find what works best for you! ⏱📖'),
('Intellectual Wellness', 'How do I deal with boredom in school?', 'Look for ways to connect the topic to something you care about. Ask questions, or set a personal challenge! 🕵'),

-- Environmental Wellness
('Environmental Wellness', 'What is environmental wellness?', 'It''s about living in a clean, safe, and healthy environment — both at home and in your community. 🏡🌎'),
('Environmental Wellness', 'How does my room or study space affect me?', 'A clutter-free space can help you focus and feel less stressed. Try organizing your desk and see how it feels! 📚🧹'),
('Environmental Wellness', 'What can I do to help the planet?', 'Recycle, use less plastic, conserve water, or walk/bike more. Even small changes help! ♻🌳'),
('Environmental Wellness', 'Why should I care about nature?', 'Being in nature can improve your mood and focus. It''s good for your mental and physical health! 🍃🌞');

INSERT INTO chatbotTriggers (category, chatTriggers) 
VALUES
  ('Phrase', 'I feel like giving up.'),
  ('Phrase', 'I\'m so tired of everything.'),
  ('Phrase', 'I want to disappear'),
  ('Word', 'give up'),
  ('Word', 'suicide'),
  ('Word', 'kill myself'),
  ('Phrase', 'end it all'),
  ('Word', 'hurt myself'),
  ('Word', 'worthless'),
  ('Word', 'depressed'),
  ('Phrase', 'tired of life'),
  ('Phrase', 'end my life'),
  ('Phrase', 'want to die'),
  ('Phrase', 'I don\'t want to live'),
  ('Phrase', 'I can\'t go on'),
  ('Phrase', 'better off dead'),
  ('Word', 'hang myself'),
  ('Word', 'overdose'),
  ('Phrase', 'slit my wrists'),
  ('Word', 'cut myself'),
  ('Word', 'bleeding'),
  ('Word', 'self-harm'),
  ('Word', 'hopeless'),
  ('Word', 'useless'),
  ('Word', 'empty'),
  ('Phrase', 'no reason to live'),
  ('Phrase', 'can\'t handle this'),
  ('Phrase', 'tired of living'),
  ('Word', 'numb inside'),
  ('Word', 'hate myself'),
  ('Word', 'I\'m done');
  
  