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

# initial staff
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    posted_at DATETIME DEFAULT NULL,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE backlogs (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    title ENUM("Appointment Request", "Guidance Related Events") DEFAULT "Appointment Request",
    student_id INT NULL,
    staff_id INT NULL,
    comment TEXT,
    name VARCHAR(255),
    message TEXT,
    sched_date DATETIME DEFAULT NULL,
    status ENUM('Pending', 'Scheduled', 'Missed', 'Completed', 'Cancelled', 'Trash') DEFAULT 'Pending',
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
    is_from_bot bool NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


# New Tables and Alterations

CREATE TABLE students_login(
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    student_id INT,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE StudentActivityLog(
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    module ENUM('Resource', 'Wellness', 'Chatbot', 'Mood', 'Pet') NOT NULL,
	content_id INT,
    FOREIGN KEY (content_id) REFERENCES resources(ID),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE backlogs
ADD COLUMN (isStaffRequest BOOL, staff_id INT, comment TEXT);

ALTER TABLE staffs
DROP COLUMN status;