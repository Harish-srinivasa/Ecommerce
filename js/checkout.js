
import { auth, db } from "./firebase.js";

import {
    collection,
    doc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// HTML elements
const checkoutList = document.getElementById("checkoutList");
const checkoutTotal = document.getElementById("checkoutTotal");
const paymentMethod = document.getElementById("paymentMethod");
const checkoutMessage = document.getElementById("checkoutMessage");
const placeOrderBtn = document.getElementById("placeOrderBtn");

// Cart data
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentUser = null;

// Display order summary
function displayCheckout() {
    checkoutList.innerHTML = "";

    if (cart.length === 0) {
        checkoutMessage.textContent = "Your cart is empty.";
        checkoutTotal.textContent = "Total: ₹0";
        placeOrderBtn.disabled = true;
        return;
    }

    let total = 0;

    cart.forEach((item) => {
        const subtotal = Number(item.price) * Number(item.quantity);
        total += subtotal;

        const row = document.createElement("tr");

        const values = [
            item.title,
            "₹" + Number(item.price).toFixed(2),
            item.quantity,
            "₹" + subtotal.toFixed(2)
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        checkoutList.appendChild(row);
    });

    checkoutTotal.textContent = "Total: ₹" + total.toFixed(2);
}

// Place order
async function placeOrder() {
    if (!currentUser) {
        alert("Please login before placing an order.");
        window.location.href = "login.html";
        return;
    }

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const selectedPayment = paymentMethod.value;

    placeOrderBtn.disabled = true;
    checkoutMessage.textContent = "Processing your order...";

    try {
        const customerRef = doc(
            db,
            "customers",
            currentUser.uid
        );

        const orderRef = doc(collection(db, "orders"));

        await runTransaction(db, async (transaction) => {

            // Read customer details
            const customerSnapshot = await transaction.get(customerRef);

            if (!customerSnapshot.exists()) {
                throw new Error("Customer record not found.");
            }

            const customer = customerSnapshot.data();

            let total = 0;
            const orderItems = [];
            const productUpdates = [];

            // Read current product information from Firestore
            for (const item of cart) {

                const productRef = doc(
                    db,
                    "inventory",
                    item.id
                );

                const productSnapshot = await transaction.get(productRef);

                if (!productSnapshot.exists()) {
                    throw new Error(
                        "Product not found: " + item.title
                    );
                }

                const product = productSnapshot.data();

                const quantity = Number(item.quantity);
                const stock = Number(product.qty);
                const price = Number(product.price);

                if (product.active === false) {
                    throw new Error(
                        item.title + " is no longer available."
                    );
                }

                if (!Number.isInteger(quantity) || quantity <= 0) {
                    throw new Error("Invalid quantity for " + item.title);
                }

                if (stock < quantity) {
                    throw new Error(
                        "Insufficient stock for " + item.title
                    );
                }

                if (!Number.isFinite(price) || price < 0) {
                    throw new Error("Invalid price for " + item.title);
                }

                const subtotal = price * quantity;
                total += subtotal;

                orderItems.push({
                    productId: item.id,
                    title: product.title,
                    price: price,
                    quantity: quantity,
                    subtotal: subtotal
                });

                productUpdates.push({
                    ref: productRef,
                    newQuantity: stock - quantity
                });
            }

            // Validate customer's available credit
            const creditLimit = Number(customer.creditLimit || 0);
            const creditUsed = Number(customer.creditUsed || 0);

            if (selectedPayment === "credit") {

                const availableCredit = creditLimit - creditUsed;

                if (total > availableCredit) {
                    throw new Error(
                        "Insufficient credit limit. Available credit: ₹" +
                        Math.max(0, availableCredit).toFixed(2)
                    );
                }
            }

            // Update product stock
            productUpdates.forEach((update) => {
                transaction.update(update.ref, {
                    qty: update.newQuantity
                });
            });

            // Update credit usage
            if (selectedPayment === "credit") {
                transaction.update(customerRef, {
                    creditUsed: creditUsed + total
                });
            }

            // Create order record
            transaction.set(orderRef, {
                orderId: orderRef.id,
                customerId: currentUser.uid,
                customerEmail: currentUser.email,
                items: orderItems,
                total: total,
                paymentMethod: selectedPayment,
                paymentStatus: selectedPayment === "cash"
                    ? "Pending"
                    : "Credit",
                orderStatus: "Placed",
                createdAt: serverTimestamp()
            });
        });

        // Clear cart after successful order
        localStorage.removeItem("cart");

        alert("Order placed successfully!");

        window.location.href = "orders.html";

    } catch (error) {
        checkoutMessage.textContent = error.message;
        placeOrderBtn.disabled = false;
    }
}

// Authentication check
onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;
    displayCheckout();
});

// Event listener
placeOrderBtn.addEventListener("click", placeOrder);
