
import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    where
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

    categoryFilter.innerHTML = '<option value="all">All Categories</option>';

    snapshot.forEach((docSnap) => {
        const category = docSnap.data();

        const option = document.createElement("option");
        option.value = docSnap.id;
        option.textContent = category.name;

        categoryFilter.appendChild(option);
    });
}

// Load only active products from Firestore
async function loadProducts() {
    const activeProductsQuery = query(
        collection(db, "inventory"),
        where("active", "==", true)
    );

    const snapshot = await getDocs(activeProductsQuery);

    const categorySnapshot = await getDocs(
        collection(db, "categories")
    );

    const categories = {};

    categorySnapshot.forEach((docSnap) => {
        categories[docSnap.id] = docSnap.data().name;
    });

    allProducts = [];

    snapshot.forEach((docSnap) => {
        const product = docSnap.data();

        allProducts.push({
            id: docSnap.id,
            ...product,
            categoryName: categories[product.catId] || "Unknown"
        });
    });

    filteredProducts = [...allProducts];

    currentPage = 1;
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

// AJAX search using jQuery and Firestore REST API
async function filterProducts() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;

    try {
        const user = auth.currentUser;

        if (!user) {
            applyLocalFilter(searchText, selectedCategory);
            return;
        }

        const token = await user.getIdToken();

        $.ajax({
            url: "https://firestore.googleapis.com/v1/projects/ecommerce-bc4d2/databases/(default)/documents:runQuery",

            method: "POST",

            headers: {
                Authorization: `Bearer ${token}`
            },

            contentType: "application/json",

            dataType: "json",

            data: JSON.stringify({
                structuredQuery: {
                    from: [
                        {
                            collectionId: "inventory"
                        }
                    ],
                    where: {
                        fieldFilter: {
                            field: {
                                fieldPath: "active"
                            },
                            op: "EQUAL",
                            value: {
                                booleanValue: true
                            }
                        }
                    }
                }
            }),

            success: function (response) {

                const ajaxProducts = (response || [])
                    .filter(result => result.document)
                    .map(result => {

                        const doc = result.document;
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

                        return {
                            id: doc.name.split("/").pop(),
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
                        !selectedCategory ||
                        selectedCategory === "all" ||
                        product.catId === selectedCategory;

                    return matchesSearch && matchesCategory;
                });

                filteredProducts = filteredProducts.map(product => {

                    const existing = allProducts.find(
                        p => p.id === product.id
                    );

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
            (product.title || "").toLowerCase().includes(searchText) ||
            product.id.toLowerCase().includes(searchText);

        const matchesCategory =
            !selectedCategory ||
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
        item => item.id === product.id
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

        console.error(error);

        productMessage.textContent =
            "Unable to load products: " + error.message;
    }
}

initializeProducts();
