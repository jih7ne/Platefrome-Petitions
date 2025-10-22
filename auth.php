<?php
require_once 'config.php';

header('Content-Type: application/json');

$action = $_POST['action'] ?? '';

if ($action === 'login') {
    $email = clean($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Tous les champs sont requis']);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM Utilisateur WHERE Email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['MotDePasse'])) {
        $_SESSION['user_id'] = $user['IDU'];
        $_SESSION['user_email'] = $user['Email'];
        $_SESSION['user_nom'] = $user['Nom'];
        $_SESSION['user_prenom'] = $user['Prenom'];
        
        echo json_encode([
            'success' => true,
            'message' => 'Connexion réussie',
            'user' => [
                'nom' => $user['Nom'],
                'prenom' => $user['Prenom'],
                'email' => $user['Email']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Email ou mot de passe incorrect']);
    }
}

elseif ($action === 'register') {
    $email = clean($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $nom = clean($_POST['nom'] ?? '');
    $prenom = clean($_POST['prenom'] ?? '');
    
    if (empty($email) || empty($password) || empty($nom) || empty($prenom)) {
        echo json_encode(['success' => false, 'message' => 'Tous les champs sont requis']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Email invalide']);
        exit;
    }
    
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Le mot de passe doit contenir au moins 6 caractères']);
        exit;
    }
    
    // Vérifier si l'email existe déjà
    $stmt = $pdo->prepare("SELECT IDU FROM Utilisateur WHERE Email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Cet email est déjà utilisé']);
        exit;
    }
    
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    try {
        $stmt = $pdo->prepare("INSERT INTO Utilisateur (Email, MotDePasse, Nom, Prenom) VALUES (?, ?, ?, ?)");
        $stmt->execute([$email, $hashedPassword, $nom, $prenom]);
        
        $userId = $pdo->lastInsertId();
        
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_nom'] = $nom;
        $_SESSION['user_prenom'] = $prenom;
        
        echo json_encode([
            'success' => true,
            'message' => 'Inscription réussie',
            'user' => [
                'nom' => $nom,
                'prenom' => $prenom,
                'email' => $email
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'inscription']);
    }
}

elseif ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Déconnexion réussie']);
}

elseif ($action === 'check') {
    if (isLoggedIn()) {
        echo json_encode([
            'success' => true,
            'logged_in' => true,
            'user' => getCurrentUser()
        ]);
    } else {
        echo json_encode(['success' => true, 'logged_in' => false]);
    }
}

else {
    echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
}
?>