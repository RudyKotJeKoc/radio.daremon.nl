<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Load database configuration
$config = [];
if (file_exists(__DIR__ . '/config.php')) {
    $config = include __DIR__ . '/config.php';
} elseif (file_exists(__DIR__ . '/config.example.php')) {
    // Use example config as fallback during development
    $config = include __DIR__ . '/config.example.php';
} else {
    // Default configuration if no config file exists
    $config = [
        'host' => 'localhost',
        'dbname' => 'daremon_radio',
        'username' => 'root',
        'password' => '',
        'charset' => 'utf8mb4',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    ];
}

try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}", 
        $config['username'], 
        $config['password'],
        $config['options'] ?? []
    );
} catch (PDOException $e) {
    // If database connection fails, return error but don't crash
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed', 'fallback' => true]);
    exit;
}

// Initialize database table if it doesn't exist
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        author VARCHAR(100) NOT NULL,
        text TEXT NOT NULL,
        is_ai BOOLEAN DEFAULT FALSE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS song_dedications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        words TEXT NOT NULL,
        name VARCHAR(100) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
} catch (PDOException $e) {
    // If table creation fails, continue with fallback
    error_log("Database table creation failed: " . $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'messages') {
            getMessages($pdo);
        } elseif ($action === 'dedications') {
            getDedications($pdo);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
        }
        break;
    
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($action === 'message') {
            addMessage($pdo, $input);
        } elseif ($action === 'dedication') {
            addDedication($pdo, $input);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
        }
        break;
    
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getMessages($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10");
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert to format expected by frontend
        $formatted = array_map(function($msg) {
            return [
                'author' => $msg['author'],
                'text' => $msg['text'],
                'isAI' => (bool)$msg['is_ai'],
                'timestamp' => date('H:i:s', strtotime($msg['timestamp']))
            ];
        }, array_reverse($messages));
        
        echo json_encode(['success' => true, 'messages' => $formatted]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to get messages', 'fallback' => true]);
    }
}

function addMessage($pdo, $input) {
    if (!isset($input['author']) || !isset($input['text'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO messages (author, text, is_ai) VALUES (?, ?, ?)");
        $stmt->execute([
            $input['author'],
            $input['text'],
            $input['isAI'] ?? false
        ]);
        
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to add message', 'fallback' => true]);
    }
}

function getDedications($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM song_dedications ORDER BY timestamp DESC LIMIT 15");
        $dedications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert to format expected by frontend
        $formatted = array_map(function($ded) {
            return [
                'words' => $ded['words'],
                'name' => $ded['name'],
                'timestamp' => date('d.m.Y H:i', strtotime($ded['timestamp']))
            ];
        }, array_reverse($dedications));
        
        echo json_encode(['success' => true, 'dedications' => $formatted]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to get dedications', 'fallback' => true]);
    }
}

function addDedication($pdo, $input) {
    if (!isset($input['words']) || !isset($input['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO song_dedications (words, name) VALUES (?, ?)");
        $stmt->execute([
            $input['words'],
            $input['name']
        ]);
        
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to add dedication', 'fallback' => true]);
    }
}
?>