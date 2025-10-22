<?php
require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Lister les signatures d'une pétition
if ($action === 'list') {
    $idPetition = intval($_GET['petition_id'] ?? 0);
    
    try {
        $stmt = $pdo->prepare("
            SELECT IDS, IDP, NomS, PrenomS, PaysS, DateS, HeureS, EmailS
            FROM Signature 
            WHERE IDP = ? 
            ORDER BY DateS DESC, HeureS DESC
            LIMIT 5
        ");
        $stmt->execute([$idPetition]);
        $signatures = $stmt->fetchAll();
        
        echo json_encode(['success' => true, 'signatures' => $signatures]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des signatures']);
    }
}

// Ajouter une signature
elseif ($action === 'add') {
    $idPetition = intval($_POST['petition_id'] ?? 0);
    $nom = clean($_POST['nom'] ?? '');
    $prenom = clean($_POST['prenom'] ?? '');
    $pays = clean($_POST['pays'] ?? '');
    $email = clean($_POST['email'] ?? '');
    
    if (empty($nom) || empty($prenom) || empty($pays) || empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Tous les champs sont requis']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Email invalide']);
        exit;
    }
    
    // Vérifier si la pétition existe
    $stmt = $pdo->prepare("SELECT IDP FROM Petition WHERE IDP = ?");
    $stmt->execute([$idPetition]);
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Pétition introuvable']);
        exit;
    }
    
    // Vérifier si l'email a déjà signé cette pétition
    $stmt = $pdo->prepare("SELECT IDS FROM Signature WHERE IDP = ? AND EmailS = ?");
    $stmt->execute([$idPetition, $email]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Vous avez déjà signé cette pétition']);
        exit;
    }
    
    try {
        // Insérer la signature (DateS et HeureS seront remplis automatiquement)
        $stmt = $pdo->prepare("
            INSERT INTO Signature (IDP, NomS, PrenomS, PaysS, EmailS) 
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([$idPetition, $nom, $prenom, $pays, $email]);
        
        // Récupérer le titre de la pétition pour la notification
        $stmtPetition = $pdo->prepare("SELECT TitreP FROM Petition WHERE IDP = ?");
        $stmtPetition->execute([$idPetition]);
        $petition = $stmtPetition->fetch();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Signature ajoutée avec succès',
            'notification' => true,
            'petition_title' => $petition['TitreP'] ?? ''
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'ajout de la signature']);
    }
}

// Supprimer une signature
elseif ($action === 'delete') {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Vous devez être connecté']);
        exit;
    }
    
    $ids = intval($_POST['id'] ?? 0);
    $userEmail = $_SESSION['user_email'];
    
    // Vérifier que l'utilisateur est le signataire
    $stmt = $pdo->prepare("SELECT EmailS, IDP FROM Signature WHERE IDS = ?");
    $stmt->execute([$ids]);
    $signature = $stmt->fetch();
    
    if (!$signature) {
        echo json_encode(['success' => false, 'message' => 'Signature introuvable']);
        exit;
    }
    
    if ($signature['EmailS'] != $userEmail) {
        echo json_encode(['success' => false, 'message' => 'Non autorisé']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM Signature WHERE IDS = ?");
        $stmt->execute([$ids]);
        
        echo json_encode([
            'success' => true, 
            'message' => 'Signature supprimée',
            'petition_id' => $signature['IDP']
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la suppression']);
    }
}

else {
    echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
}
?>