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
SELECT * FROM backlogs WHERE student_id = 46;
SELECT * FROM mood_data;
SELECT * FROM students_login;
SELECT * FROM StudentActivityLog;
SELECT * FROM chatbot_history;
SELECT * FROM office_chat;

SELECT * FROM students
WHERE isAskingHelp = true;

UPDATE students
SET isAskingHelp = false, chatStatus = 'Completed'
WHERE id = 622;

#SHOW TABLES
SHOW TABLES;

# initial staff and super super admin
INSERT INTO staffs (name, email, password, passwordLength, position)
VALUES ('Mind-U','fssv.mindu@gmail.com', '1234567890', 10, 'Admin');

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

DESC mood_data;

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

SELECT * FROM pets;

TRUNCATE TABLE pet_toys;
TRUNCATE TABLE pet_accessories;
TRUNCATE TABLE pet_bath_soaps;
TRUNCATE TABLE pets;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE pets;
TRUNCATE TABLE pet_logins;  -- Also truncate the child table
SET FOREIGN_KEY_CHECKS = 1;

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

SELECT * FROM pet_bath_soap;

# New Tables and Alterations