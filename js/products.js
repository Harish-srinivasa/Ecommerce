
import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// HTML elements
const productList = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const previousPage = document.getElementById("previousPage");
const nextPage = document.getElementById("nextPage");
const pageNumber = document.getElementById("pageNumber");
const productMessage = document.getElementById("productMessage");

// Variables
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;

const productsPerPage = 6;

// Load categories from Firestore
async function loadCategories() {
    const snapshot = await getDocs(collection(db, "categories"));

    snapshot.forEach((docSnap) => {
        const category = docSnap.data();

        const option = document.createElement("option");
        option.value = docSnap.id;
        option.textContent = category.name;

        categoryFilter.appendChild(option);
    });
}

// Load products from Firestore
async function loadProducts() {
    const snapshot = await getDocs(collection(db, "inventory"));

    const categorySnapshot = await getDocs(collection(db, "categories"));

    const categories = {};

    categorySnapshot.forEach((docSnap) => {
        categories[docSnap.id] = docSnap.data().name;
    });

    allProducts = [];

    snapshot.forEach((docSnap) => {
        const product = docSnap.data();

        // Display only active products
        if (product.active !== false) {
            allProducts.push({
                id: docSnap.id,
                ...product,
                categoryName: categories[product.catId] || "Unknown"
            });
        }
    });

    filteredProducts = [...allProducts];

    displayProducts();
}

// Display products
function displayProducts() {
    productList.innerHTML = "";

    const totalPages = Math.ceil(
        filteredProducts.length / productsPerPage
    );

    if (filteredProducts.length === 0) {
        productMessage.textContent = "No products found.";
        pageNumber.textContent = "0";
        previousPage.disabled = true;
        nextPage.disabled = true;
        return;
    }

    productMessage.textContent = "";

    const startIndex = (currentPage - 1) * productsPerPage;

    const productsToDisplay = filteredProducts.slice(
        startIndex,
        startIndex + productsPerPage
    );

    productsToDisplay.forEach((product) => {
        const card = document.createElement("div");
        card.className = "product-card";

        const title = document.createElement("h3");
        title.textContent = product.title;

        const category = document.createElement("p");
        category.textContent = "Category: " + product.categoryName;

        const description = document.createElement("p");
        description.textContent = product.description || "";

        const price = document.createElement("p");
        price.textContent = "Price: ₹" + product.price;

        const quantity = document.createElement("p");
        quantity.textContent = "Available: " + product.qty;

        const addButton = document.createElement("button");
        addButton.textContent = "Add to Cart";

        addButton.disabled = Number(product.qty) <= 0;

        addButton.addEventListener("click", () => {
            addToCart(product);
        });

        card.append(
            title,
            category,
            description,
            price,
            quantity,
            addButton
        );

        productList.appendChild(card);
    });

    pageNumber.textContent = `${currentPage} of ${totalPages}`;

    previousPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;
}

// Search and category filtering
// AJAX search using jQuery and Firestore REST API
async function filterProducts() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;

    try {
        const user = auth.currentUser;

        if (!user) {
            // Fallback to already loaded products if not authenticated
            applyLocalFilter(searchText, selectedCategory);
            return;
        }

        const token = await user.getIdToken();

        $.ajax({
            url: `https://firestore.googleapis.com/v1/projects/ecommerce-bc4d2/databases/(default)/documents/inventory`,
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            },
            dataType: "json",

            success: function (response) {
                const ajaxProducts = (response.documents || []).map(doc => {
                    const fields = doc.fields || {};

                    function getValue(field) {
                        if (!field) return null;

                        if (field.stringValue !== undefined)
                            return field.stringValue;

                        if (field.integerValue !== undefined)
                            return Number(field.integerValue);

                        if (field.doubleValue !== undefined)
                            return Number(field.doubleValue);

                        if (field.booleanValue !== undefined)
                            return field.booleanValue;

                        return null;
                    }

                    const id = doc.name.split("/").pop();

                    return {
                        id,
                        title: getValue(fields.title),
                        description: getValue(fields.description),
                        catId: getValue(fields.catId),
                        qty: getValue(fields.qty),
                        price: getValue(fields.price),
                        active: getValue(fields.active)
                    };
                });

                filteredProducts = ajaxProducts.filter(product => {
                    const matchesSearch =
                        (product.title || "").toLowerCase().includes(searchText) ||
                        product.id.toLowerCase().includes(searchText);

                    const matchesCategory =
                        selectedCategory === "all" ||
                        product.catId === selectedCategory;

                    return matchesSearch &&
                        matchesCategory &&
                        product.active !== false;
                });

                // Restore category names from previously loaded products
                filteredProducts = filteredProducts.map(product => {
                    const existing = allProducts.find(p => p.id === product.id);

                    return {
                        ...product,
                        categoryName: existing?.categoryName || "Unknown"
                    };
                });

                currentPage = 1;
                displayProducts();
            },

            error: function (xhr) {
                console.error("AJAX search failed:", xhr.responseText);

                // Fallback to locally loaded Firestore data
                applyLocalFilter(searchText, selectedCategory);
            }
        });

    } catch (error) {
        console.error("Search error:", error);
        applyLocalFilter(searchText, selectedCategory);
    }
}

// Local fallback search
function applyLocalFilter(searchText, selectedCategory) {
    filteredProducts = allProducts.filter(product => {
        const matchesSearch =
            product.title.toLowerCase().includes(searchText) ||
            product.id.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "all" ||
            product.catId === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    currentPage = 1;
    displayProducts();
}

// Add product to cart using localStorage
function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existingProduct = cart.find(
        (item) => item.id === product.id
    );

    if (existingProduct) {
        if (existingProduct.quantity >= Number(product.qty)) {
            alert("Maximum available stock reached.");
            return;
        }

        existingProduct.quantity++;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: Number(product.price),
            quantity: 1,
            stock: Number(product.qty)
        });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    alert("Product added to cart!");
}

// Event listeners
searchInput.addEventListener("input", filterProducts);

categoryFilter.addEventListener("change", filterProducts);

previousPage.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        displayProducts();
    }
});

nextPage.addEventListener("click", () => {
    const totalPages = Math.ceil(
        filteredProducts.length / productsPerPage
    );

    if (currentPage < totalPages) {
        currentPage++;
        displayProducts();
    }
});

// Initialize
async function initializeProducts() {
    try {
        await loadCategories();
        await loadProducts();
    } catch (error) {
        productMessage.textContent =
            "Unable to load products: " + error.message;
    }
}

initializeProducts();
