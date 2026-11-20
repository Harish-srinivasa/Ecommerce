
import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const ordersList = document.getElementById("ordersList");
const orderMessage = document.getElementById("orderMessage");
const billDetails = document.getElementById("billDetails");
const billSection = document.getElementById("billSection");
const printBillBtn = document.getElementById("printBillBtn");

billSection.style.display = "none";

let customerOrders = [];

// Format date
function formatDate(timestamp) {
    if (!timestamp) return "N/A";

    return timestamp.toDate().toLocaleString("en-IN");
}

// Load customer orders
async function loadOrders(user) {
    try {
        const ordersQuery = query(
            collection(db, "orders"),
            where("customerId", "==", user.uid)
        );

        const snapshot = await getDocs(ordersQuery);

        customerOrders = [];

        snapshot.forEach((docSnap) => {
            customerOrders.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        // Sort newest orders first
        customerOrders.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;

            return dateB - dateA;
        });

        displayOrders();

    } catch (error) {
        orderMessage.textContent =
            "Unable to load orders: " + error.message;
    }
}

// Display order history
function displayOrders() {
    ordersList.innerHTML = "";

    if (customerOrders.length === 0) {
        orderMessage.textContent = "You have not placed any orders yet.";
        return;
    }

    orderMessage.textContent = "";

    customerOrders.forEach((order) => {
        const row = document.createElement("tr");

        const values = [
            order.orderId || order.id,
            formatDate(order.createdAt),
            "₹" + Number(order.total).toFixed(2),
            order.paymentMethod,
            order.paymentStatus,
            order.orderStatus
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const billCell = document.createElement("td");

        const viewButton = document.createElement("button");
        viewButton.textContent = "View Bill";

        viewButton.addEventListener("click", () => {
            displayBill(order);
        });

        billCell.appendChild(viewButton);
        row.appendChild(billCell);

        ordersList.appendChild(row);
    });
}

// Display individual bill
function displayBill(order) {
    billDetails.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = "Online Shopping - Invoice";

    const orderId = document.createElement("p");
    orderId.textContent = "Order ID: " + (order.orderId || order.id);

    const customerEmail = document.createElement("p");
    customerEmail.textContent = "Customer: " + order.customerEmail;

    const date = document.createElement("p");
    date.textContent = "Date: " + formatDate(order.createdAt);

    billDetails.append(heading, orderId, customerEmail, date);

    const table = document.createElement("table");
    table.border = "1";
    table.cellPadding = "10";

    const headerRow = document.createElement("tr");

    ["Product", "Price", "Quantity", "Subtotal"].forEach((heading) => {
        const th = document.createElement("th");
        th.textContent = heading;
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    (order.items || []).forEach((item) => {
        const row = document.createElement("tr");

        [
            item.title,
            "₹" + Number(item.price).toFixed(2),
            item.quantity,
            "₹" + Number(item.subtotal).toFixed(2)
        ].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        table.appendChild(row);
    });

    const total = document.createElement("h3");
    total.textContent = "Grand Total: ₹" +
        Number(order.total).toFixed(2);

    const payment = document.createElement("p");
    payment.textContent =
        "Payment Method: " + order.paymentMethod;

    const status = document.createElement("p");
    status.textContent =
        "Payment Status: " + order.paymentStatus;

    billDetails.append(
        table,
        total,
        payment,
        status
    );

    billSection.style.display = "block";
    billSection.scrollIntoView({ behavior: "smooth" });
}

// Authentication
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    loadOrders(user);
});
