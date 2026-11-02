# Campus Directory

A simple department webpage built with HTML, CSS, JavaScript, PHP, and MySQL. 
phpMyAdmin is used to create and manage the database.

## Run with XAMPP and phpMyAdmin

1. Install and open XAMPP. Start **Apache** and **MySQL**.
2. Copy this folder into `C:\xampp\htdocs\lab6`.
3. Open `http://localhost/phpmyadmin`.
4. Import [`database.sql`](database.sql) using the **Import** tab.
5. Open `http://localhost/lab6/public/`.

If your MySQL username or password is different, update [`api/db.php`](api/db.php).

The app includes seeded departments plus create, search, and delete actions. Registration and login use `api/auth.php`; passwords are stored with PHP `password_hash()`. `api/db.php` uses PDO prepared statements for MySQL access.
