
/* ==========================================
   SMARTPLAN - FIREBASE AUTHENTICATION
========================================== */

import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile,
    signOut,
    sendPasswordResetEmail,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


/* ==========================================
   1. HTML ELEMENTS
========================================== */

const authScreen = document.querySelector("#auth-screen");
const authForm = document.querySelector("#auth-form");

const loginTab = document.querySelector("#login-tab");
const signupTab = document.querySelector("#signup-tab");

const authHeading = document.querySelector("#auth-heading");
const authDescription = document.querySelector("#auth-description");

const nameInput = document.querySelector("#auth-name");
const nameLabel = document.querySelector("#name-label");

const emailInput = document.querySelector("#auth-email");
const passwordInput = document.querySelector("#auth-password");

const togglePasswordButton = document.querySelector("#toggle-password");
const authSubmitButton = document.querySelector("#auth-submit");
const authError = document.querySelector("#auth-error");
const forgotPasswordButton = document.querySelector("#forgot-password-btn");
const changePasswordButton = document.querySelector("#change-password-btn");
const changePasswordModal = document.querySelector("#change-password-modal");
const changePasswordForm = document.querySelector("#change-password-form");
const closePasswordModal = document.querySelector("#close-password-modal");
const cancelPasswordChange = document.querySelector("#cancel-password-change");
const changePasswordMessage = document.querySelector("#change-password-message");

// Show / hide controls for all three Change Password fields
document.querySelectorAll(".password-visibility-toggle").forEach((button) => {
    button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.passwordTarget);
        if (!target) return;
        const shouldShow = target.type === "password";
        target.type = shouldShow ? "text" : "password";
        button.textContent = shouldShow ? "Hide" : "Show";
        button.setAttribute("aria-pressed", String(shouldShow));
    });
});

let currentMode = "login";


/* ==========================================
   2. CHECK REQUIRED HTML ELEMENTS
========================================== */

if (
    !authScreen ||
    !authForm ||
    !loginTab ||
    !signupTab ||
    !authHeading ||
    !authDescription ||
    !nameInput ||
    !nameLabel ||
    !emailInput ||
    !passwordInput ||
    !togglePasswordButton ||
    !authSubmitButton ||
    !authError
) {
    console.error(
        "SmartPlan: One or more authentication HTML elements are missing. Check index.html."
    );
}


/* ==========================================
   3. LOGIN / SIGNUP MODE
========================================== */

function setMode(mode) {
    currentMode = mode;

    const isSignup = mode === "signup";

    loginTab.classList.toggle("active", !isSignup);
    signupTab.classList.toggle("active", isSignup);

    nameInput.hidden = !isSignup;
    nameLabel.hidden = !isSignup;

    nameInput.required = isSignup;

    passwordInput.autocomplete = isSignup
        ? "new-password"
        : "current-password";

    authHeading.textContent = isSignup
        ? "Create your account"
        : "Welcome back!";

    authDescription.textContent = isSignup
        ? "Sign up to get started with SmartPlan."
        : "Login to continue to SmartPlan.";

    authSubmitButton.textContent = isSignup
        ? "Create Account"
        : "Login";

    if (forgotPasswordButton) forgotPasswordButton.hidden = isSignup;
    authError.textContent = "";
}

loginTab.addEventListener("click", () => {
    setMode("login");
});

signupTab.addEventListener("click", () => {
    setMode("signup");
});


/* ==========================================
   4. SHOW / HIDE PASSWORD
========================================== */

togglePasswordButton.addEventListener("click", (event) => {
    event.preventDefault();

    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";

    togglePasswordButton.textContent = isPassword
        ? "Hide"
        : "Show";
});


/* ==========================================
   5. FORGOT PASSWORD
========================================== */

forgotPasswordButton?.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    authError.textContent = "";

    if (!email) {
        authError.textContent = "Enter your email address first, then choose Forgot password.";
        emailInput.focus();
        return;
    }

    forgotPasswordButton.disabled = true;
    forgotPasswordButton.textContent = "Sending reset link...";

    try {
        await sendPasswordResetEmail(auth, email);
        authError.textContent = "If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.";
    } catch (error) {
        if (error.code === "auth/invalid-email") {
            authError.textContent = "Please enter a valid email address.";
        } else if (error.code === "auth/too-many-requests") {
            authError.textContent = "Too many attempts. Please try again later.";
        } else {
            console.error("SmartPlan password reset error:", error);
            authError.textContent = "Unable to send the reset email right now. Please try again.";
        }
    } finally {
        forgotPasswordButton.disabled = false;
        forgotPasswordButton.textContent = "Forgot password?";
    }
});


/* ==========================================
   6. CHANGE PASSWORD (SIGNED-IN USER)
========================================== */

function closeChangePasswordModal() {
    changePasswordModal.hidden = true;
    changePasswordForm.reset();
    changePasswordMessage.textContent = "";
}

changePasswordButton?.addEventListener("click", () => {
    if (!auth.currentUser) return;
    changePasswordMessage.textContent = "";
    changePasswordModal.hidden = false;
    document.querySelector("#current-password")?.focus();
});

closePasswordModal?.addEventListener("click", closeChangePasswordModal);
cancelPasswordChange?.addEventListener("click", closeChangePasswordModal);
changePasswordModal?.addEventListener("click", (event) => {
    if (event.target === changePasswordModal) closeChangePasswordModal();
});

changePasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    const currentPassword = document.querySelector("#current-password").value;
    const newPassword = document.querySelector("#new-password").value;
    const confirmPassword = document.querySelector("#confirm-new-password").value;
    const saveButton = document.querySelector("#save-new-password");
    changePasswordMessage.textContent = "";

    if (!user || !user.email) {
        changePasswordMessage.textContent = "Please log in again to change your password.";
        return;
    }
    if (newPassword.length < 6) {
        changePasswordMessage.textContent = "New password must be at least 6 characters.";
        return;
    }
    if (newPassword !== confirmPassword) {
        changePasswordMessage.textContent = "New password and confirmation do not match.";
        return;
    }
    if (currentPassword === newPassword) {
        changePasswordMessage.textContent = "Choose a password different from your current password.";
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Updating...";
    try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        changePasswordMessage.classList.remove("auth-error");
        changePasswordMessage.classList.add("auth-success");
        changePasswordMessage.textContent = "Password updated successfully.";
        changePasswordForm.reset();
        setTimeout(() => closeChangePasswordModal(), 1200);
    } catch (error) {
        console.error("SmartPlan change password error:", error);
        changePasswordMessage.classList.remove("auth-success");
        changePasswordMessage.classList.add("auth-error");
        if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
            changePasswordMessage.textContent = "Your current password is incorrect.";
        } else if (error.code === "auth/weak-password") {
            changePasswordMessage.textContent = "Choose a stronger password (at least 6 characters).";
        } else if (error.code === "auth/requires-recent-login") {
            changePasswordMessage.textContent = "For security, log out and log in again, then retry.";
        } else {
            changePasswordMessage.textContent = "Could not update the password. Please try again.";
        }
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Update Password";
    }
});


/* ==========================================
   7. FRIENDLY ERROR MESSAGES
========================================== */

function getFriendlyError(error) {
    switch (error.code) {
        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/missing-password":
            return "Please enter your password.";

        case "auth/weak-password":
            return "Choose a stronger password with at least 6 characters.";

        case "auth/email-already-in-use":
            return "An account already exists with this email. Try logging in.";

        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
            return "Incorrect email or password.";

        case "auth/user-disabled":
            return "This account has been disabled.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";

        case "auth/operation-not-allowed":
            return "Email/Password sign-in is not enabled in Firebase.";

        case "auth/api-key-not-valid":
            return "Your Firebase API key is invalid. Check your configuration.";

        default:
            console.error("Firebase authentication error:", error);

            return error.message ||
                "Something went wrong. Please try again.";
    }
}


/* ==========================================
   6. LOGIN / SIGNUP FORM
========================================== */

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    authError.textContent = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = nameInput.value.trim();

    if (currentMode === "signup" && !fullName) {
        authError.textContent = "Please enter your full name.";
        nameInput.focus();
        return;
    }

    if (!email) {
        authError.textContent = "Please enter your email address.";
        emailInput.focus();
        return;
    }

    if (password.length < 6) {
        authError.textContent =
            "Password must be at least 6 characters.";

        passwordInput.focus();
        return;
    }

    authSubmitButton.disabled = true;

    authSubmitButton.textContent =
        currentMode === "signup"
            ? "Creating account..."
            : "Logging in...";

    try {
        if (currentMode === "signup") {
            const result = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            await updateProfile(result.user, {
                displayName: fullName
            });

            console.log("SmartPlan: Account created successfully.");
        } else {
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            console.log("SmartPlan: Login successful.");
        }

        authForm.reset();

        passwordInput.type = "password";
        togglePasswordButton.textContent = "Show";

        authError.textContent = "";

    } catch (error) {
        console.error("SmartPlan authentication error:", error);

        authError.textContent = getFriendlyError(error);

    } finally {
        authSubmitButton.disabled = false;

        authSubmitButton.textContent =
            currentMode === "signup"
                ? "Create Account"
                : "Login";
    }
});


/* ==========================================
   7. AUTHENTICATION SESSION
========================================== */

onAuthStateChanged(
    auth,
    (user) => {
        console.log(
            "SmartPlan auth state:",
            user ? `Logged in as ${user.email}` : "Logged out"
        );

        if (user) {
            authScreen.hidden = true;
            window.dispatchEvent(new CustomEvent("smartplan:auth", { detail: { displayName: user.displayName || "", email: user.email || "" } }));
        } else {
            authScreen.hidden = false;
            setMode("login");
        }
    },
    (error) => {
        console.error(
            "SmartPlan auth session error:",
            error
        );
    }
);


/* ==========================================
   8. LOGOUT HELPER
========================================== */

async function logoutUser() {
    if (!auth.currentUser) {
        console.warn("SmartPlan: No signed-in user found.");
        return;
    }

    try {
        await signOut(auth);

        console.log("SmartPlan: Logout successful.");

        // onAuthStateChanged will display the login screen.

    } catch (error) {
        console.error(
            "SmartPlan logout error:",
            error.code,
            error.message
        );

        alert(
            `Logout failed: ${error.message || "Please try again."}`
        );

        throw error;
    }
}


/* ==========================================
   9. LOGOUT BUTTON
========================================== */

function initializeLogoutButton() {
    const logoutButton = document.getElementById("logout-btn");

    if (!logoutButton) {
        console.error(
            'SmartPlan: Logout button not found. Check id="logout-btn" in index.html.'
        );
        return;
    }

    // Avoid attaching the same listener more than once.
    if (logoutButton.dataset.logoutInitialized === "true") {
        return;
    }

    logoutButton.dataset.logoutInitialized = "true";

    logoutButton.addEventListener("click", async (event) => {
        event.preventDefault();

        if (logoutButton.disabled) {
            return;
        }

        console.log("SmartPlan: Logout button clicked.");

        logoutButton.disabled = true;

        try {
            await logoutUser();
        } catch (error) {
            // logoutUser already logs and displays the error.
        } finally {
            logoutButton.disabled = false;
        }
    });

    console.log("SmartPlan: Logout button initialized.");
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeLogoutButton,
        { once: true }
    );
} else {
    initializeLogoutButton();
}


/* ==========================================
   10. INITIALIZATION COMPLETE
========================================== */

console.log("SmartPlan Firebase authentication initialized.");


// Keep the editable profile name in sync with the Firebase account display name.
window.addEventListener("smartplan:profile-update", async (event) => {
    const user = auth.currentUser;
    const displayName = String(event.detail?.displayName || "").trim();
    if (!user || !displayName) return;
    try { await updateProfile(user, { displayName }); }
    catch (error) { console.error("Could not update Firebase display name:", error); }
});
