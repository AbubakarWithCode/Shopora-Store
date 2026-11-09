
import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// DEMO PRODUCTS
// Firestore mein products add karne ke baad ye fallback use nahi hoga.

const demoProducts = [
  {
    id:"demo-1",
    name:"Studio Wireless Headphones",
    category:"Electronics",
    price:89.99,
    old:119.99,
    rating:"4.8",
    reviews:1240,
    badge:"BESTSELLER",
    image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=85"
  },
  {
    id:"demo-2",
    name:"Everyday Classic Sneakers",
    category:"Fashion",
    price:64.5,
    old:89,
    rating:"4.7",
    reviews:842,
    badge:"TRENDING",
    image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=85"
  },
  {
    id:"demo-3",
    name:"Minimal Ceramic Table Lamp",
    category:"Home",
    price:42,
    old:55,
    rating:"4.9",
    reviews:326,
    badge:"",
    image:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&q=85"
  },
  {
    id:"demo-4",
    name:"Daily Glow Skincare Set",
    category:"Beauty",
    price:35.99,
    old:49,
    rating:"4.6",
    reviews:517,
    badge:"NEW",
    image:"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=700&q=85"
  },
  {
    id:"demo-5",
    name:"Smart Watch Series One",
    category:"Electronics",
    price:119,
    old:149,
    rating:"4.7",
    reviews:2105,
    badge:"TOP RATED",
    image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=85"
  },
  {
    id:"demo-6",
    name:"Soft Knit Weekend Throw",
    category:"Home",
    price:39,
    old:52,
    rating:"4.8",
    reviews:294,
    badge:"",
    image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=700&q=85"
  },
  {
    id:"demo-7",
    name:"Modern Everyday Backpack",
    category:"Fashion",
    price:58,
    old:75,
    rating:"4.5",
    reviews:638,
    badge:"",
    image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700&q=85"
  },
  {
    id:"demo-8",
    name:"Wireless Portable Speaker",
    category:"Electronics",
    price:49.99,
    old:69,
    rating:"4.7",
    reviews:973,
    badge:"POPULAR",
    image:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700&q=85"
  }
];

let products = [...demoProducts];

let cart = JSON.parse(localStorage.getItem("shopora-cart") || "[]");
let wishlist = [];

let activeFilter = "all";
let searchTerm = "";
let currentUser = null;

let stopProductsListener = null;
let stopWishlistListener = null;

const $ = selector => document.querySelector(selector);

const money = value => "$" + Number(value || 0).toFixed(2);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[char]);
}

function safeImage(url) {
  return /^https:\/\//i.test(String(url || ""))
    ? url
    : "https://placehold.co/600x400?text=Shopora";
}

// TOAST
function toast(message) {
  const element = $("#toast");

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(window.shoporaToastTimer);

  window.shoporaToastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 2500);
}

// CART
function saveCart() {
  localStorage.setItem(
    "shopora-cart",
    JSON.stringify(cart)
  );

  $("#cartCount").textContent = cart.reduce(
    (total, item) => total + item.qty,
    0
  );
}

function findProduct(id) {
  return products.find(
    product => String(product.id) === String(id)
  );
}

function addToCart(id) {
  const product = findProduct(id);

  if (!product) {
    toast("Product not available");
    return;
  }

  const item = cart.find(
    item => String(item.id) === String(id)
  );

  if (item) {
    item.qty++;
  } else {
    cart.push({
      id: String(id),
      qty: 1
    });
  }

  saveCart();
  toast("Added to your cart");
}

function getCartTotal() {
  return cart.reduce((total, item) => {
    const product = findProduct(item.id);

    return total +
      (Number(product?.price) || 0) * item.qty;
  }, 0);
}

// PRODUCTS
function renderProducts() {
  const list = products.filter(product => {
    const matchesCategory =
      activeFilter === "all" ||
      product.category === activeFilter;

    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  $("#productHeading").textContent =
    searchTerm
      ? "Search results"
      : activeFilter === "all"
        ? "Popular right now"
        : activeFilter + " picks";

  $("#productGrid").innerHTML = list.length
    ? list.map(product => {
        const id = String(product.id);
        const isWishlisted = wishlist.includes(id);

        return `
          <article class="product-card">

            <div class="product-image">

              ${product.badge
                ? `<span class="product-badge">${escapeHTML(product.badge)}</span>`
                : ""
              }

              <button
                class="wish ${isWishlisted ? "on" : ""}"
                data-wish="${escapeHTML(id)}"
                aria-label="Add to wishlist"
              >
                ${isWishlisted ? "♥" : "♡"}
              </button>

              <img
                src="${safeImage(product.image)}"
                alt="${escapeHTML(product.name)}"
                loading="lazy"
              >

            </div>

            <div class="product-info">

              <div class="product-cat">
                ${escapeHTML(product.category)}
              </div>

              <h3>${escapeHTML(product.name)}</h3>

              <div class="rating">
                ★★★★★
                <span>
                  ${escapeHTML(product.rating || "New")}
                  · ${Number(product.reviews || 0).toLocaleString()} reviews
                </span>
              </div>

              <div class="price">
                ${money(product.price)}
                ${product.old ? `<del>${money(product.old)}</del>` : ""}
              </div>

              <button
                class="add-cart"
                data-add="${escapeHTML(id)}"
                ${Number(product.stock ?? 1) <= 0 ? "disabled" : ""}
              >
                ${Number(product.stock ?? 1) <= 0
                  ? "Out of stock"
                  : "Add to cart　＋"
                }
              </button>

            </div>

          </article>
        `;
      }).join("")
    : `
      <div class="empty" style="grid-column:1/-1">
        No products found. Try another search.
      </div>
    `;
}

// DRAWER
function showDrawer(title, content) {
  $("#drawerTitle").textContent = title;
  $("#drawerBody").innerHTML = content;
  $("#overlay").classList.add("open");
}

function openCart() {
  if (!cart.length) {
    return showDrawer(
      "Your cart",
      `<div class="empty">
        <b>🛒</b>
        Your cart is waiting for something lovely.
        <br><br>
        <a href="#products" id="continueShopping">
          Explore products →
        </a>
      </div>`
    );
  }

  const itemsHTML = cart.map(item => {
    const product = findProduct(item.id);

    if (!product) return "";

    return `
      <div class="cart-row">

        <img src="${safeImage(product.image)}" alt="">

        <div style="flex:1">

          <h4>${escapeHTML(product.name)}</h4>

          <p>${money(product.price)}</p>

          <div class="qty">

            <button
              data-qty="${escapeHTML(item.id)}"
              data-delta="-1"
            >−</button>

            <span>${item.qty}</span>

            <button
              data-qty="${escapeHTML(item.id)}"
              data-delta="1"
            >＋</button>

            <button
              class="remove"
              data-remove="${escapeHTML(item.id)}"
            >Remove</button>

          </div>

        </div>
      </div>
    `;
  }).join("");

  showDrawer("Your cart", `
    ${itemsHTML}

    <div class="cart-total">
      <span>Subtotal</span>
      <span>${money(getCartTotal())}</span>
    </div>

    <button class="checkout" id="checkoutBtn">
      Proceed to checkout →
    </button>

    <p style="font-size:10px;color:#888">
      Payment method: Cash on Delivery
    </p>
  `);
}

// AUTHENTICATION
function accountContent(message = "") {
  if (currentUser) {
    return `
      <div style="padding:18px 0">

        <p>Signed in as</p>

        <h3>
          ${escapeHTML(currentUser.displayName || currentUser.email)}
        </h3>

        <p style="font-size:12px;color:#777">
          ${escapeHTML(currentUser.email)}
        </p>

        <button class="checkout" id="ordersBtn">
          My Orders
        </button>

        <button
          class="checkout"
          id="logoutBtn"
          style="margin-top:10px;background:#eee"
        >
          Sign Out
        </button>

      </div>
    `;
  }

  return `
    <div style="padding:18px 0">

      <p style="font-size:12px;color:#777">
        Create your Shopora account or sign in.
      </p>

      <div
        id="authMessage"
        style="color:#a34b2c;font-size:12px;margin:10px 0"
      >
        ${escapeHTML(message)}
      </div>

      <form id="signupForm" style="display:grid;gap:10px">

        <h3>Create Account</h3>

        <input
          name="name"
          placeholder="Full name"
          required
          minlength="2"
          style="padding:12px;border:1px solid #ddd"
        >

        <input
          name="email"
          type="email"
          placeholder="Email address"
          required
          style="padding:12px;border:1px solid #ddd"
        >

        <input
          name="password"
          type="password"
          placeholder="Password (minimum 6 characters)"
          required
          minlength="6"
          style="padding:12px;border:1px solid #ddd"
        >

        <button class="checkout">
          Create Account
        </button>

      </form>

      <div style="border-top:1px solid #eee;margin:22px 0"></div>

      <form id="loginForm" style="display:grid;gap:10px">

        <h3>Already have an account?</h3>

        <input
          name="email"
          type="email"
          placeholder="Email address"
          required
          style="padding:12px;border:1px solid #ddd"
        >

        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          style="padding:12px;border:1px solid #ddd"
        >

        <button class="checkout">
          Sign In
        </button>

      </form>

    </div>
  `;
}

function authError(error) {
  const messages = {
    "auth/email-already-in-use":
      "This email already has an account. Please sign in.",

    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/weak-password":
      "Password must be at least 6 characters.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/too-many-requests":
      "Too many attempts. Try again later."
  };

  return messages[error.code] || error.message;
}

async function signup(form) {
  const data = new FormData(form);

  const name = String(data.get("name")).trim();
  const email = String(data.get("email")).trim();
  const password = String(data.get("password"));

  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(result.user, {
      displayName: name
    });

    await setDoc(
      doc(db, "users", result.user.uid),
      {
        name,
        email,
        createdAt: serverTimestamp()
      },
      { merge: true }
    );

    toast("Account created successfully!");

    showDrawer("My Account", accountContent());

  } catch (error) {
    $("#authMessage").textContent = authError(error);
  }
}

async function login(form) {
  const data = new FormData(form);

  try {
    await signInWithEmailAndPassword(
      auth,
      String(data.get("email")).trim(),
      String(data.get("password"))
    );

    toast("Welcome back!");

    showDrawer("My Account", accountContent());

  } catch (error) {
    $("#authMessage").textContent = authError(error);
  }
}

async function logout() {
  try {
    await signOut(auth);

    wishlist = [];

    toast("Signed out successfully");

    showDrawer(
      "Welcome to Shopora",
      accountContent()
    );

  } catch (error) {
    toast(authError(error));
  }
}

// FIRESTORE WISHLIST
async function toggleWishlist(id) {
  if (!currentUser) {
    showDrawer(
      "Sign in required",
      accountContent("Please sign in to use your wishlist.")
    );
    return;
  }

  const productId = String(id);

  const wishlistRef = doc(
    db,
    "users",
    currentUser.uid,
    "wishlist",
    productId
  );

  try {
    if (wishlist.includes(productId)) {
      await deleteDoc(wishlistRef);
      toast("Removed from wishlist");
    } else {
      await setDoc(wishlistRef, {
        productId,
        createdAt: serverTimestamp()
      });

      toast("Saved to wishlist");
    }

  } catch (error) {
    console.error(error);
    toast("Wishlist update failed");
  }
}

function watchWishlist(user) {
  if (stopWishlistListener) {
    stopWishlistListener();
    stopWishlistListener = null;
  }

  if (!user) {
    wishlist = [];
    renderProducts();
    return;
  }

  stopWishlistListener = onSnapshot(
    collection(db, "users", user.uid, "wishlist"),

    snapshot => {
      wishlist = snapshot.docs.map(
        document => document.id
      );

      renderProducts();
    },

    error => console.error("Wishlist error:", error)
  );
}

// FIRESTORE PRODUCTS
function watchProducts() {
  if (stopProductsListener) {
    stopProductsListener();
  }

  stopProductsListener = onSnapshot(
    collection(db, "products"),

    snapshot => {
      if (!snapshot.empty) {
        products = snapshot.docs.map(document => ({
          id: document.id,
          ...document.data()
        }));
      } else {
        products = [...demoProducts];
      }

      renderProducts();
    },

    error => {
      console.error("Products error:", error);

      products = [...demoProducts];
      renderProducts();
    }
  );
}

// CHECKOUT
function checkoutForm() {
  if (!currentUser) {
    showDrawer(
      "Sign In Required",
      `<div class="empty">
        <b>👤</b>
        Please sign in before placing your order.
        <button class="checkout" id="accountFromCheckout">
          Sign In / Create Account
        </button>
      </div>`
    );

    return;
  }

  if (!cart.length) {
    toast("Your cart is empty");
    return;
  }

  showDrawer("Delivery Details", `
    <form
      id="checkoutForm"
      style="display:grid;gap:12px;padding:18px 0"
    >

      <p style="font-size:12px;color:#777">
        Total: <b>${money(getCartTotal())}</b>
        · Cash on Delivery
      </p>

      <input
        name="fullName"
        placeholder="Full name"
        required
        value="${escapeHTML(currentUser.displayName || "")}"
        style="padding:12px;border:1px solid #ddd"
      >

      <input
        name="phone"
        placeholder="Phone number"
        required
        pattern="[0-9+\\- ]{7,20}"
        style="padding:12px;border:1px solid #ddd"
      >

      <textarea
        name="address"
        placeholder="Complete delivery address"
        required
        minlength="10"
        rows="4"
        style="padding:12px;border:1px solid #ddd"
      ></textarea>

      <button class="checkout">
        Place COD Order
      </button>

      <small style="color:#888">
        Pay the courier when your parcel arrives.
      </small>

    </form>
  `);
}

async function placeOrder(form) {
  const data = new FormData(form);

  const items = cart.map(item => {
    const product = findProduct(item.id);

    if (!product) return null;

    return {
      productId: String(product.id),
      name: product.name,
      price: Number(product.price),
      qty: item.qty
    };
  }).filter(Boolean);

  if (!items.length) {
    toast("Your cart is empty");
    return;
  }

  const total = items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  try {
    await addDoc(collection(db, "orders"), {
      userId: currentUser.uid,

      customerName: String(data.get("fullName")).trim(),

      phone: String(data.get("phone")).trim(),

      address: String(data.get("address")).trim(),

      items,
      total,

      currency: "USD",

      paymentMethod: "Cash on Delivery",

      status: "Pending",

      createdAt: serverTimestamp()
    });

    cart = [];

    saveCart();

    toast("Order placed successfully!");

    showDrawer(
      "Order Confirmed",
      `<div class="empty">
        <b>✓</b>
        Your order was saved successfully.
        <p>Payment: Cash on Delivery</p>
        <button class="checkout" id="ordersBtn">
          View My Orders
        </button>
      </div>`
    );

  } catch (error) {
    console.error("Order error:", error);

    toast("Order failed. Check Firestore rules.");
  }
}

// CUSTOMER ORDERS
async function loadOrders() {
  if (!currentUser) return;

  showDrawer(
    "My Orders",
    '<p style="padding:20px">Loading orders...</p>'
  );

  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(ordersQuery);

    if (snapshot.empty) {
      showDrawer(
        "My Orders",
        '<div class="empty">You have no orders yet.</div>'
      );

      return;
    }

    const orders = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    }));

    orders.sort((a, b) =>
      (b.createdAt?.seconds || 0) -
      (a.createdAt?.seconds || 0)
    );

    const html = orders.map(order => `
      <div style="padding:14px 0;border-bottom:1px solid #eee">

        <b>
          Order #${escapeHTML(order.id.slice(0,8).toUpperCase())}
        </b>

        <p style="font-size:12px;color:#777">
          ${escapeHTML(order.status || "Pending")}
          · Cash on Delivery
        </p>

        <p style="font-size:12px">
          ${(order.items || []).map(item =>
            escapeHTML(item.name) + " × " + Number(item.qty)
          ).join("<br>")}
        </p>

        <b>${money(order.total)}</b>

      </div>
    `).join("");

    showDrawer("My Orders", html);

  } catch (error) {
    console.error(error);

    showDrawer(
      "My Orders",
      '<p style="padding:20px">Could not load orders.</p>'
    );
  }
}

// NEWSLETTER
$("#newsletterForm").addEventListener("submit", async event => {
  event.preventDefault();

  const input = event.target.querySelector(
    'input[type="email"]'
  );

  try {
    await addDoc(collection(db, "newsletter"), {
      email: input.value.trim().toLowerCase(),
      createdAt: serverTimestamp()
    });

    $("#newsletterMsg").textContent =
      "Thanks for joining Shopora!";

    event.target.reset();

  } catch (error) {
    console.error(error);

    $("#newsletterMsg").textContent =
      "Subscription failed. Please try again.";
  }
});

// EVENT LISTENERS
$("#productGrid").addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");
  const wishButton = event.target.closest("[data-wish]");

  if (addButton) {
    addToCart(addButton.dataset.add);
  }

  if (wishButton) {
    toggleWishlist(wishButton.dataset.wish);
  }
});

$("#cartBtn").onclick = openCart;

$("#accountBtn").onclick = () => {
  showDrawer("Welcome to Shopora", accountContent());
};

$("#closeDrawer").onclick = () => {
  $("#overlay").classList.remove("open");
};

$("#overlay").addEventListener("click", event => {
  if (event.target.id === "overlay") {
    $("#overlay").classList.remove("open");
  }
});

$("#drawerBody").addEventListener("submit", event => {
  if (event.target.id === "signupForm") {
    event.preventDefault();
    signup(event.target);
  }

  if (event.target.id === "loginForm") {
    event.preventDefault();
    login(event.target);
  }

  if (event.target.id === "checkoutForm") {
    event.preventDefault();
    placeOrder(event.target);
  }
});

$("#drawerBody").addEventListener("click", event => {
  const qtyButton = event.target.closest("[data-qty]");
  const removeButton = event.target.closest("[data-remove]");

  if (qtyButton) {
    const item = cart.find(
      x => String(x.id) === String(qtyButton.dataset.qty)
    );

    if (item) {
      item.qty += Number(qtyButton.dataset.delta);

      if (item.qty < 1) {
        cart = cart.filter(x => x !== item);
      }
    }

    saveCart();
    openCart();
  }

  if (removeButton) {
    cart = cart.filter(
      x => String(x.id) !== String(removeButton.dataset.remove)
    );

    saveCart();
    openCart();
  }

  if (event.target.id === "checkoutBtn") {
    checkoutForm();
  }

  if (event.target.id === "accountFromCheckout") {
    showDrawer("My Account", accountContent());
  }

  if (event.target.id === "logoutBtn") {
    logout();
  }

  if (event.target.id === "ordersBtn") {
    loadOrders();
  }

  if (event.target.id === "continueShopping") {
    $("#overlay").classList.remove("open");
  }
});

// FILTERS
document.querySelectorAll(".filter").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".filter").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    activeFilter = button.dataset.filter;
    searchTerm = "";

    $("#searchInput").value = "";

    renderProducts();
  };
});

// CATEGORIES
document.querySelectorAll(".category").forEach(link => {
  link.addEventListener("click", () => {
    activeFilter = link.dataset.filter;

    document.querySelectorAll(".filter").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.filter === activeFilter
      );
    });

    renderProducts();
  });
});

// SEARCH
$("#searchForm").addEventListener("submit", event => {
  event.preventDefault();

  searchTerm = $("#searchInput")
    .value
    .trim()
    .toLowerCase();

  const category = $("#categorySelect").value;

  activeFilter = category === "all"
    ? "all"
    : category;

  document.querySelectorAll(".filter").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === activeFilter
    );
  });

  renderProducts();

  $("#products").scrollIntoView({
    behavior: "smooth"
  });
});

// ALL PRODUCTS
$("#allMenu").onclick = () => {
  activeFilter = "all";
  searchTerm = "";

  $("#searchInput").value = "";

  renderProducts();

  $("#products").scrollIntoView({
    behavior: "smooth"
  });
};

// FIREBASE AUTH STATE
onAuthStateChanged(auth, user => {
  currentUser = user;

  $("#accountBtn").innerHTML = user
    ? `
      <small>Hello, ${escapeHTML(user.displayName || "Customer")}</small>
      <strong>My Account ▾</strong>
    `
    : `
      <small>Hello, sign in</small>
      <strong>Account & Lists ▾</strong>
    `;

  watchWishlist(user);
});

// START APPLICATION
watchProducts();

saveCart();

renderProducts();
