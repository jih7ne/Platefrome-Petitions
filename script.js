let currentUser = null;
let petitions = [];
let notificationQueue = [];
let isProcessingQueue = false;
let lastFetchTime = 0;
let isFetching = false;

//fonction centrale
function xhrRequest(method, url, data, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    callback(null, response);
                } catch (e) {
                    callback(new Error('Réponse invalide du serveur'), null);
                }
            } else {
                callback(new Error('Erreur de connexion: ' + xhr.status), null);
            }
        }
    };
    
    xhr.onerror = function() {
        callback(new Error('Erreur réseau'), null);
    };
    
    if (method === 'POST' && data) {
        xhr.send(data);
    } else {
        xhr.send();
    }
}

//pour verifier l authentification
function checkAuth() {
    const formData = new FormData();
    formData.append('action', 'check');
    
    xhrRequest('POST', 'auth.php', formData, function(err, data) {
        if (err) {
            console.error('Erreur de vérification d\'authentification:', err);
            queueNotification('Erreur', 'Impossible de vérifier votre statut de connexion');
            return;
        }
        
        if (data.logged_in) {
            currentUser = data.user;
            updateUIForLoggedIn();
            startRealTimeUpdates();
        } else {
            currentUser = null;
            updateUIForGuest();
        }
        //on charge les petitions
        loadPetitions();
        loadTopPetition();
    });
}

//on met a jour l interface utilisateur
function updateUIForLoggedIn() {
    document.getElementById('navAuth').classList.add('hidden');
    document.getElementById('navUser').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.prenom;
    document.getElementById('userAvatar').textContent = currentUser.prenom.charAt(0).toUpperCase();
    document.getElementById('topPetitionSection').classList.remove('hidden');
}

//on met a jour l interface utilisateur pour les utilisateurs non signed in
function updateUIForGuest() {
    document.getElementById('navAuth').classList.remove('hidden');
    document.getElementById('navUser').classList.add('hidden');
    document.getElementById('topPetitionSection').classList.add('hidden');
}

document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
    });
});

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('action', 'login');
    
    xhrRequest('POST', 'auth.php', formData, function(err, data) {
        if (err) {
            queueNotification('Erreur', 'Échec de la connexion');
            return;
        }
        
        if (data.success) {
            queueNotification('Bon Retour', 'Connecté en tant que ' + data.user.prenom + ' ' + data.user.nom);
            closeModal('authModal');
            checkAuth();
        } else {
            queueNotification('Échec de Connexion', data.message);
        }
    });
});

document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('action', 'register');
    
    xhrRequest('POST', 'auth.php', formData, function(err, data) {
        if (err) {
            queueNotification('Erreur', 'Échec de l\'inscription');
            return;
        }
        
        if (data.success) {
            queueNotification('Compte Créé', 'Bienvenue sur la Plateforme de Pétitions');
            closeModal('authModal');
            checkAuth();
        } else {
            queueNotification('Échec de l\'Inscription', data.message);
        }
    });
});

//logout
function logout() {
    const formData = new FormData();
    formData.append('action', 'logout');
    
    xhrRequest('POST', 'auth.php', formData, function(err, data) {
        if (err) {
            queueNotification('Erreur', 'Échec de la déconnexion');
            return;
        }
        
        queueNotification('Déconnexion', 'Vous avez été déconnecté avec succès');
        checkAuth();
    });
}

//charger les petitions
function loadPetitions(force) {
    force = force || false;
    const now = Date.now();
    if (!force && isFetching) return;
    if (!force && now - lastFetchTime < 1000) return;
    
    isFetching = true;
    lastFetchTime = now;
    
    xhrRequest('GET', 'api.php?action=list', null, function(err, data) {
        isFetching = false;
        
        if (err) {
            console.error('Erreur de chargement des pétitions:', err);
            queueNotification('Erreur', 'Impossible de charger les pétitions');
            return;
        }
        
        if (data.success) {
            const oldPetitions = petitions.slice();
            petitions = data.petitions;
            displayPetitions(oldPetitions);
            updateStats();
        }
    });
}

function displayPetitions(oldPetitions) {
    oldPetitions = oldPetitions || [];
    const container = document.getElementById('petitionsContainer');
    
    if (petitions.length === 0) {
        container.innerHTML = '<div class="loading"><p>Aucune pétition disponible</p></div>';
        return;
    }
    
    const newPetitions = petitions.filter(function(p) {
        return !oldPetitions.some(function(old) { return old.IDP === p.IDP; });
    });
    
    container.innerHTML = petitions.map(function(p, index) {
        const isNew = newPetitions.some(function(newP) { return newP.IDP === p.IDP; });
        const canModify = currentUser && p.Email === currentUser.email;
        
        return '<div class="petition-card" style="animation-delay: ' + (index * 0.05) + 's;">' +
            (isNew ? '<div style="position: absolute; top: 10px; right: 10px; background: var(--netflix-red); color: white; padding: 5px 14px; border-radius: 3px; font-size: 11px; font-weight: 700; z-index: 5; text-transform: uppercase; letter-spacing: 1px; animation: pulse 2s infinite;">NOUVEAU</div>' : '') +
            '<div class="petition-image">P</div>' +
            '<div class="petition-content">' +
            '<h3 class="petition-title">' + p.TitreP + '</h3>' +
            '<p class="petition-description">' + p.DescriptionP + '</p>' +
            '<div class="petition-meta">' +
            '<span class="signatures-count">' + (p.nb_signatures || 0) + ' signatures</span>' +
            '<span>' + new Date(p.DateAjoutP).toLocaleDateString('fr-FR') + '</span>' +
            '</div>' +
            '<div class="petition-actions">' +
            '<button class="btn btn-primary" onclick="checkAuthAndSign(' + p.IDP + ')">Signer</button>' +
            (canModify ? '<button class="btn btn-secondary" onclick="editPetition(' + p.IDP + ')">Modifier</button>' : '') +
            (canModify ? '<button class="btn btn-secondary" onclick="deletePetition(' + p.IDP + ')">Supprimer</button>' : '') +
            '</div>' +
            '</div>' +
            '</div>';
    }).join('');
}

function updateStats() {
    const totalPetitionsEl = document.getElementById('totalPetitions');
    const totalSignaturesEl = document.getElementById('totalSignatures');
    
    const newTotal = petitions.length;
    const newSigs = petitions.reduce(function(sum, p) {
        return sum + parseInt(p.nb_signatures || 0);
    }, 0);
    
    animateValue(totalPetitionsEl, parseInt(totalPetitionsEl.textContent), newTotal, 500);
    animateValue(totalSignaturesEl, parseInt(totalSignaturesEl.textContent), newSigs, 500);
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(function() {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

function loadTopPetition() {
    xhrRequest('GET', 'api.php?action=top', null, function(err, data) {
        if (err) {
            console.error('Erreur de chargement de la pétition top:', err);
            return;
        }
        
        if (data.success && data.petition) {
            document.getElementById('topPetitionContent').innerHTML = 
                '<div class="petition-card">' +
                '<div class="petition-image">P</div>' +
                '<div class="petition-content">' +
                '<h3 class="petition-title">' + data.petition.TitreP + '</h3>' +
                '<div class="petition-meta">' +
                '<span class="signatures-count">' + data.petition.nb_signatures + ' signatures</span>' +
                '</div>' +
                '</div>' +
                '</div>';
        }
    });
}

function checkAuthAndCreate() {
    if (!currentUser) {
        queueNotification('Authentification Requise', 'Veuillez vous connecter pour créer une pétition');
        openAuthModal();
        return;
    }
    
    const form = document.getElementById('createPetitionForm');
    form.querySelector('[name="nomPorteur"]').value = currentUser.prenom + ' ' + currentUser.nom;
    form.querySelector('[name="email"]').value = currentUser.email;
    form.querySelector('[name="petition_id"]').value = '';
    document.getElementById('createPetitionModal').querySelector('.modal-title').textContent = 'Créer une Nouvelle Pétition';
    
    openModal('createPetitionModal');
}

function editPetition(petitionId) {
    const petition = petitions.find(function(p) { return p.IDP == petitionId; });
    if (!petition) return;
    
    const form = document.getElementById('createPetitionForm');
    form.querySelector('[name="petition_id"]').value = petitionId;
    form.querySelector('[name="titre"]').value = petition.TitreP;
    form.querySelector('[name="description"]').value = petition.DescriptionP;
    form.querySelector('[name="dateFin"]').value = petition.DateFinP || '';
    form.querySelector('[name="nomPorteur"]').value = petition.NomPorteurP;
    form.querySelector('[name="email"]').value = petition.Email;
    
    document.getElementById('createPetitionModal').querySelector('.modal-title').textContent = 'Modifier la Pétition';
    openModal('createPetitionModal');
}

function checkAuthAndSign(petitionId) {
    if (!currentUser) {
        queueNotification('Authentification Requise', 'Veuillez vous connecter pour signer cette pétition');
        openAuthModal();
        return;
    }
    
    const petition = petitions.find(function(p) { return p.IDP == petitionId; });
    if (!petition) return;
    
    xhrRequest('GET', 'signature.php?action=list&petition_id=' + petitionId, null, function(err, sigData) {
        if (err) {
            console.error('Erreur de chargement des signatures:', err);
            return;
        }
        
        const signaturesList = sigData.success && sigData.signatures.length > 0 ? 
            '<div class="signatures-list">' +
            '<h4 class="signatures-title">Signatures Récentes</h4>' +
            sigData.signatures.map(function(s) {
                const canDelete = currentUser && s.EmailS === currentUser.email;
                return '<div class="signature-item">' +
                    '<div>' +
                    '<div class="signature-user">' + s.PrenomS + ' ' + s.NomS + '</div>' +
                    '<div class="signature-info">' + s.PaysS + ' • ' + new Date(s.DateS).toLocaleString('fr-FR') + '</div>' +
                    '</div>' +
                    (canDelete ? '<button class="btn btn-secondary" style="font-size: 12px; padding: 5px 10px;" onclick="deleteSignature(' + s.IDS + ', ' + petitionId + ')">Retirer</button>' : '') +
                    '</div>';
            }).join('') +
            '</div>' : '';
        
        document.getElementById('signModalContent').innerHTML = 
            '<div style="margin-bottom: 30px;">' +
            '<h4 style="font-size: 20px; margin-bottom: 15px;">' + petition.TitreP + '</h4>' +
            '<p style="color: var(--netflix-light-gray); margin-bottom: 20px;">' + petition.DescriptionP + '</p>' +
            '<div style="background: var(--netflix-dark); padding: 20px; border-radius: 4px; border-left: 4px solid var(--netflix-red);">' +
            '<span style="font-size: 24px; font-weight: 700; color: var(--netflix-red);">' + (petition.nb_signatures || 0) + '</span>' +
            '<span style="color: var(--netflix-light-gray); margin-left: 10px;">personnes ont signé</span>' +
            '</div>' +
            '</div>' +
            '<form id="signForm">' +
            '<input type="hidden" name="petition_id" value="' + petitionId + '">' +
            '<div class="form-group">' +
            '<label class="form-label">Prénom</label>' +
            '<input type="text" class="form-input" name="prenom" value="' + currentUser.prenom + '" required>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Nom</label>' +
            '<input type="text" class="form-input" name="nom" value="' + currentUser.nom + '" required>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Pays</label>' +
            '<input type="text" class="form-input" name="pays" value="Maroc" required>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Email</label>' +
            '<input type="email" class="form-input" name="email" value="' + currentUser.email + '" required>' +
            '</div>' +
            '<button type="submit" class="btn btn-primary" style="width: 100%;">Signer cette Pétition</button>' +
            '</form>' +
            signaturesList;
        
        document.getElementById('signForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            formData.append('action', 'add');
            
            xhrRequest('POST', 'signature.php', formData, function(err, data) {
                if (err) {
                    queueNotification('Erreur', 'Échec de la signature de la pétition');
                    return;
                }
                
                if (data.success) {
                    queueNotification('Pétition Signée', 'Merci pour votre soutien !');
                    closeModal('signModal');
                    broadcastSignature(petition.TitreP);
                    loadPetitions(true);
                } else {
                    queueNotification('Échec de la Signature', data.message);
                }
            });
        });
        
        openModal('signModal');
    });
}

document.getElementById('createPetitionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const petitionId = formData.get('petition_id');
    const titre = formData.get('titre');
    
    if (petitionId) {
        // Mode modification
        formData.append('action', 'update');
        formData.append('id', petitionId);
        
        xhrRequest('POST', 'api.php', formData, function(err, data) {
            if (err) {
                queueNotification('Erreur', 'Échec de la modification de la pétition');
                return;
            }
            
            if (data.success) {
                closeModal('createPetitionModal');
                e.target.reset();
                queueNotification('Pétition Modifiée', '"' + titre + '" a été mise à jour');
                loadPetitions(true);
            } else {
                queueNotification('Échec de la Modification', data.message);
            }
        });
    } else {
        // Mode création
        formData.append('action', 'add');
        
        xhrRequest('POST', 'api.php', formData, function(err, data) {
            if (err) {
                queueNotification('Erreur', 'Échec de la création de la pétition');
                return;
            }
            
            if (data.success) {
                closeModal('createPetitionModal');
                e.target.reset();
                queueNotification('Pétition Créée', '"' + titre + '" a été publiée');
                broadcastNewPetition(titre, currentUser.prenom);
                loadPetitions(true);
            } else {
                queueNotification('Échec de la Création', data.message);
            }
        });
    }
});

function deletePetition(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette pétition ?')) return;
    
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('id', id);
    
    xhrRequest('POST', 'api.php', formData, function(err, data) {
        if (err) {
            queueNotification('Erreur', 'Échec de la suppression de la pétition');
            return;
        }
        
        if (data.success) {
            queueNotification('Pétition Supprimée', 'La pétition a été supprimée');
            loadPetitions(true);
        } else {
            queueNotification('Échec de la Suppression', data.message);
        }
    });
}

function deleteSignature(signatureId, petitionId) {
    if (!confirm('Êtes-vous sûr de vouloir retirer votre signature ?')) return;
    
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('id', signatureId);
    
    xhrRequest('POST', 'signature.php', formData, function(err, data) {
        if (err) {
            queueNotification('Erreur', 'Échec de la suppression de la signature');
            return;
        }
        
        if (data.success) {
            queueNotification('Signature Retirée', 'Votre signature a été supprimée');
            closeModal('signModal');
            loadPetitions(true);
        } else {
            queueNotification('Échec de la Suppression', data.message);
        }
    });
}

function queueNotification(title, message) {
    notificationQueue.push({ title: title, message: message });
    if (!isProcessingQueue) {
        processNotificationQueue();
    }
}

function processNotificationQueue() {
    if (notificationQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }
    
    isProcessingQueue = true;
    const item = notificationQueue.shift();
    
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = 
        '<div class="notification-icon">!</div>' +
        '<div class="notification-content">' +
        '<div class="notification-title">' + item.title + '</div>' +
        '<div class="notification-message">' + item.message + '</div>' +
        '</div>';
    
    container.appendChild(notification);
    
    setTimeout(function() {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(function() {
            notification.remove();
            processNotificationQueue();
        }, 300);
    }, 4000);
}

function startRealTimeUpdates() {
    const pollInterval = setInterval(function() {
        if (isFetching) return;
        
        xhrRequest('GET', 'api.php?action=list', null, function(err, data) {
            if (err || !data.success) return;
            
            const newPetitions = data.petitions.filter(function(newP) {
                return !petitions.some(function(p) { return p.IDP === newP.IDP; });
            });
            
            newPetitions.forEach(function(newP) {
                if (newP.Email !== currentUser.email) {
                    queueNotification('Nouvelle Pétition', '"' + newP.TitreP + '" a été créée');
                }
            });
            
            data.petitions.forEach(function(newP) {
                const oldP = petitions.find(function(p) { return p.IDP === newP.IDP; });
                if (oldP && parseInt(newP.nb_signatures) > parseInt(oldP.nb_signatures)) {
                    queueNotification('Nouvelle Signature', 'Quelqu\'un a signé "' + newP.TitreP + '"');
                }
            });
            
            if (JSON.stringify(petitions) !== JSON.stringify(data.petitions)) {
                const oldPetitions = petitions.slice();
                petitions = data.petitions;
                displayPetitions(oldPetitions);
                updateStats();
            }
        });
    }, 3000);
    
    window.addEventListener('beforeunload', function() {
        clearInterval(pollInterval);
    });
}

function broadcastNewPetition(titre, creator) {
    try {
        const event = {
            type: 'new_petition',
            titre: titre,
            creator: creator,
            timestamp: Date.now()
        };
        localStorage.setItem('lastPetitionEvent', JSON.stringify(event));
        setTimeout(function() {
            localStorage.removeItem('lastPetitionEvent');
        }, 1000);
    } catch(e) {}
}

function broadcastSignature(titre) {
    try {
        const event = {
            type: 'new_signature',
            titre: titre,
            timestamp: Date.now()
        };
        localStorage.setItem('lastSignatureEvent', JSON.stringify(event));
        setTimeout(function() {
            localStorage.removeItem('lastSignatureEvent');
        }, 1000);
    } catch(e) {}
}

let lastPetitionEventTime = 0;
let lastSignatureEventTime = 0;

window.addEventListener('storage', function(e) {
    if (e.key === 'lastPetitionEvent' && e.newValue) {
        try {
            const event = JSON.parse(e.newValue);
            const timeDiff = Date.now() - event.timestamp;
            
            if (timeDiff < 500 && event.timestamp > lastPetitionEventTime) {
                lastPetitionEventTime = event.timestamp;
                queueNotification('Nouvelle Pétition', '"' + event.titre + '" a été créée par ' + event.creator);
                loadPetitions(true);
            }
        } catch(err) {}
    }
    
    if (e.key === 'lastSignatureEvent' && e.newValue) {
        try {
            const event = JSON.parse(e.newValue);
            const timeDiff = Date.now() - event.timestamp;
            
            if (timeDiff < 500 && event.timestamp > lastSignatureEventTime) {
                lastSignatureEventTime = event.timestamp;
                queueNotification('Nouvelle Signature', 'Quelqu\'un a signé "' + event.titre + '"');
                loadPetitions(true);
            }
        } catch(err) {}
    }
});

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    modal.offsetHeight;
    modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    setTimeout(function() {
        modal.style.display = 'none';
    }, 300);
}

function openAuthModal() {
    openModal('authModal');
}

document.querySelectorAll('.modal').forEach(function(modal) {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});

function scrollToPetitions() {
    document.getElementById('petitionsSection').scrollIntoView({ behavior: 'smooth' });
}

let lastScrollTime = 0;
window.addEventListener('scroll', function() {
    const now = Date.now();
    if (now - lastScrollTime < 100) return;
    lastScrollTime = now;
    
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}, { passive: true });

checkAuth();