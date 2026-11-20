import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const categoryRef = collection(db, "categories");

const categoryName = document.getElementById("categoryName");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const categoryList = document.getElementById("categoryList");

let editingId = null;

// Add or update category
addCategoryBtn.addEventListener("click", async () => {
    const name = categoryName.value.trim();

    if (name === "") {
        alert("Enter category name");
        return;
    }

    if (editingId) {
        await updateDoc(doc(db, "categories", editingId), {
            name: name
        });

        editingId = null;
        addCategoryBtn.textContent = "Add Category";
    } else {
        await addDoc(categoryRef, {
            name: name
        });
    }

    categoryName.value = "";
    loadCategories();
});

// Display categories
async function loadCategories() {
    const snapshot = await getDocs(collection(db, "categories"));

    categoryList.innerHTML = "";

    snapshot.forEach((docSnap) => {
        const category = docSnap.data();

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${docSnap.id}</td>
            <td>${category.name}</td>
        `;

        categoryList.appendChild(row);
    });
}

// INVENTORY CRUD

const {
    collection: invCollection,
    addDoc: invAddDoc,
    getDocs: invGetDocs,
    updateDoc: invUpdateDoc,
    deleteDoc: invDeleteDoc,
    doc: invDoc
} = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");

const inventoryRef = invCollection(db, "inventory");

const productTitle = document.getElementById("productTitle");
const productDescription = document.getElementById("productDescription");
const productCategory = document.getElementById("productCategory");
const productQty = document.getElementById("productQty");
const productPrice = document.getElementById("productPrice");
const addProductBtn = document.getElementById("addProductBtn");
const inventoryList = document.getElementById("inventoryList");
let allProducts = [];
let currentPage = 1;
const productsPerPage = 5;

const categoryFilter = document.getElementById("inventoryCategoryFilter");
const searchProductId = document.getElementById("searchProductId");
const searchProductBtn = document.getElementById("searchProductBtn");
const showAllProductsBtn = document.getElementById("showAllProductsBtn");

const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

let editingProductId = null;


// LOAD CATEGORIES INTO DROPDOWN

async function loadProductCategories() {
    const snapshot = await invGetDocs(
        invCollection(db, "categories")
    );

    productCategory.innerHTML =
        '<option value="">Select Category</option>';
    categoryFilter.innerHTML =
    '<option value="">All Categories</option>';
    snapshot.forEach((docSnap) => {
        const category = docSnap.data();

        const option = document.createElement("option");

        option.value = docSnap.id;
        option.textContent = category.name;

        productCategory.appendChild(option);
        const filterOption = document.createElement("option");

        filterOption.value = docSnap.id;
        filterOption.textContent = category.name;

        categoryFilter.appendChild(filterOption);
    });
}

// ADD / UPDATE PRODUCT

addProductBtn.addEventListener("click", async () => {

    const title = productTitle.value.trim();
    const description = productDescription.value.trim();
    const catId = productCategory.value;
    const qty = Number(productQty.value);
    const price = Number(productPrice.value);

    if (!title || !description || !catId ||
        productQty.value === "" || productPrice.value === "" ||
        !Number.isInteger(qty) || qty < 0 ||
        !Number.isFinite(price) || price < 0) {

        alert("Please enter valid product details.");
        return;
    }

    const productData = {
        title: title,
        description: description,
        catId: catId,
        qty: qty,
        price: price
    };

    try {
        if (editingProductId) {

            await invUpdateDoc(
                invDoc(db, "inventory", editingProductId),
                productData
            );

            alert("Product updated successfully!");

            editingProductId = null;
            addProductBtn.textContent = "Add Product";

        } else {

            await invAddDoc(inventoryRef, {
                ...productData,
                active: true
            });

            alert("Product added successfully!");
        }

        clearProductForm();
        loadInventory();

    } catch (error) {
        alert("Error: " + error.message);
    }
});


// CLEAR FORM

function clearProductForm() {
    productTitle.value = "";
    productDescription.value = "";
    productCategory.value = "";
    productQty.value = "";
    productPrice.value = "";
}


// READ / DISPLAY PRODUCTS


async function loadInventory() {

    const snapshot = await invGetDocs(inventoryRef);

    const categorySnapshot = await invGetDocs(
        invCollection(db, "categories")
    );

    const categories = {};

    categorySnapshot.forEach((docSnap) => {
        categories[docSnap.id] = docSnap.data().name;
    });

    allProducts = [];

    snapshot.forEach((docSnap) => {
        allProducts.push({
            id: docSnap.id,
            ...docSnap.data(),
            categoryName: categories[docSnap.data().catId] || "Unknown"
        });
    });

    currentPage = 1;
    displayInventory(allProducts);
}


// DISPLAY WITH PAGINATION

function displayInventory(products) {

    inventoryList.innerHTML = "";

    const totalPages = Math.ceil(products.length / productsPerPage);

    if (totalPages === 0) {
        pageInfo.textContent = "No products found";
        return;
    }

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * productsPerPage;

    const paginatedProducts = products.slice(
        startIndex,
        startIndex + productsPerPage
    );

    paginatedProducts.forEach((product) => {

        const row = document.createElement("tr");

        const values = [
            product.id,
            product.title,
            product.categoryName,
            product.description,
            product.qty,
            product.price,
            product.active === false ? "Inactive" : "Active"
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.onclick = () =>
            editProduct(product.id, product);

        const statusButton = document.createElement("button");
        statusButton.textContent =
            product.active === false ? "Activate" : "Deactivate";

        statusButton.onclick = () =>
            toggleProductStatus(
                product.id,
                product.active !== false
            );

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.onclick = () => deleteProduct(product.id);

        actionCell.append(editButton, statusButton, deleteButton);
        row.appendChild(actionCell);

        inventoryList.appendChild(row);
    });

    pageInfo.textContent =
        `Page ${currentPage} of ${totalPages}`;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}


// EDIT PRODUCT

function editProduct(id, product) {

    editingProductId = id;

    productTitle.value = product.title;
    productDescription.value = product.description;
    productCategory.value = product.catId;
    productQty.value = product.qty;
    productPrice.value = product.price;

    addProductBtn.textContent = "Update Product";
}


// ACTIVATE / DEACTIVATE PRODUCT

async function toggleProductStatus(id, currentStatus) {

    await invUpdateDoc(
        invDoc(db, "inventory", id),
        { active: !currentStatus }
    );

    loadInventory();
}


// PERMANENT DELETE PRODUCT

async function deleteProduct(id) {

    const confirmDelete = confirm(
        "Are you sure you want to permanently delete this product?"
    );

    if (confirmDelete) {

        await invDeleteDoc(
            invDoc(db, "inventory", id)
        );

        alert("Product deleted successfully!");

        loadInventory();
    }
}

// CATEGORY FILTER

categoryFilter.addEventListener("change", () => {

    const selectedCategory = categoryFilter.value;

    const filteredProducts = selectedCategory
        ? allProducts.filter(p => p.catId === selectedCategory)
        : allProducts;

    currentPage = 1;
    displayInventory(filteredProducts);
});


// INDIVIDUAL PRODUCT SEARCH

searchProductBtn.addEventListener("click", () => {

    const id = searchProductId.value.trim();

    const product = allProducts.find(p => p.id === id);

    currentPage = 1;

    displayInventory(product ? [product] : []);
});


// SHOW ALL PRODUCTS

showAllProductsBtn.addEventListener("click", () => {

    categoryFilter.value = "";
    searchProductId.value = "";

    currentPage = 1;
    displayInventory(allProducts);
});


// NEXT PAGE

nextPageBtn.addEventListener("click", () => {

    const totalPages = Math.ceil(
        getFilteredProducts().length / productsPerPage
    );

    if (currentPage < totalPages) {
        currentPage++;
        displayInventory(getFilteredProducts());
    }
});


// PREVIOUS PAGE

prevPageBtn.addEventListener("click", () => {

    if (currentPage > 1) {
        currentPage--;
        displayInventory(getFilteredProducts());
    }
});


// GET CURRENT FILTERED PRODUCTS

function getFilteredProducts() {

    const selectedCategory = categoryFilter.value;

    return selectedCategory
        ? allProducts.filter(p => p.catId === selectedCategory)
        : allProducts;
}

// CUSTOMER MANAGEMENT

const {
    collection: custCollection,
    getDocs: custGetDocs,
    doc: custDoc,
    updateDoc: custUpdateDoc
} = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");

async function loadCustomers() {
    const customerList = document.getElementById("customerList");

    const snapshot = await custGetDocs(
        custCollection(db, "customers")
    );

    customerList.innerHTML = "";

    snapshot.forEach((docSnap) => {
        const customer = docSnap.data();

        const row = document.createElement("tr");

        const values = [
            docSnap.id,
            customer.name || "",
            customer.email || "",
            customer.mobile || "",
            customer.creditLimit ?? 0
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        const creditInput = document.createElement("input");
        creditInput.type = "number";
        creditInput.min = "0";
        creditInput.value = customer.creditLimit ?? 0;

        const updateButton = document.createElement("button");
        updateButton.textContent = "Update";

        updateButton.addEventListener("click", async () => {
            const newLimit = Number(creditInput.value);

            if (!Number.isFinite(newLimit) || newLimit < 0) {
                alert("Enter a valid credit limit.");
                return;
            }

            try {
                await custUpdateDoc(
                    custDoc(db, "customers", docSnap.id),
                    { creditLimit: newLimit }
                );

                alert("Credit limit updated successfully!");

                loadCustomers();
            } catch (error) {
                alert("Error updating credit limit: " + error.message);
            }
        });

        actionCell.append(creditInput, updateButton);
        row.appendChild(actionCell);

        customerList.appendChild(row);
    });
}



// INITIAL LOAD

loadProductCategories();
loadInventory();
