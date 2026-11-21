
import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const startDateInput = document.getElementById("reportStartDate");
const endDateInput = document.getElementById("reportEndDate");
const reportType = document.getElementById("reportType");
const reportCategory = document.getElementById("reportCategory");
const generateReportBtn = document.getElementById("generateReportBtn");

const reportSummary = document.getElementById("reportSummary");
const salesReportList = document.getElementById("salesReportList");
const topProductsList = document.getElementById("topProductsList");
const bottomProductsList = document.getElementById("bottomProductsList");

let allOrders = [];
let allInventory = [];
let categoryNames = {};

// Load report data from Firestore
async function loadReportData() {
    const [ordersSnapshot, inventorySnapshot, categoriesSnapshot] =
        await Promise.all([
            getDocs(collection(db, "orders")),
            getDocs(collection(db, "inventory")),
            getDocs(collection(db, "categories"))
        ]);

    allOrders = [];
    allInventory = [];
    categoryNames = {};

    categoriesSnapshot.forEach((docSnap) => {
        categoryNames[docSnap.id] = docSnap.data().name;
    });

    inventorySnapshot.forEach((docSnap) => {
        allInventory.push({
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

    // Populate category dropdown
    Object.entries(categoryNames).forEach(([id, name]) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = name;
        reportCategory.appendChild(option);
    });
}

// Generate report
function generateReport() {
    salesReportList.innerHTML = "";
    topProductsList.innerHTML = "";
    bottomProductsList.innerHTML = "";

    const startValue = startDateInput.value;
    const endValue = endDateInput.value;

    if (!startValue || !endValue) {
        reportSummary.textContent = "Select both start and end dates.";
        return;
    }

    const startDate = new Date(startValue + "T00:00:00");
    const endDate = new Date(endValue + "T23:59:59.999");

    if (startDate > endDate) {
        reportSummary.textContent =
            "Start date cannot be later than end date.";
        return;
    }

    const selectedType = reportType.value;
    const selectedCategory = reportCategory.value;

    const inventoryMap = {};

    allInventory.forEach((product) => {
        inventoryMap[product.id] = product;
    });

    // Filter orders by date and payment type
    const filteredOrders = allOrders.filter((order) => {
        if (!order.createdAt) return false;

        const orderDate = order.createdAt.toDate();

        const matchesDate =
            orderDate >= startDate && orderDate <= endDate;

        const matchesPayment =
            selectedType === "all" ||
            selectedType === "category" ||
            order.paymentMethod === selectedType;

        return matchesDate && matchesPayment;
    });

    const salesRows = [];
    const productSales = {};

    // Include all inventory products for bottom-selling report
    allInventory.forEach((product) => {
        if (
            selectedCategory === "all" ||
            product.catId === selectedCategory
        ) {
            productSales[product.id] = {
                title: product.title,
                quantity: 0
            };
        }
    });

    let totalRevenue = 0;
    let totalUnits = 0;
    const matchingOrderIds = new Set();

    filteredOrders.forEach((order) => {
        (order.items || []).forEach((item) => {
            const currentProduct = inventoryMap[item.productId];

            const categoryId =
                item.catId || currentProduct?.catId || "";

            const categoryName =
                item.categoryName ||
                categoryNames[categoryId] ||
                "Unknown";

            if (
                selectedType === "category" &&
                selectedCategory !== "all" &&
                categoryId !== selectedCategory
            ) {
                return;
            }

            if (
                selectedType !== "category" &&
                selectedCategory !== "all" &&
                categoryId !== selectedCategory
            ) {
                return;
            }

            const quantity = Number(item.quantity) || 0;
            const subtotal = Number(item.subtotal) ||
                Number(item.price) * quantity;

            salesRows.push({
                orderId: order.orderId || order.id,
                date: order.createdAt.toDate(),
                email: order.customerEmail || "",
                payment: order.paymentMethod || "",
                title: item.title,
                category: categoryName,
                quantity,
                subtotal
            });

            totalRevenue += subtotal;
            totalUnits += quantity;
            matchingOrderIds.add(order.id);

            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    title: item.title,
                    quantity: 0
                };
            }

            productSales[item.productId].quantity += quantity;
        });
    });

    // Display sales table
    salesRows.forEach((sale) => {
        const row = document.createElement("tr");

        const values = [
            sale.orderId,
            sale.date.toLocaleDateString("en-IN"),
            sale.email,
            sale.payment,
            sale.title,
            sale.category,
            sale.quantity,
            "₹" + sale.subtotal.toFixed(2)
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        salesReportList.appendChild(row);
    });

    // Sort products by units sold
    const products = Object.values(productSales);

    const topProducts = [...products]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

    const bottomProducts = [...products]
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 10);

    displayProductRanking(topProducts, topProductsList);
    displayProductRanking(bottomProducts, bottomProductsList);

    reportSummary.textContent =
        "Total Sales: ₹" + totalRevenue.toFixed(2) +
        " | Units Sold: " + totalUnits +
        " | Orders: " + matchingOrderIds.size;
}

// Display top and bottom products
function displayProductRanking(products, tableBody) {
    tableBody.innerHTML = "";

    products.forEach((product) => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = product.title;

        const quantityCell = document.createElement("td");
        quantityCell.textContent = product.quantity;

        row.append(nameCell, quantityCell);
        tableBody.appendChild(row);
    });
}

// Event listener
generateReportBtn.addEventListener("click", generateReport);

// Initialize
async function initializeReports() {
    try {
        await loadReportData();
    } catch (error) {
        reportSummary.textContent =
            "Unable to load reports: " + error.message;
    }
}

initializeReports();
