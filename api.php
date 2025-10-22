<?php
require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Liste des pétitions
if ($action === 'list') {
    try {
        $stmt = $pdo->query("
            SELECT p.IDP, p.TitreP, p.DescriptionP, p.DateAjoutP, p.DateFinP, 
                   p.NomPorteurP, p.Email,
                   COUNT(DISTINCT s.IDS) as nb_signatures
            FROM Petition p
            LEFT JOIN Signature s ON p.IDP = s.IDP
            GROUP BY p.IDP, p.TitreP, p.DescriptionP, p.DateAjoutP, p.DateFinP, 
                     p.NomPorteurP, p.Email
            ORDER BY p.DateAjoutP DESC
        ");
        
        $petitions = $stmt->fetchAll();
        
        echo json_encode(['success' => true, 'petitions' => $petitions]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des pétitions']);
    }
}

// Créer une pétition
elseif ($action === 'add') {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Vous devez être connecté']);
        exit;
    }
    
    $titre = clean($_POST['titre'] ?? '');
    $description = clean($_POST['description'] ?? '');
    $dateFin = clean($_POST['dateFin'] ?? '');
    $nomPorteur = clean($_POST['nomPorteur'] ?? '');
    $email = clean($_POST['email'] ?? '');
    
    if (empty($titre) || empty($description) || empty($nomPorteur) || empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Tous les champs sont requis']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO Petition (TitreP, DescriptionP, DateFinP, NomPorteurP, Email) 
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $titre,
            $description,
            $dateFin ?: null,
            $nomPorteur,
            $email
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Pétition créée avec succès', 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la création']);
    }
}

// Supprimer une pétition
elseif ($action === 'delete') {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Vous devez être connecté']);
        exit;
    }
    
    $id = intval($_POST['id'] ?? 0);
    $userEmail = $_SESSION['user_email'];
    
    // Vérifier que l'utilisateur est le créateur (basé sur l'email)
    $stmt = $pdo->prepare("SELECT Email FROM Petition WHERE IDP = ?");
    $stmt->execute([$id]);
    $petition = $stmt->fetch();
    
    if (!$petition || $petition['Email'] != $userEmail) {
        echo json_encode(['success' => false, 'message' => 'Non autorisé']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM Petition WHERE IDP = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true, 'message' => 'Pétition supprimée']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la suppression']);
    }
}

// Afficher les détails d'une pétition
elseif ($action === 'details') {
    $id = intval($_GET['id'] ?? 0);
    
    try {
        $stmt = $pdo->prepare("
            SELECT p.*, COUNT(DISTINCT s.IDS) as nb_signatures
            FROM Petition p
            LEFT JOIN Signature s ON p.IDP = s.IDP
            WHERE p.IDP = ?
            GROUP BY p.IDP
        ");
        $stmt->execute([$id]);
        $petition = $stmt->fetch();
        
        if (!$petition) {
            echo json_encode(['success' => false, 'message' => 'Pétition introuvable']);
            exit;
        }
        
        echo json_encode(['success' => true, 'petition' => $petition]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erreur']);
    }
}

// Pétition la plus populaire
elseif ($action === 'top') {
    try {
        $stmt = $pdo->query("
            SELECT p.TitreP, COUNT(s.IDS) as nb_signatures
            FROM Petition p
            LEFT JOIN Signature s ON p.IDP = s.IDP
            GROUP BY p.IDP
            ORDER BY nb_signatures DESC
            LIMIT 1
        ");
        
        $top = $stmt->fetch();
        
        echo json_encode(['success' => true, 'petition' => $top]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erreur']);
    }
}

else {
    echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
}
?>