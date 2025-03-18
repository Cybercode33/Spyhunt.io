document.addEventListener('DOMContentLoaded', () => {
    // Existing transition code
    setTimeout(() => {
        document.querySelector('.page-transition')?.classList.add('page-visible');
    }, 100);

    // Add real-time validation listeners
    const form = document.getElementById('supportForm');
    if (form) {
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            field.addEventListener('input', () => validateField(field));
            field.addEventListener('blur', () => validateField(field));
        });

        // Special validation for email
        const emailField = form.querySelector('#email');
        if (emailField) {
            emailField.addEventListener('input', () => validateEmail(emailField));
        }
    }

    // Add form validation for submit button
    const submitBtn = document.getElementById('submitBtn');
    
    if (form) {
        const requiredFields = form.querySelectorAll('[required]');
        
        // Check form validity on any input change
        form.addEventListener('input', () => {
            let isValid = true;
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                }
                if (field.type === 'email' && !isValidEmail(field.value)) {
                    isValid = false;
                }
            });
            submitBtn.disabled = !isValid;
        });
    }
});

function openSupportForm() {
    document.getElementById('supportModal').style.display = 'block';
    setTimeout(() => {
        document.querySelector('#supportModal .modal-content').classList.add('page-visible');
    }, 100);
}

function closeSupportForm() {
    const modal = document.getElementById('supportModal');
    const content = document.querySelector('#supportModal .modal-content');
    content.classList.remove('page-visible');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 500);
}

let lastSubmissionTime = 0;
const SUBMISSION_COOLDOWN = 600000; // 10 minutes in milliseconds

function submitForm(event) {
    event.preventDefault();
    
    // Check submission cooldown
    const currentTime = Date.now();
    if (currentTime - lastSubmissionTime < SUBMISSION_COOLDOWN) {
        showError('Please wait before submitting another request.');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate required fields
    if (!validateForm(data)) {
        return;
    }

    // Prepare email content
    const emailSubject = `New Support Request - ${data.issueType} from ${data.fullName}`;
    const emailBody = formatEmailBody(data);

    // Send email (requires backend implementation)
    sendSupportEmail(emailSubject, emailBody, data.email)
        .then(() => {
            lastSubmissionTime = currentTime;
            showSuccessMessage(data.issueType);
            form.reset();
            setTimeout(closeSupportForm, 3000);
        })
        .catch(error => {
            showError('Failed to send support request. Please try again later.');
        });
}

// Update validateField function
function validateField(field) {
    const errorSpan = field.closest('.form-group').querySelector('.error-message');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!field.value.trim()) {
        field.classList.add('error');
        errorSpan.textContent = '▲'; // Using triangle symbol
        errorSpan.classList.add('visible');
        submitBtn.disabled = true;
        return false;
    } else {
        field.classList.remove('error');
        errorSpan.classList.remove('visible');
        setTimeout(() => {
            errorSpan.textContent = '';
        }, 300);
        checkFormValidity();
        return true;
    }
}

// Update validateEmail function
function validateEmail(field) {
    const errorSpan = field.closest('.form-group').querySelector('.error-message');
    
    if (!field.value.trim() || !isValidEmail(field.value)) {
        field.classList.add('error');
        errorSpan.textContent = '▲'; // Using triangle symbol
        errorSpan.classList.add('visible');
        return false;
    } else {
        field.classList.remove('error');
        errorSpan.classList.remove('visible');
        setTimeout(() => {
            errorSpan.textContent = '';
        }, 300);
        return true;
    }
}

// Update the existing validateForm function
function validateForm(data) {
    let isValid = true;
    const form = document.getElementById('supportForm');
    const requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
        if (field.id === 'email') {
            isValid = validateEmail(field) && isValid;
        } else {
            isValid = validateField(field) && isValid;
        }
    });

    return isValid;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorSpan = field.nextElementSibling;
    if (errorSpan) {
        errorSpan.textContent = message;
    }
    field.classList.add('error');
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(span => span.textContent = '');
    document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
}

function showSuccessMessage(issueType) {
    const status = document.getElementById('submitStatus');
    const message = isUrgentIssue(issueType) 
        ? "Thank you! The support team will contact you soon."
        : "Thanks for letting us know! Have a great day.";
    
    status.textContent = message;
    status.className = 'submit-status success';
}

function isUrgentIssue(issueType) {
    return ['bug', 'bot', 'game'].includes(issueType);
}

function showError(message) {
    const status = document.getElementById('submitStatus');
    status.textContent = message;
    status.className = 'submit-status error';
}

// Example email sending function (replace with actual implementation)
async function sendSupportEmail(subject, body, replyTo) {
    // Implement your email sending logic here
    // This could use a backend API endpoint or email service
    
    // For demonstration, we'll simulate a successful email send
    return new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
}

function formatEmailBody(data) {
    return `
Support Request Details:
----------------------
Name: ${data.fullName}
Discord ID: ${data.discordId || 'Not provided'}
Email: ${data.email}
Issue Type: ${data.issueType}

Description:
${data.description}
    `.trim();
}

// Add new function to check overall form validity
function checkFormValidity() {
    const form = document.getElementById('supportForm');
    const submitBtn = document.getElementById('submitBtn');
    const requiredFields = form.querySelectorAll('[required]');
    
    let isValid = true;
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
        }
        if (field.type === 'email' && !isValidEmail(field.value)) {
            isValid = false;
        }
    });
    
    submitBtn.disabled = !isValid;
}