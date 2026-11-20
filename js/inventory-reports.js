import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const stockReportType = document.getElementById("stockReportType");
const stockReportCategory = document.getElementById("stockReportCategory");
const generateStockReportBtn = document.getElementById("generateStockReportBtn");

const stockReportSummary = document.getElementById("stockReportSummary");
const stockReportList = document.getElementById("stockReportList");

let allInventory = [];
let categoryNames = {};

async function loadStockData() {
    const [inventorySnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(collection(db, "inventory")),
        getDocs(collection(db, "categories"))
    ]);

    allInventory = [];
    categoryNames = {};

    categoriesSnapshot.forEach((docSnap) => {
        categoryNames[docSnap.id] = docSnap.data().name;
    });

    categoriesSnapshot.forEach((docSnap) => {
        const option = document.createElement("option");
        option.value = docSnap.id;
        option.textContent = docSnap.data().name;
        stockReportCategory.appendChild(option);
    });

    inventorySnapshot.forEach((docSnap) => {
        allInventory.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });
}

function generateStockReport() {
    stockReportList.innerHTML = "";

    const selectedType = stockReportType.value;
    const selectedCategory = stockReportCategory.value;

    let filteredInventory = allInventory.filter((product) => {
        const quantity = Number(product.qty) || 0;

        if (selectedType === "high" && quantity <= 100) {
            return false;
        }

        if (selectedType === "low" && quantity >= 15) {
            return false;
        }

        if (
            selectedCategory !== "all" &&
            product.catId !== selectedCategory
        ) {
            return false;
        }

        return true;
    });

    if (selectedType === "category" && selectedCategory === "all") {
        stockReportSummary.textContent =
            "Select a category to generate a category-wise report.";
        return;
    }

    let totalUnits = 0;

    filteredInventory.forEach((product) => {
        const quantity = Number(product.qty) || 0;
        totalUnits += quantity;

        const row = document.createElement("tr");

        const values = [
            product.id,
            product.title || "",
            categoryNames[product.catId] || "Unknown",
            quantity,
            "₹" + (Number(product.price) || 0).toFixed(2),
            product.active === false ? "Inactive" : "Active"
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        stockReportList.appendChild(row);
    });

    stockReportSummary.textContent =
        "Products: " + filteredInventory.length +
        " | Total Stock Units: " + totalUnits;
}

generateStockReportBtn.addEventListener("click", generateStockReport);

stockReportType.addEventListener("change", () => {
    stockReportCategory.disabled = stockReportType.value !== "category";

    if (stockReportType.value !== "category") {
        stockReportCategory.value = "all";
    }
});

async function initializeStockReports() {
    try {
        await loadStockData();
        stockReportCategory.disabled = true;
        generateStockReport();
    } catch (error) {
        stockReportSummary.textContent =
            "Unable to load inventory reports: " + error.message;
    }
}

initializeStockReports();