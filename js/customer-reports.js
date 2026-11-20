import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const customerReportList = document.getElementById("customerReportList");

const startDateInput = document.getElementById("customerReportStart");
const endDateInput = document.getElementById("customerReportEnd");

const purchaseType = document.getElementById("customerPurchaseType");
const generateReportBtn = document.getElementById("generateCustomerReportBtn");

const customerReportSummary = document.getElementById("customerReportSummary");
const topCustomersList = document.getElementById("topCustomersList");
const customerPurchaseList = document.getElementById("customerPurchaseList");

let allCustomers = [];
let allOrders = [];

async function loadCustomerData() {
    const [customersSnapshot, ordersSnapshot] = await Promise.all([
        getDocs(collection(db, "customers")),
        getDocs(collection(db, "orders"))
    ]);

    allCustomers = [];
    allOrders = [];

    customersSnapshot.forEach((docSnap) => {
        allCustomers.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });

    ordersSnapshot.forEach((docSnap) => {
        allOrders.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });

    displayAllCustomers();
}

function displayAllCustomers() {
    customerReportList.innerHTML = "";

    allCustomers.forEach((customer) => {
        const row = document.createElement("tr");

        const registeredDate = customer.createdAt
            ? customer.createdAt.toDate().toLocaleDateString("en-IN")
            : "N/A";

        const values = [
            customer.id,
            customer.name || "",
            customer.email || "",
            customer.mobile || "",
            "₹" + (Number(customer.creditLimit) || 0).toFixed(2),
            "₹" + (Number(customer.creditUsed) || 0).toFixed(2),
            registeredDate
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        customerReportList.appendChild(row);
    });
}

function generateCustomerReport() {
    topCustomersList.innerHTML = "";
    customerPurchaseList.innerHTML = "";

    const startValue = startDateInput.value;
    const endValue = endDateInput.value;

    if (!startValue || !endValue) {
        customerReportSummary.textContent =
            "Select both start and end dates.";
        return;
    }

    const startDate = new Date(startValue + "T00:00:00");
    const endDate = new Date(endValue + "T23:59:59.999");

    if (startDate > endDate) {
        customerReportSummary.textContent =
            "Start date cannot be later than end date.";
        return;
    }

    const selectedType = purchaseType.value;

    const customerMap = {};

    allCustomers.forEach((customer) => {
        customerMap[customer.id] = customer;
    });

    const filteredOrders = allOrders.filter((order) => {
        if (!order.createdAt) {
            return false;
        }

        const orderDate = order.createdAt.toDate();

        const matchesDate =
            orderDate >= startDate && orderDate <= endDate;

        const matchesPayment =
            selectedType === "all" ||
            order.paymentMethod === selectedType;

        return matchesDate && matchesPayment;
    });

    const customerPurchases = {};

    let totalRevenue = 0;

    filteredOrders.forEach((order) => {
        const customerId = order.customerId;
        const customer = customerMap[customerId];

        const customerName = customer?.name || "Unknown Customer";
        const customerEmail =
            order.customerEmail || customer?.email || "";

        const total = Number(order.total) || 0;

        if (!customerPurchases[customerId]) {
            customerPurchases[customerId] = {
                name: customerName,
                email: customerEmail,
                total: 0
            };
        }

        customerPurchases[customerId].total += total;
        totalRevenue += total;

        const row = document.createElement("tr");

        const values = [
            order.orderId || order.id,
            customerEmail,
            order.createdAt.toDate().toLocaleDateString("en-IN"),
            order.paymentMethod || "",
            "₹" + total.toFixed(2)
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        customerPurchaseList.appendChild(row);
    });

    const topCustomers = Object.values(customerPurchases)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    topCustomers.forEach((customer, index) => {
        const row = document.createElement("tr");

        const values = [
            index + 1,
            customer.name,
            customer.email,
            "₹" + customer.total.toFixed(2)
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        topCustomersList.appendChild(row);
    });

    customerReportSummary.textContent =
        "Total Revenue: ₹" + totalRevenue.toFixed(2) +
        " | Total Orders: " + filteredOrders.length +
        " | Customers: " + Object.keys(customerPurchases).length;
}

generateReportBtn.addEventListener("click", generateCustomerReport);

async function initializeCustomerReports() {
    try {
        await loadCustomerData();
    } catch (error) {
        customerReportSummary.textContent =
            "Unable to load customer reports: " + error.message;
    }
}

initializeCustomerReports();