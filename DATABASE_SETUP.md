# DAREMON Radio - Database Setup Guide

This guide helps you connect your MariaDB database to the DAREMON Radio website.

## Issues Fixed

### ✅ 1. Cache/Search Engine File Cleanup
- Updated Service Worker to v10 with aggressive cache invalidation
- Old cached files are now automatically removed when the site loads

### ✅ 2. Track Switching Bug Fixed  
- Fixed issue where tracks would switch after ~2 seconds of playing
- Added `isCrossfading` flag to prevent multiple crossfade calls
- Tracks now play their full duration before switching

### ✅ 3. MariaDB Database Integration
- Added database integration for messages and song dedications
- Automatic fallback to localStorage if database is unavailable
- All user interactions are now saved to the database

## MariaDB Database Setup

### Step 1: Install MariaDB
If you don't have MariaDB installed yet:

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mariadb-server
sudo mysql_secure_installation
```

**On CentOS/RHEL:**
```bash
sudo yum install mariadb-server
sudo systemctl start mariadb
sudo mysql_secure_installation
```

### Step 2: Create Database and User
Run these commands in your MariaDB console:

```sql
# Connect to MariaDB as root
mysql -u root -p

# Create database
CREATE DATABASE daremon_radio;

# Create user (replace 'your_secure_password' with a strong password)
CREATE USER 'daremon_user'@'localhost' IDENTIFIED BY 'your_secure_password';

# Grant permissions
GRANT ALL PRIVILEGES ON daremon_radio.* TO 'daremon_user'@'localhost';

# Apply changes
FLUSH PRIVILEGES;

# Exit
EXIT;
```

### Step 3: Configure Database Connection
1. Copy the example configuration file:
   ```bash
   cp config.example.php config.php
   ```

2. Edit the `config.php` file in your website directory
3. Update the database credentials:

```php
return [
    'host' => 'localhost',
    'dbname' => 'daremon_radio',
    'username' => 'daremon_user',  // Your MariaDB username
    'password' => 'your_secure_password', // Your MariaDB password
    'charset' => 'utf8mb4',
];
```

**Important:** The `config.php` file is automatically ignored by git to protect your database credentials.

### Step 4: Test the Connection
1. Open your website in a browser
2. Try sending a message or song dedication
3. Check your browser's developer console for any database connection errors

## Database Tables

The system automatically creates these tables:

### `messages` Table
- Stores user messages to the DJ
- Columns: id, author, text, is_ai, timestamp, created_at

### `song_dedications` Table  
- Stores song requests and dedications
- Columns: id, words, name, timestamp, created_at

## Fallback Behavior

If the database is unavailable, the system automatically falls back to using localStorage in the browser. This means:
- ✅ The website continues to work normally
- ⚠️ Data is only stored locally in each user's browser
- ⚠️ Data doesn't persist across different devices/browsers

## Troubleshooting

### Database Connection Issues
1. Check that MariaDB service is running:
   ```bash
   sudo systemctl status mariadb
   ```

2. Verify database credentials in `config.php`

3. Check PHP error logs for detailed error messages

### Permission Issues
Make sure the web server can read the PHP files:
```bash
sudo chown -R www-data:www-data /path/to/your/website
sudo chmod -R 755 /path/to/your/website
```

### Testing Database Connection
You can test the API directly:
```bash
# Test getting messages
curl http://your-website.com/api.php?action=messages

# Test adding a message
curl -X POST -H "Content-Type: application/json" \
     -d '{"author":"Test","text":"Hello database!"}' \
     http://your-website.com/api.php?action=message
```

## Security Notes

1. **Change default passwords** - Never use default or weak passwords
2. **Limit database user permissions** - Only grant necessary privileges  
3. **Use HTTPS** - Always serve your website over HTTPS in production
4. **Regular backups** - Set up automatic database backups
5. **Update regularly** - Keep MariaDB and PHP updated

## Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Check PHP error logs on your server
3. Verify MariaDB service status and logs
4. Ensure all file permissions are correct

The system is designed to be robust - even if database setup fails, the website will continue working with localStorage as backup.