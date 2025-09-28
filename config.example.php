<?php
/**
 * Database Configuration for DAREMON Radio
 * 
 * Instructions for setting up MariaDB:
 * 1. Install MariaDB on your server
 * 2. Create a database named 'daremon_radio'
 * 3. Create a user with appropriate permissions
 * 4. Update the settings below with your database credentials
 * 
 * Commands to set up database (run in MariaDB/MySQL console):
 * 
 * CREATE DATABASE daremon_radio;
 * CREATE USER 'daremon_user'@'localhost' IDENTIFIED BY 'your_secure_password';
 * GRANT ALL PRIVILEGES ON daremon_radio.* TO 'daremon_user'@'localhost';
 * FLUSH PRIVILEGES;
 */

return [
    'host' => 'localhost',
    'dbname' => 'daremon_radio',
    'username' => 'daremon_user',  // Change this to your MariaDB username
    'password' => 'your_password', // Change this to your MariaDB password
    'charset' => 'utf8mb4',
    
    // Optional: Connection options
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]
];
?>