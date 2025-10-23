CREATE DATABASE MindU;
USE MindU;

#DROPPING DATABASE AND TABLES
DROP DATABASE MindU;
DROP TABLE students;
DROP TABLE staffs;
DROP TABLE announcements;
DROP TABLE resources;
DROP TABLE backlogs;
DROP TABLE mood_data;

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

UPDATE students
SET isAskingHelp = 0
WHERE id = 46;
TRUNCATE TABLE chatbot_history;
TRUNCATE TABLE office_chat;

#SHOW TABLES
SHOW TABLES;

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
    position ENUM('Adviser', 'Guidance Advocate', 'Guidance Counselor', 'Admin') NOT NULL,
    section VARCHAR(255) UNIQUE,
    picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


# initial staff and super super admin
INSERT INTO staffs (name, email, password, passwordLength, position)
VALUES ('Mind-U','fssv.mindu@gmail.com', '1234567890', 10, 'Admin');

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
    description TEXT NOT NULL,
    filepath VARCHAR(10000) NOT NULL,
    views INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    posted_at DATETIME DEFAULT NULL,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SELECT * FROM resources;

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


SELECT * FROM chatbot_history;
SELECT * FROM office_chat;

CREATE TABLE students_login(
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE studentActivityLog(
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    module ENUM('Resource', 'Wellness', 'Chatbot', 'Mood', 'Pet') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE availability (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	date DATE NOT NULL,
	time TIME NOT NULL,
	UNIQUE(date, time), -- Ensure no duplicate combinations of date and time
	INDEX(date), -- Optional: index for faster queries by date
	INDEX(time) -- Optional: index for faster queries by time
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
    pet_neck INT DEFAULT NULL,  -- Accessory ID for pet's neck 5-8
    pet_eyes INT DEFAULT NULL,  -- Accessory ID for pet's eyes 9-12
    hunger INT DEFAULT 100,  -- Pet's hunger level (0-100)
    playfulness INT DEFAULT 100,  -- Pet's playfulness level (0-100)
    hygiene INT DEFAULT 100,  -- Pet's hygiene level (0-100)
    sleep INT DEFAULT 100,  -- Pet's sleep level (0-100)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE pet_logins (
    pet_id INT NOT NULL,
    last_login DATE NOT NULL,
    daily_bonus INT DEFAULT 0,  -- Bonus granted on login, which can be added to coins
    PRIMARY KEY (pet_id),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
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

CREATE TABLE pet_toys (
    pet_id INT NOT NULL,
    toy_type ENUM('toy_1', 'toy_2', 'toy_3', 'toy_4', 'toy_5', 'toy_6') NOT NULL,  -- Six different toys
    is_active BOOLEAN DEFAULT FALSE,  -- Whether this toy is the one currently being used
    PRIMARY KEY (pet_id, toy_type),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE TABLE pet_accessories (
    pet_id INT NOT NULL,
    accessory_category ENUM('hat', 'collar', 'glasses') NOT NULL,  -- Accessory category
    accessory_type VARCHAR(255) NOT NULL,  -- Specific type of the accessory (e.g., 'red hat', 'leather collar', etc.)
    PRIMARY KEY (pet_id, accessory_category, accessory_type),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE TABLE pet_bath_soap (
    pet_id INT NOT NULL,
    soap_type VARCHAR(255) NOT NULL,  -- Different types of soaps
    quantity INT NOT NULL DEFAULT 0,  -- Quantity of soap
    is_in_use BOOLEAN DEFAULT FALSE,  -- Whether this soap is being used
    PRIMARY KEY (pet_id, soap_type),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);


# Not sure if this is already added so just to be safe I will check

CREATE TABLE students_login(
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE studentActivityLog(
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    module ENUM('Resource', 'Wellness', 'Chatbot', 'Mood', 'Scheduler', 'Pet') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE chatbot_history (
	chat_id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    is_from_bot BOOL DEFAULT FALSE NOT NULL,
    is_trigger BOOL DEFAULT FALSE NOT NULL,
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

CREATE TABLE availability (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	date DATE NOT NULL,
	time TIME NOT NULL,
	UNIQUE(date, time), -- Ensure no duplicate combinations of date and time
	INDEX(date), -- Optional: index for faster queries by date
	INDEX(time) -- Optional: index for faster queries by time
);

DROP TABLE chatbot_history;

ALTER TABLE chatbot_history
ADD COLUMN is_trigger BOOL DEFAULT FALSE NOT NULL,
DROP COLUMN is_agent;

ALTER TABLE students
ADD COLUMN isAskingHelp BOOLEAN DEFAULT FALSE;

ALTER TABLE students
ADD COLUMN chatStatus ENUM('Pending', 'On-going', 'Completed') DEFAULT 'Completed';

-- 1. pets Table
CREATE TABLE pets (
    id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    pet_name VARCHAR(255) NOT NULL,
    pet_type ENUM('cat_1', 'cat_2', 'cat_3', 'dog_1', 'dog_2', 'dog_3') NOT NULL,
    coins INT NOT NULL DEFAULT 100,  -- Starting coins
    food_stack INT DEFAULT 5,  -- Starting food
    hygiene_stack INT DEFAULT 5,  -- Starting hygiene tools
    pet_head INT DEFAULT NULL,  -- Accessory ID for pet's head (NULL means no accessory)
    pet_neck INT DEFAULT NULL,  -- Accessory ID for pet's neck
    pet_eyes INT DEFAULT NULL,  -- Accessory ID for pet's eyes
    hunger INT DEFAULT 70,  -- Pet's hunger level (0-100)
    playfulness INT DEFAULT 70,  -- Pet's playfulness level (0-100)
    hygiene INT DEFAULT 70,  -- Pet's hygiene level (0-100)
    sleep INT DEFAULT 70,  -- Pet's sleep level (0-100)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. pet_logins Table
CREATE TABLE pet_logins (
    pet_id INT NOT NULL,
    last_login DATE NOT NULL,
    daily_bonus INT DEFAULT 0,  -- Bonus granted on login, which can be added to coins
    PRIMARY KEY (pet_id),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

ALTER TABLE backlogs
ADD COLUMN message TEXT;