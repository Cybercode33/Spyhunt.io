// Initialize Firebase (replace with your Firebase config)
const firebaseConfig = {
    // Your Firebase configuration
};

// Add action code settings for email verification
const actionCodeSettings = {
    url: window.location.origin + '/verified.html',
    handleCodeInApp: true
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth Modal Controls
function openAuthModal(mode = 'login') {
    document.getElementById('authModal').style.display = 'block';
    setTimeout(() => {
        document.querySelector('#authModal .modal-content').classList.add('page-visible');
    }, 100);
    toggleAuthMode(null, mode);
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    const content = document.querySelector('#authModal .modal-content');
    content.classList.remove('page-visible');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 500);
}

function toggleAuthMode(event, mode) {
    if (event) event.preventDefault();
    
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authTitle = document.querySelector('#authTitle span');
    
    if (mode === 'signup' || loginForm.classList.contains('hidden')) {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        authTitle.textContent = 'Sign In';
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        authTitle.textContent = 'Sign Up';
    }
}

// Authentication Functions
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showAuthError('Passwords do not match');
        return;
    }
    
    try {
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update profile with name
        await user.updateProfile({ displayName: name });

        // Send verification email
        await user.sendEmailVerification({
            ...actionCodeSettings,
            from: 'eyad.ashraf2009@gmail.com',
            subject: 'Verify your SpyHunt account',
            templateData: {
                userName: name
            }
        });

        // Save user to database with verification status
        await saveUserToDb(user);

        // Show success message
        showAuthSuccess('Please check your email to verify your account');
        
        // Start checking verification status
        startVerificationCheck(user);
        
    } catch (error) {
        showAuthError(error.message);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
            showAuthError('Please verify your email before signing in');
            // Optionally resend verification email
            await user.sendEmailVerification();
            return;
        }

        showAuthSuccess('Successfully signed in!');
        closeAuthModal();
    } catch (error) {
        showAuthError(error.message);
    }
}

async function signInWithGoogle() {
    // Show loading state
    const googleButton = document.querySelector('.google-button');
    const originalContent = googleButton.innerHTML;
    googleButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    googleButton.disabled = true;

    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Request additional permissions
    provider.addScope('email');
    provider.addScope('profile');
    
    // Set custom parameters
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Get additional profile info
        const profile = {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
        };

        // Save user data to database
        await saveUserToDb({
            ...user,
            profile,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        showAuthSuccess('Successfully signed in with Google!');
        closeAuthModal();
        
        // Update UI with profile picture if available
        updateUserProfileUI(profile);
    } catch (error) {
        let errorMessage = 'Google Sign-in failed';
        
        switch (error.code) {
            case 'auth/popup-blocked':
                errorMessage = 'Please enable popups to sign in with Google';
                break;
            case 'auth/popup-closed-by-user':
                errorMessage = 'Sign-in cancelled. Please try again';
                break;
            case 'auth/account-exists-with-different-credential':
                errorMessage = 'An account already exists with this email';
                break;
            default:
                errorMessage = error.message;
        }
        
        showAuthError(errorMessage);
    } finally {
        // Restore button state
        googleButton.innerHTML = originalContent;
        googleButton.disabled = false;
    }
}

// Add new function to update UI with profile
function updateUserProfileUI(profile) {
    const authButton = document.querySelector('.nav-button[onclick="openAuthModal()"]');
    
    if (profile.photoURL) {
        authButton.innerHTML = `
            <div class="user-profile">
                <img src="${profile.photoURL}" alt="Profile" class="profile-pic">
                <span>${profile.name}</span>
            </div>
        `;
    } else {
        authButton.innerHTML = `<i class="fas fa-user-check"></i> ${profile.name}`;
    }
}

// Helper Functions
function showAuthSuccess(message) {
    const status = document.getElementById('authStatus');
    status.textContent = message;
    status.className = 'submit-status success';
}

function showAuthError(message) {
    const status = document.getElementById('authStatus');
    status.textContent = message;
    status.className = 'submit-status error';
}

async function saveUserToDb(user) {
    try {
        await db.collection('users').doc(user.uid).set({
            name: user.displayName,
            email: user.email,
            emailVerified: user.emailVerified,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error saving user to database:', error);
    }
}

// Add verification status checker
function startVerificationCheck(user) {
    const checkInterval = setInterval(async () => {
        try {
            await user.reload();
            if (user.emailVerified) {
                clearInterval(checkInterval);
                showAuthSuccess('Email verified! You can now sign in');
                closeAuthModal();
                // Update UI to show verified status
                updateUserVerificationUI(true);
            }
        } catch (error) {
            console.error('Error checking verification status:', error);
        }
    }, 3000); // Check every 3 seconds

    // Stop checking after 5 minutes
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 300000);
}

// Add resend verification email function
async function resendVerificationEmail() {
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
        try {
            await user.sendEmailVerification();
            showAuthSuccess('Verification email resent');
        } catch (error) {
            showAuthError('Error sending verification email');
        }
    }
}

// Update UI based on verification status
function updateUserVerificationUI(isVerified) {
    const authButton = document.querySelector('.nav-button[onclick="openAuthModal()"]');
    if (isVerified) {
        authButton.innerHTML = `<i class="fas fa-user-check"></i> ${auth.currentUser.displayName || 'Verified User'}`;
    }
}

// Add observer for auth state changes
auth.onAuthStateChanged(user => {
    const authButton = document.querySelector('.nav-button[onclick="openAuthModal()"]');
    if (user) {
        if (user.emailVerified) {
            updateUserVerificationUI(true);
        } else {
            authButton.innerHTML = `<i class="fas fa-user-clock"></i> Pending Verification`;
        }
    } else {
        authButton.innerHTML = '<i class="fas fa-user-circle"></i> Sign In';
        authButton.onclick = () => openAuthModal();
    }
});
