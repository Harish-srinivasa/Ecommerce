
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


// CHANGE THIS TO YOUR ADMIN EMAIL
const ADMIN_EMAIL = "srinivasanharish55@gmail.com";


// CUSTOMER SIGN UP

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim().toLowerCase();
        const mobile = document.getElementById("signupMobile").value.trim();
        const password = document.getElementById("signupPassword").value;

        if (!name || !email || !mobile || !password) {
            alert("All fields are required.");
            return;
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
            alert("Enter a valid 10-digit mobile number.");
            return;
        }

        if (password.length < 6) {
            alert("Password must contain at least 6 characters.");
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
                    createdAt: serverTimestamp()
                });

                alert("Registration successful!");

                window.location.href = "login.html";
            }

        } catch (error) {

            alert(error.message);

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
            document.getElementById("loginEmail").value.trim();

        if (!email) {
            alert("Enter your email address first.");
            return;
        }

        try {

            await sendPasswordResetEmail(auth, email);

            alert("Password reset email sent successfully!");

        } catch (error) {

            alert(error.message);

        }

    });

}
