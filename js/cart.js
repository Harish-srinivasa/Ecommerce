
const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const cartMessage = document.getElementById("cartMessage");

const clearCartBtn = document.getElementById("clearCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");

let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Save cart
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

// Display cart
function displayCart() {
    cartList.innerHTML = "";

    if (cart.length === 0) {
        cartMessage.textContent = "Your cart is empty.";
        cartTotal.textContent = "Total: ₹0";
        checkoutBtn.disabled = true;
        clearCartBtn.disabled = true;
        return;
    }

    cartMessage.textContent = "";
    checkoutBtn.disabled = false;
    clearCartBtn.disabled = false;

    let total = 0;

    cart.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = item.title;

        const priceCell = document.createElement("td");
        priceCell.textContent = "₹" + item.price;

        const quantityCell = document.createElement("td");

        const decreaseBtn = document.createElement("button");
        decreaseBtn.textContent = "-";

        const quantityText = document.createElement("span");
        quantityText.textContent = " " + item.quantity + " ";

        const increaseBtn = document.createElement("button");
        increaseBtn.textContent = "+";

        decreaseBtn.disabled = item.quantity <= 1;
        increaseBtn.disabled = item.quantity >= item.stock;

        decreaseBtn.addEventListener("click", () => {
            updateQuantity(index, -1);
        });

        increaseBtn.addEventListener("click", () => {
            updateQuantity(index, 1);
        });

        quantityCell.append(
            decreaseBtn,
            quantityText,
            increaseBtn
        );

        const subtotalCell = document.createElement("td");
        subtotalCell.textContent = "₹" + subtotal.toFixed(2);

        const actionCell = document.createElement("td");

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";

        removeBtn.addEventListener("click", () => {
            removeProduct(index);
        });

        actionCell.appendChild(removeBtn);

        row.append(
            nameCell,
            priceCell,
            quantityCell,
            subtotalCell,
            actionCell
        );

        cartList.appendChild(row);
    });

    cartTotal.textContent = "Total: ₹" + total.toFixed(2);
}

// Update quantity
function updateQuantity(index, change) {
    const newQuantity = cart[index].quantity + change;

    if (newQuantity < 1 || newQuantity > cart[index].stock) {
        return;
    }

    cart[index].quantity = newQuantity;

    saveCart();
    displayCart();
}

// Remove product
function removeProduct(index) {
    cart.splice(index, 1);

    saveCart();
    displayCart();
}

// Clear entire cart
clearCartBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your cart?")) {
        cart = [];

        saveCart();
        displayCart();
    }
});

// Proceed to checkout
checkoutBtn.addEventListener("click", () => {
    window.location.href = "checkout.html";
});

// Initial display
displayCart();
