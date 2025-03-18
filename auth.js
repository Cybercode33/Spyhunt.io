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
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    
    try {
        const result = await auth.signInWithPopup(provider);
        await saveUserToDb(result.user);
        showAuthSuccess('Successfully signed in with Google!');
        closeAuthModal();
    } catch (error) {
        showAuthError(error.message);
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