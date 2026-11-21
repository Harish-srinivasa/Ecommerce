
import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ADMIN EMAIL
const ADMIN_EMAIL = "srinivasanharish55@gmail.com";


// SIGNUP VALIDATION
function validateSignup(name, email, mobile, password) {

    if (name.trim().length < 2) {
        return "Name must contain at least 2 characters.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        return "Enter a valid email address.";
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
        return "Mobile number must contain exactly 10 digits.";
    }

    if (password.length < 8) {
        return "Password must contain at least 8 characters.";
    }

    return null;
}


// CUSTOMER SIGN UP

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim().toLowerCase();
        const mobile = document.getElementById("signupMobile").value.trim();
        const password = document.getElementById("signupPassword").value;

        // VALIDATE INPUTS
        const validationError = validateSignup(
            name,
            email,
            mobile,
            password
        );

        if (validationError) {
            alert(validationError);
            return;
        }

        try {

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth, email, password
                );

            const user = userCredential.user;

            if (email === ADMIN_EMAIL.toLowerCase()) {

                alert("Admin account created successfully!");
                window.location.href = "admin.html";

            } else {

                await setDoc(doc(db, "customers", user.uid), {
                    id: user.uid,
                    name: name,
                    email: email,
                    mobile: mobile,
                    creditLimit: 0,
                    creditUsed: 0,
                    createdAt: serverTimestamp()
                });

                alert("Registration successful!");

                window.location.href = "login.html";
            }

        } catch (error) {

            alert("Signup failed: " + error.message);

        }

    });

}


// CUSTOMER / ADMIN LOGIN

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim().toLowerCase();
        const password = document.getElementById("loginPassword").value;

        if (!email || !password) {
            alert("Email and password are required.");
            return;
        }

        try {

            await signInWithEmailAndPassword(
                auth, email, password
            );

            if (email === ADMIN_EMAIL.toLowerCase()) {

                alert("Admin login successful!");
                window.location.href = "admin.html";

            } else {

                alert("Customer login successful!");
                window.location.href = "products.html";

            }

        } catch (error) {

            alert("Login failed: " + error.message);

        }

    });

}


// PASSWORD RESET

const resetPasswordBtn =
    document.getElementById("resetPasswordBtn");

if (resetPasswordBtn) {

    resetPasswordBtn.addEventListener("click", async () => {

        const email =
            document.getElementById("loginEmail").value.trim().toLowerCase();

        if (!email) {
            alert("Enter your email address first.");
            return;
        }

        try {

            await sendPasswordResetEmail(auth, email);

            alert("Password reset email sent successfully!");

        } catch (error) {

            alert("Password reset failed: " + error.message);

        }

    });

}
