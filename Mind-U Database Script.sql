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

SELECT * FROM resources;

CREATE TABLE backlogs (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    title ENUM("Appointment Request", "Guidance Related Events") DEFAULT "Appointment Request",
    student_id INT NULL,
    isStaffRequest BOOL,
    staff_id INT NULL,
    comment TEXT,
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

SELECT * FROM backlogs
WHERE status = 'Scheduled';

SELECT * FROM students
WHERE id = 46;

SELECT * FROM staffs;

SELECT adviser, LENGTH(adviser) FROM students WHERE id = 46;
SELECT name, LENGTH(name) FROM staffs WHERE id = 9;

SELECT 
        b.id AS backlog_id,
        s.id AS student_id,
        CONCAT(s.firstName, ' ', s.lastName) AS student_name,
        b.sched_date,
        b.status
      FROM backlogs b
      JOIN students s ON b.student_id = s.id
      JOIN staffs st ON s.adviser = st.name
      WHERE st.id = 9
        AND b.status = 'Scheduled'
      ORDER BY b.sched_date ASC;

SELECT s.adviser FROM students WHERE id = 46;

UPDATE students
SET adviser = 'Ronald M. Villarde', section = 'BSIT 3-1'
WHERE id = 46;

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
    lastmsg TEXT NOT NULL,
    status ENUM('pending', 'ongoing', 'completed') DEFAULT 'pending',
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

CREATE TABLE availability (
	id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	date DATE NOT NULL,
	time TIME NOT NULL,
	UNIQUE(date, time), -- Ensure no duplicate combinations of date and time
	INDEX(date), -- Optional: index for faster queries by date
	INDEX(time) -- Optional: index for faster queries by time
);

# initial staff and super super admin
INSERT INTO staffs (name, email, password, passwordLength, position)
VALUES ('Mind-U','fssv.mindu@gmail.com', '1234567890', 10, 'Admin');

# New Tables and Alterations

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
    is_from_bot bool NOT NULL,
    message TEXT NOT NULL,
    lastmsg TEXT NOT NULL,
    status ENUM('pending', 'ongoing', 'completed') DEFAULT 'pending',
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


SELECT COUNT(id) from studentActivityLog;

ALTER TABLE backlogs
ADD COLUMN (isStaffRequest BOOL, staff_id INT, comment TEXT);

ALTER TABLE staffs
DROP COLUMN status;

ALTER TABLE resources
ADD COLUMN (views INT);

ALTER TABLE backlogs 
MODIFY COLUMN status 
    ENUM('Pending', 'Scheduled', 'Missed', 'Completed', 'Cancelled', 'Trash', 'Denied') 
    DEFAULT 'Pending';
    
# Dummy Data for activitylogs of students and resources views and student login

INSERT INTO studentActivityLog (module, created_at)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n+1 FROM seq WHERE n < 1800 -- 90 days × 20 logs per day
)
SELECT 
  ELT(FLOOR(1 + (RAND() * 6)), 'Resource', 'Wellness', 'Chatbot', 'Mood', 'Scheduler', 'Pet') AS module,
  DATE_SUB(CURDATE(), INTERVAL FLOOR((n-1)/20) DAY)  -- spread 20 per day
    + INTERVAL (RAND() * 86400) SECOND               -- random time in day
FROM seq;

SET SQL_SAFE_UPDATES = 0;

UPDATE resources
SET views = FLOOR(50 + (RAND() * 101));

SET SQL_SAFE_UPDATES = 1;

DELIMITER $$

DROP PROCEDURE IF EXISTS populate_students_login$$
CREATE PROCEDURE populate_students_login()
BEGIN
    DECLARE total_students INT;
    DECLARE day_count INT DEFAULT 0;
    DECLARE max_days INT DEFAULT 90;
    DECLARE current_day DATE;
    DECLARE num_to_insert INT;

    -- Get total number of students
    SELECT COUNT(*) INTO total_students FROM students;

    WHILE day_count < max_days DO
        SET current_day = CURDATE() - INTERVAL day_count DAY;

        -- Determine 60-90% of total students for this day
        SET num_to_insert = FLOOR(total_students * (0.6 + (RAND() * 0.3)));

        -- Insert random students excluding already logged ones for that day
        INSERT INTO students_login (student_id, login_time)
        SELECT s.id,
               CONCAT(current_day, ' ',
                      LPAD(FLOOR(RAND()*24),2,'0'), ':',
                      LPAD(FLOOR(RAND()*60),2,'0'), ':',
                      LPAD(FLOOR(RAND()*60),2,'0'))
        FROM students s
        WHERE s.id NOT IN (
            SELECT student_id 
            FROM students_login 
            WHERE DATE(login_time) = current_day
        )
        ORDER BY RAND()
        LIMIT num_to_insert;

        SET day_count = day_count + 1;
    END WHILE;
END$$

DELIMITER ;

-- Call the procedure
CALL populate_students_login();

ALTER TABLE backlogs
DROP COLUMN message;

ALTER TABLE backlogs
ADD COLUMN time_request DATETIME DEFAULT NULL;

ALTER TABLE resources
MODIFY COLUMN views INT DEFAULT 0;