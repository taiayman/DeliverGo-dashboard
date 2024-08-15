import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-analytics.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, setDoc } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyD_jN-BTI4QirVq5EsMlLhJinnx556B6Ck",
  authDomain: "glovo-app-939d7.firebaseapp.com",
  databaseURL: "https://glovo-app-939d7-default-rtdb.firebaseio.com",
  projectId: "glovo-app-939d7",
  storageBucket: "glovo-app-939d7.appspot.com",
  messagingSenderId: "447179958505",
  appId: "1:447179958505:web:f87955e4e92c0346a12878",
  measurementId: "G-D6ZV5RLQ7B"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn) {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
        loadDashboard();
    } else {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }
}

function login(accessKey) {
    if (accessKey === '159357') {
        sessionStorage.setItem('isLoggedIn', 'true');
        checkAuth();
    } else {
        document.getElementById('loginError').textContent = 'Invalid access key';
    }
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    checkAuth();
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(`${sectionId}-section`).style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-section="${sectionId}"]`).classList.add('active');
}

async function loadDashboard() {
    const dashboardCards = document.querySelectorAll('.dashboard-grid .card');
    dashboardCards.forEach(card => {
        card.classList.add('loading');
        card.innerHTML = '<div class="shimmer-wrapper"><div class="shimmer"></div></div>';
    });

    const recentOrdersTable = document.querySelector('.recent-orders table tbody');
    recentOrdersTable.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        recentOrdersTable.innerHTML += '<tr class="loading"><td colspan="5"><div class="shimmer-wrapper"><div class="shimmer"></div></div></td></tr>';
    }

    try {
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const productsSnapshot = await getDocs(collection(db, 'products'));

        const totalOrders = ordersSnapshot.size;
        let totalRevenue = 0;
        ordersSnapshot.forEach(doc => {
            totalRevenue += doc.data().total;
        });

        const activeUsers = usersSnapshot.size;
        const productCategories = categoriesSnapshot.size;

        dashboardCards.forEach((card, index) => {
            card.classList.remove('loading');
            card.innerHTML = `
                <h3>${['Total Orders', 'Total Revenue', 'Active Users', 'Product Categories'][index]}</h3>
                <p class="number">${[totalOrders, `$${totalRevenue.toFixed(2)}`, activeUsers, productCategories][index]}</p>
            `;
        });

        const recentOrdersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
        const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
        recentOrdersTable.innerHTML = '';
        recentOrdersSnapshot.forEach(doc => {
            const order = doc.data();
            const row = recentOrdersTable.insertRow();
            row.innerHTML = `
                <td>${doc.id}</td>
                <td>${order.customerName}</td>
                <td>$${order.total.toFixed(2)}</td>
                <td>${order.status}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editOrder('${doc.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteOrder('${doc.id}')">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        dashboardCards.forEach(card => {
            card.classList.remove('loading');
            card.innerHTML = '<p>Error loading data</p>';
        });
        recentOrdersTable.innerHTML = '<tr><td colspan="5">Error loading recent orders</td></tr>';
    }
}

async function loadOrders() {
    try {
        const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const ordersSnapshot = await getDocs(ordersQuery);
        const tableBody = document.getElementById('orders-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${doc.id}</td>
                <td>${order.customerName}</td>
                <td>$${order.total.toFixed(2)}</td>
                <td>${order.status}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editOrder('${doc.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteOrder('${doc.id}')">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function loadInventory() {
    await loadCategories();
    await loadProducts();
}

async function loadCategories() {
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesList = document.getElementById('categories-list');
        const productFilter = document.getElementById('product-filter');
        
        categoriesList.innerHTML = '';
        productFilter.innerHTML = '<option value="">All Categories</option>';

        categoriesSnapshot.forEach(doc => {
            const category = doc.data();
            
            const li = document.createElement('li');
            li.textContent = category.name;
            li.setAttribute('data-id', doc.id);
            li.addEventListener('click', () => filterProductsByCategory(doc.id));
            categoriesList.appendChild(li);
            
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = category.name;
            productFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadProducts() {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';

    for (let i = 0; i < 8; i++) {
        const shimmerCard = document.createElement('div');
        shimmerCard.className = 'product-card loading';
        shimmerCard.innerHTML = '<div class="shimmer-wrapper"><div class="shimmer"></div></div>';
        productsGrid.appendChild(shimmerCard);
    }

    try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        
        productsGrid.innerHTML = '';

        productsSnapshot.forEach(doc => {
            const product = doc.data();
            const productCard = createProductCard(doc.id, product);
            productsGrid.appendChild(productCard);
        });
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<p>Error loading products</p>';
    }
}

function createProductCard(id, product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <img src="${product.imageUrl}" alt="${product.name}" class="product-image">
        <h4 class="product-name">${product.name}</h4>
        <p class="product-price">$${product.price.toFixed(2)}</p>
        <p class="product-category">${product.category}</p>
        <div class="product-actions">
            <button onclick="editProduct('${id}')" class="btn btn-secondary">Edit</button>
            <button onclick="deleteProduct('${id}')" class="btn btn-danger">Delete</button>
        </div>
    `;
    return card;
}

function filterProductsByCategory(categoryId) {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const cardCategory = card.querySelector('.product-category').textContent;
        if (categoryId === '' || cardCategory === categoryId) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });

    document.querySelectorAll('#categories-list li').forEach(li => {
        li.classList.toggle('active', li.getAttribute('data-id') === categoryId);
    });
}

function searchProducts(query) {
    const productCards = document.querySelectorAll('.product-card');
    const lowerQuery = query.toLowerCase();
    productCards.forEach(card => {
        const productName = card.querySelector('.product-name').textContent.toLowerCase();
        if (productName.includes(lowerQuery)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

async function loadUsers() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const tableBody = document.getElementById('users-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${doc.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role || 'User'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editUser('${doc.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteUser('${doc.id}')">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadAnalytics() {
    try {
        const salesQuery = query(collection(db, 'sales'), orderBy('date'), limit(30));
        const salesSnapshot = await getDocs(salesQuery);
        const labels = [];
        const salesData = [];

        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            labels.push(sale.date.toDate().toLocaleDateString());
            salesData.push(sale.amount);
        });

        const ctx = document.getElementById('chart-container').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales',
                    data: salesData,
                    borderColor: '#00CCBC',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

async function loadSettings() {
    try {
        const settingsDoc = await getDocs(doc(db, 'settings', 'app_settings'));
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            document.getElementById('site-name').value = settings.siteName;
            document.getElementById('contact-email').value = settings.contactEmail;
            document.getElementById('currency').value = settings.currency;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function openAddCategoryModal() {
    const modal = document.getElementById('addCategoryModal');
    modal.style.display = 'block';
}

function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    modal.style.display = 'block';
    loadCategoriesForProductForm();
}

async function loadCategoriesForProductForm() {
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categorySelect = document.getElementById('productCategory');
        categorySelect.innerHTML = '<option value="">Select a category</option>';
        categoriesSnapshot.forEach(doc => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories for product form:', error);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

async function editOrder(id) {
    console.log(`Edit order ${id}`);
}

async function deleteOrder(id) {
    if (confirm('Are you sure you want to delete this order?')) {
        try {
            await deleteDoc(doc(db, 'orders', id));
            loadOrders();
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Error deleting order');
        }
    }
}

async function editCategory(id) {
    console.log(`Edit category ${id}`);
}

async function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category?')) {
        try {
            await deleteDoc(doc(db, 'categories', id));
            loadCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Error deleting category');
        }
    }
}

async function editProduct(id) {
    console.log(`Edit product ${id}`);
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await deleteDoc(doc(db, 'products', id));
            loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product');
        }
    }
}

async function editUser(id) {
    console.log(`Edit user ${id}`);
}

async function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await deleteDoc(doc(db, 'users', id));
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const accessKey = document.getElementById('accessKey').value;
            login(accessKey);
        });
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            showSection(section);
            switch(section) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'orders':
                    loadOrders();
                    break;
                case 'inventory':
                    loadInventory();
                    break;
                case 'users':
                    loadUsers();
                    break;
                case 'analytics':
                    loadAnalytics();
                    break;
                case 'settings':
                    loadSettings();
                    break;
            }
        });
    });

    document.getElementById('add-category-btn').addEventListener('click', openAddCategoryModal);
    document.getElementById('add-product-btn').addEventListener('click', openAddProductModal);

    document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const newCategory = {
            name: form.categoryName.value,
            description: form.categoryDescription.value,
        };
        try {
            await addDoc(collection(db, 'categories'), newCategory);
            closeModal('addCategoryModal');
            loadCategories();
        } catch (error) {
            console.error('Error adding category:', error);
            alert('Error adding category');
        }
    });
    
    document.getElementById('addProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const newProduct = {
            name: form.productName.value,
            description: form.productDescription.value,
            price: parseFloat(form.productPrice.value),
            imageUrl: form.productImageUrl.value,
            category: form.productCategory.value,
            unit: form.productUnit.value,
            sellerId: form.productSellerId.value,
            sellerType: form.productSellerType.value,
            popularity: 0,
            averageRating: 0,
            url: generateProductUrl(form.productName.value)
        };
        try {
            await addDoc(collection(db, 'products'), newProduct);
            closeModal('addProductModal');
            loadProducts();
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Error adding product');
        }
    });

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const settings = Object.fromEntries(formData.entries());
        try {
            await setDoc(doc(db, 'settings', 'app_settings'), settings);
            alert('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings');
        }
    });

    window.onclick = function(event) {
        if (event.target.className === 'modal') {
            event.target.style.display = 'none';
        }
    };

    document.getElementById('product-search').addEventListener('input', (e) => {
        searchProducts(e.target.value);
    });

    document.getElementById('product-filter').addEventListener('change', (e) => {
        filterProductsByCategory(e.target.value);
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

function generateProductUrl(productName) {
    return productName.toLowerCase().replace(/\s+/g, '-');
}

window.editOrder = editOrder;
window.deleteOrder = deleteOrder;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.openAddCategoryModal = openAddCategoryModal;
window.openAddProductModal = openAddProductModal;
window.closeModal = closeModal;

export {
    loadDashboard,
    loadOrders,
    loadCategories,
    loadProducts,
    loadUsers,
    loadAnalytics,
    loadSettings,
    openAddCategoryModal,
    openAddProductModal,
    closeModal,
    editOrder,
    deleteOrder,
    editCategory,
    deleteCategory,
    editProduct,
    deleteProduct,
    editUser,
    deleteUser
};