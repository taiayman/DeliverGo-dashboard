import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, setDoc, getDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

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
    const userRole = sessionStorage.getItem('userRole');
    console.log('Checking auth, isLoggedIn:', isLoggedIn, 'userRole:', userRole);
    if (isLoggedIn === 'true') {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
        if (userRole === 'deliveryPerson') {
            showDeliveryInterfaceButton();
        } else {
            loadDashboard();
        }
    } else {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }
}

async function loadDashboard() {
    const dashboardCards = document.querySelectorAll('.dashboard-grid .card');
    dashboardCards.forEach(card => {
        card.classList.add('loading');
        card.innerHTML = '<div class="shimmer-wrapper"><div class="shimmer"></div></div>';
    });

    const recentOrdersContainer = document.querySelector('.recent-orders');
    recentOrdersContainer.innerHTML = '<h3>Recent Orders</h3><div class="order-list"><div class="shimmer-wrapper"><div class="shimmer"></div></div></div>';

    try {
        const ordersSnapshot = await getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc'), limit(5)));
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const productsSnapshot = await getDocs(collection(db, 'products'));

        const totalOrders = ordersSnapshot.size;
        let totalRevenue = 0;
        ordersSnapshot.forEach(doc => {
            totalRevenue += doc.data().total_amount;
        });

        const activeUsers = usersSnapshot.size;
        const productCategories = categoriesSnapshot.size;

        dashboardCards.forEach((card, index) => {
            card.classList.remove('loading');
            card.innerHTML = `
                <i class="${['fas fa-shopping-cart', 'fas fa-dollar-sign', 'fas fa-users', 'fas fa-tags'][index]}"></i>
                <h3>${['Total Orders', 'Total Revenue', 'Active Users', 'Product Categories'][index]}</h3>
                <p class="number">${[totalOrders, `$${totalRevenue.toFixed(2)}`, activeUsers, productCategories][index]}</p>
            `;
        });

        const orderList = recentOrdersContainer.querySelector('.order-list');
        orderList.innerHTML = '';

        for (const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data();
            const userDoc = await getDoc(doc(db, 'users', order.user_id));
            const user = userDoc.data();

            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';
            orderCard.innerHTML = `
                <div class="order-header">
                    <span class="order-id">#${orderDoc.id}</span>
                    <span class="order-date">${formatDate(order.created_at.toDate())}</span>
                </div>
                <div class="order-details">
                    <div class="order-customer">
                        <i class="fas fa-user"></i>
                        <span>${user ? user.name : 'Unknown User'}</span>
                    </div>
                    <div class="order-total">
                        <i class="fas fa-dollar-sign"></i>
                        <span>$${order.total_amount.toFixed(2)}</span>
                    </div>
                    <div class="order-status ${order.status.toLowerCase()}">
                        <i class="fas fa-info-circle"></i>
                        <span>${order.status}</span>
                    </div>
                </div>
                <div class="order-items">
                    ${order.items.slice(0, 3).map(item => `
                        <div class="order-item">
                            <span class="item-name">${item.product_name}</span>
                            <span class="item-quantity">x${item.quantity}</span>
                        </div>
                    `).join('')}
                    ${order.items.length > 3 ? `<div class="order-item">And ${order.items.length - 3} more items...</div>` : ''}
                </div>
                <div class="order-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewOrderDetails('${orderDoc.id}')">View Details</button>
                    <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${orderDoc.id}')">Update Status</button>
                </div>
            `;
            orderList.appendChild(orderCard);
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
        dashboardCards.forEach(card => {
            card.classList.remove('loading');
            card.innerHTML = '<p>Error loading data</p>';
        });
        recentOrdersContainer.innerHTML = '<p>Error loading recent orders</p>';
    }
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

async function loadOrders() {
    const ordersTableBody = document.querySelector('#orders-table tbody');
    ordersTableBody.innerHTML = '<tr><td colspan="5"><div class="shimmer-wrapper"><div class="shimmer"></div></div></td></tr>';

    try {
        const ordersQuery = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
        const ordersSnapshot = await getDocs(ordersQuery);

        ordersTableBody.innerHTML = '';
        for (const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data();
            const userDoc = await getDoc(doc(db, 'users', order.user_id));
            const user = userDoc.data();

            const row = ordersTableBody.insertRow();
            row.innerHTML = `
                <td>${orderDoc.id}</td>
                <td>${user ? user.name : 'Unknown User'}</td>
                <td>$${order.total_amount.toFixed(2)}</td>
                <td><span class="order-status ${order.status.toLowerCase()}">${order.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewOrderDetails('${orderDoc.id}')">View</button>
                    <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${orderDoc.id}')">Update</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteOrder('${orderDoc.id}')">Delete</button>
                </td>
            `;
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersTableBody.innerHTML = '<tr><td colspan="5">Error loading orders</td></tr>';
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
        const supermarketsSnapshot = await getDocs(collection(db, 'supermarkets'));
        
        const supermarkets = {};
        supermarketsSnapshot.forEach(doc => {
            supermarkets[doc.id] = doc.data().name;
        });

        productsGrid.innerHTML = '';

        productsSnapshot.forEach(doc => {
            const product = doc.data();
            const productCard = createProductCard(doc.id, product, supermarkets[product.supermarketId]);
            productsGrid.appendChild(productCard);
        });
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<p>Error loading products</p>';
    }
}

function createProductCard(id, product, supermarketName) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <img src="${product.imageUrl}" alt="${product.name}" class="product-image">
        <h4 class="product-name">${product.name}</h4>
        <p class="product-price">$${product.price.toFixed(2)}</p>
        <p class="product-category">${product.category}</p>
        <p class="product-supermarket">${supermarketName || 'N/A'}</p>
        <div class="product-actions">
            <button onclick="editProduct('${id}')" class="btn btn-secondary btn-sm">Edit</button>
            <button onclick="deleteProduct('${id}')" class="btn btn-danger btn-sm">Delete</button>
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
    const usersTableBody = document.querySelector('#users-table tbody');
    usersTableBody.innerHTML = '<tr><td colspan="5"><div class="shimmer-wrapper"><div class="shimmer"></div></div></td></tr>';

    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        usersTableBody.innerHTML = '';
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const row = usersTableBody.insertRow();
            row.innerHTML = `
                <td>${doc.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role || 'User'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="editUser('${doc.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${doc.id}')">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading users:', error);
        usersTableBody.innerHTML = '<tr><td colspan="5">Error loading users</td></tr>';
    }
}

async function loadAnalytics() {
    const chartCanvas = document.getElementById('salesChart');
    if (!chartCanvas) {
        console.error('Chart canvas not found');
        return;
    }

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

        // Destroy existing chart if it exists
        if (window.salesChart instanceof Chart) {
            window.salesChart.destroy();
        }

        // Create new chart
        window.salesChart = new Chart(chartCanvas, {
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
        const chartContainer = document.getElementById('chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = '<p>Error loading analytics data</p>';
        }
    }
}

async function loadSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'app_settings'));
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            document.getElementById('site-name').value = settings.siteName || '';
            document.getElementById('contact-email').value = settings.contactEmail || '';
            document.getElementById('currency').value = settings.currency || 'USD';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Error loading settings');
    }
}

async function loadServices() {
    const servicesGrid = document.getElementById('services-grid');
    servicesGrid.innerHTML = '';

    for (let i = 0; i < 8; i++) {
        const shimmerCard = document.createElement('div');
        shimmerCard.className = 'service-card loading';
        shimmerCard.innerHTML = '<div class="shimmer-wrapper"><div class="shimmer"></div></div>';
        servicesGrid.appendChild(shimmerCard);
    }

    try {
        const servicesSnapshot = await getDocs(collection(db, 'services'));
        
        servicesGrid.innerHTML = '';

        servicesSnapshot.forEach(doc => {
            const service = doc.data();
            const serviceCard = createServiceCard(doc.id, service);
            servicesGrid.appendChild(serviceCard);
        });
    } catch (error) {
        console.error('Error loading services:', error);
        servicesGrid.innerHTML = '<p>Error loading services</p>';
    }
}

function createServiceCard(id, service) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
        <img src="${service.imageUrl}" alt="${service.name}" class="service-image">
        <div class="service-info">
            <h4 class="service-name">${service.name}</h4>
            <p class="service-price">${service.price}</p>
            <p class="service-category">${service.category}</p>
            <p class="service-rating">Rating: ${service.rating}</p>
        </div>
        <div class="service-actions">
            <button onclick="editService('${id}')" class="btn btn-secondary btn-sm">Edit</button>
            <button onclick="deleteService('${id}')" class="btn btn-danger btn-sm">Delete</button>
        </div>
    `;
    return card;
}

function searchServices(query) {
    const serviceCards = document.querySelectorAll('.service-card');
    const lowerQuery = query.toLowerCase();
    serviceCards.forEach(card => {
        const serviceName = card.querySelector('.service-name').textContent.toLowerCase();
        if (serviceName.includes(lowerQuery)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

async function loadSupermarkets() {
    const supermarketsGrid = document.getElementById('supermarkets-grid');
    supermarketsGrid.innerHTML = '';

    for (let i = 0; i < 8; i++) {
        const shimmerCard = document.createElement('div');
        shimmerCard.className = 'supermarket-card loading';
        shimmerCard.innerHTML = '<div class="shimmer-wrapper"><div class="shimmer"></div></div>';
        supermarketsGrid.appendChild(shimmerCard);
    }

    try {
        const supermarketsSnapshot = await getDocs(collection(db, 'supermarkets'));
        
        supermarketsGrid.innerHTML = '';

        supermarketsSnapshot.forEach(doc => {
            const supermarket = doc.data();
            const supermarketCard = createSupermarketCard(doc.id, supermarket);
            supermarketsGrid.appendChild(supermarketCard);
        });
    } catch (error) {
        console.error('Error loading supermarkets:', error);
        supermarketsGrid.innerHTML = '<p>Error loading supermarkets</p>';
    }
}

function createSupermarketCard(id, supermarket) {
    const card = document.createElement('div');
    card.className = 'supermarket-card';
    card.innerHTML = `
        <img src="${supermarket.imageUrl}" alt="${supermarket.name}" class="supermarket-image">
        <div class="supermarket-info">
            <h4 class="supermarket-name">${supermarket.name}</h4>
            <p class="supermarket-address">${supermarket.address}</p>
        </div>
        <div class="supermarket-actions">
            <button onclick="viewSupermarketProducts('${id}')" class="btn btn-primary btn-sm">View Products</button>
            <button onclick="openAddProductToSupermarketModal('${id}')" class="btn btn-success btn-sm">Add Product</button>
            <button onclick="editSupermarket('${id}')" class="btn btn-secondary btn-sm">Edit</button>
            <button onclick="deleteSupermarket('${id}')" class="btn btn-danger btn-sm">Delete</button>
        </div>
    `;
    return card;
}

function searchSupermarkets(query) {
    const supermarketCards = document.querySelectorAll('.supermarket-card');
    const lowerQuery = query.toLowerCase();
    supermarketCards.forEach(card => {
        const supermarketName = card.querySelector('.supermarket-name').textContent.toLowerCase();
        if (supermarketName.includes(lowerQuery)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

async function login(accessKey) {
    console.log('Login attempt with key:', accessKey);
    if (accessKey === '159357') {
        console.log('Correct access key entered');
        const userRole = 'admin'; 
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userRole', userRole);
        checkAuth();
    } else {
        console.log('Incorrect access key');
        document.getElementById('loginError').textContent = 'Invalid access key';
    }
}

function logout() {
    console.log('Logging out');
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

async function viewOrderDetails(orderId) {
    try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        const orderData = orderDoc.data();
        const userDoc = await getDoc(doc(db, 'users', orderData.user_id));
        const userData = userDoc.data();
        
        const modalContent = `
            <h2>Order Details</h2>
            <div class="order-details-grid">
                <div class="order-details-item">
                    <h4>Order Information</h4>
                    <p><strong>Order ID:</strong> ${orderId}</p>
                    <p><strong>Date:</strong> ${formatDate(orderData.created_at.toDate())}</p>
                    <p><strong>Status:</strong> ${orderData.status}</p>
                    <p><strong>Total Amount:</strong> $${orderData.total_amount.toFixed(2)}</p>
                </div>
                <div class="order-details-item">
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${userData ? userData.name : 'Unknown'}</p>
                    <p><strong>Email:</strong> ${userData ? userData.email : 'Unknown'}</p>
                    <p><strong>Phone:</strong> ${orderData.phone_number}</p>
                    <p><strong>Address:</strong> ${orderData.address}</p>
                </div>
            </div>
            <div class="order-details-item">
                <h4>Order Items</h4>
                <ul class="order-items-list">
                    ${orderData.items.map(item => `
                        <li>
                            <img src="${item.image_url || '/placeholder-image.jpg'}" alt="${item.product_name}" class="order-item-image">
                            <div class="order-item-details">
                                <span class="order-item-name">${item.product_name}</span>
                                <span class="order-item-quantity">Quantity: ${item.quantity}</span>
                                <span class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="order-summary">
                <h4>Order Summary</h4>
                <div class="order-summary-item">
                    <span>Subtotal:</span>
                    <span>$${orderData.total_amount.toFixed(2)}</span>
                </div>
                <div class="order-summary-item">
                    <span>Delivery Fee:</span>
                    <span>$${orderData.delivery_fee ? orderData.delivery_fee.toFixed(2) : '0.00'}</span>
                </div>
                <div class="order-total">
                    <span>Total:</span>
                    <span>$${(orderData.total_amount + (orderData.delivery_fee || 0)).toFixed(2)}</span>
                </div>
            </div>
        `;
        
        showModal(modalContent, 'orderDetailsModal');
    } catch (error) {
        console.error('Error fetching order details:', error);
        alert('Error fetching order details');
    }
}

async function updateOrderStatus(orderId) {
    try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        const currentStatus = orderDoc.data().status;
        
        const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        const statusSelect = statusOptions.map(status => 
            `<option value="${status}" ${status === currentStatus ? 'selected' : ''}>${status}</option>`
        ).join('');
        
        const modalContent = `
            <h2>Update Order Status</h2>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Current Status:</strong> ${currentStatus}</p>
            <div class="form-group">
                <label for="newStatus">New Status:</label>
                <select id="newStatus" class="form-control">
                    ${statusSelect}
                </select>
            </div>
            <button onclick="confirmStatusUpdate('${orderId}')" class="btn btn-primary">Update Status</button>
        `;
        
        showModal(modalContent);
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Error updating order status');
    }
}

async function confirmStatusUpdate(orderId) {
    const newStatus = document.getElementById('newStatus').value;
    try {
        await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
        closeModal('dashboardModal');
        loadDashboard();
        loadOrders();
    } catch (error) {
        console.error('Error confirming status update:', error);
        alert('Error updating order status');
    }
}

async function deleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        try {
            await deleteDoc(doc(db, 'orders', orderId));
            loadOrders();
            loadDashboard();
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Error deleting order');
        }
    }
}

async function editProduct(productId) {
    try {
        const productDoc = await getDoc(doc(db, 'products', productId));
        const productData = productDoc.data();
        
        const modalContent = `
            <h2>Edit Product</h2>
            <form id="editProductForm">
                <div class="form-group">
                    <label for="editProductName">Product Name</label>
                    <input type="text" id="editProductName" value="${productData.name}" required>
                </div>
                <div class="form-group">
                    <label for="editProductDescription">Description</label>
                    <textarea id="editProductDescription" rows="3">${productData.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editProductPrice">Price</label>
                    <input type="number" id="editProductPrice" value="${productData.price}" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="editProductImageUrl">Image URL</label>
                    <input type="url" id="editProductImageUrl" value="${productData.imageUrl}" required>
                </div>
                <div class="form-group">
                    <label for="editProductUnit">Unit</label>
                    <input type="text" id="editProductUnit" value="${productData.unit}" required>
                </div>
                <div class="form-group">
                    <label for="editProductSupermarket">Supermarket</label>
                    <select id="editProductSupermarket" required>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Update Product</button>
            </form>
        `;
        
        showModal(modalContent);

        // Load supermarkets for the edit form
        const supermarketsSnapshot = await getDocs(collection(db, 'supermarkets'));
        const supermarketSelect = document.getElementById('editProductSupermarket');
        supermarketSelect.innerHTML = '<option value="">Select a supermarket</option>';
        supermarketsSnapshot.forEach(doc => {
            const supermarket = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = supermarket.name;
            if (doc.id === productData.supermarketId) {
                option.selected = true;
            }
            supermarketSelect.appendChild(option);
        });
        
        document.getElementById('editProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedProduct = {
                name: document.getElementById('editProductName').value,
                description: document.getElementById('editProductDescription').value,
                price: parseFloat(document.getElementById('editProductPrice').value),
                imageUrl: document.getElementById('editProductImageUrl').value,
                unit: document.getElementById('editProductUnit').value,
                supermarketId: document.getElementById('editProductSupermarket').value
            };
            try {
                await updateDoc(doc(db, 'products', productId), updatedProduct);
                closeModal('dashboardModal');
                loadProducts();
            } catch (error) {
                console.error('Error updating product:', error);
                alert('Error updating product');
            }
        });
    } catch (error) {
        console.error('Error loading product details:', error);
        alert('Error loading product details');
    }
}

async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product');
        }
    }
}

async function loadTraditionalMarkets() {
    const marketsGrid = document.getElementById('traditional-markets-grid');
    marketsGrid.innerHTML = '';

    // Add loading state
    for (let i = 0; i < 6; i++) {
        const shimmerCard = document.createElement('div');
        shimmerCard.className = 'traditional-market-card loading';
        shimmerCard.innerHTML = '<div class="shimmer-wrapper"><div class="shimmer"></div></div>';
        marketsGrid.appendChild(shimmerCard);
    }

    try {
        const marketsSnapshot = await getDocs(collection(db, 'traditional_markets'));
        
        marketsGrid.innerHTML = '';

        marketsSnapshot.forEach(doc => {
            const market = doc.data();
            const marketCard = createTraditionalMarketCard(doc.id, market);
            marketsGrid.appendChild(marketCard);
        });
    } catch (error) {
        console.error('Error loading traditional markets:', error);
        marketsGrid.innerHTML = '<p>Error loading markets</p>';
    }
}

function createTraditionalMarketCard(id, market) {
    const card = document.createElement('div');
    card.className = 'traditional-market-card';
    card.innerHTML = `
        <div class="market-image-container">
            <img src="${market.imageUrl}" alt="${market.name}" class="market-image">
            <span class="market-status ${market.isOpen ? 'open' : 'closed'}">
                ${market.isOpen ? 'Open' : 'Closed'}
            </span>
        </div>
        <div class="market-content">
            <div class="market-info">
                <h3 class="market-name">${market.name}</h3>
                <div class="market-details">
                    <div class="market-address">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${market.location}</span>
                    </div>
                    <div class="market-stats">
                        <div class="market-products">
                            <i class="fas fa-shopping-basket"></i>
                            <span>${market.specialties ? market.specialties.length : 0} specialties</span>
                        </div>
                    </div>
                </div>
                <p class="market-description">${market.description || 'No description available'}</p>
            </div>
            <div class="market-actions">
                <button onclick="openAddProductToMarketModal('${id}')" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add Product
                </button>
                <button onclick="viewMarketProducts('${id}')" class="btn btn-secondary">
                    <i class="fas fa-eye"></i> View Products
                </button>
                <div class="dropdown">
                    <button class="btn btn-secondary">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="dropdown-content">
                        <a href="#" onclick="editTraditionalMarket('${id}')">
                            <i class="fas fa-edit"></i> Edit
                        </a>
                        <a href="#" onclick="deleteTraditionalMarket('${id}')" class="text-danger">
                            <i class="fas fa-trash"></i> Delete
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    return card;
}

async function addTraditionalMarket() {
    const name = document.getElementById('marketName').value;
    const location = document.getElementById('marketLocation').value;
    const description = document.getElementById('marketDescription').value;
    const imageUrl = document.getElementById('marketImageUrl').value;
    const specialties = document.getElementById('marketSpecialties').value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

    try {
        await addDoc(collection(db, 'traditional_markets'), {
            name,
            location,
            description,
            imageUrl,
            specialties,
            createdAt: new Date(),
            isOpen: true
        });

        closeModal('addTraditionalMarketModal');
        loadTraditionalMarkets();
    } catch (error) {
        console.error('Error adding traditional market:', error);
        alert('Error adding traditional market');
    }
}

async function addMarketProduct(marketId) {
    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDescription').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const quantity = parseInt(document.getElementById('productQuantity').value);
    const unit = document.getElementById('productUnit').value;
    const imageUrl = document.getElementById('productImageUrl').value;

    try {
        await addDoc(collection(db, 'market_products'), {
            name,
            description,
            price,
            quantity,
            unit,
            imageUrl,
            marketId,
            type: 'traditional_market_product',
            createdAt: new Date()
        });

        closeModal('addMarketProductModal');
        viewMarketProducts(marketId);
    } catch (error) {
        console.error('Error adding market product:', error);
        alert('Error adding market product');
    }
}

async function viewMarketProducts(marketId) {
    try {
        const productsSnapshot = await getDocs(
            query(
                collection(db, 'market_products'),
                where('marketId', '==', marketId),
                where('type', '==', 'traditional_market_product')
            )
        );

        const marketDoc = await getDoc(doc(db, 'traditional_markets', marketId));
        const market = marketDoc.data();

        const modalContent = `
            <h2>${market.name} - Products</h2>
            <div class="products-grid">
                ${productsSnapshot.empty ? '<p>No products available</p>' : 
                    productsSnapshot.docs.map(doc => {
                        const product = doc.data();
                        return `
                            <div class="product-card">
                                <img src="${product.imageUrl || '/api/placeholder/400/300'}" alt="${product.name}" class="product-image">
                                <h4 class="product-name">${product.name}</h4>
                                <p class="product-price">$${product.price.toFixed(2)}</p>
                                <p class="product-quantity">${product.quantity} ${product.unit}</p>
                                <div class="product-actions">
                                    <button onclick="editMarketProduct('${doc.id}')" class="btn btn-secondary btn-sm">Edit</button>
                                    <button onclick="deleteMarketProduct('${doc.id}')" class="btn btn-danger btn-sm">Delete</button>
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
            <div class="modal-actions">
                <button onclick="openAddProductToMarketModal('${marketId}')" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add New Product
                </button>
            </div>
        `;

        showModal(modalContent, 'marketProductsModal');
    } catch (error) {
        console.error('Error loading market products:', error);
        alert('Error loading market products');
    }
}

function openAddProductToMarketModal(marketId) {
    const modalContent = `
        <h2>Add Product to Market</h2>
        <form id="addMarketProductForm">
            <div class="form-group">
                <label for="productName">Product Name</label>
                <input type="text" id="productName" required>
            </div>
            <div class="form-group">
                <label for="productDescription">Description</label>
                <textarea id="productDescription"></textarea>
            </div>
            <div class="form-group">
                <label for="productPrice">Price</label>
                <input type="number" id="productPrice" step="0.01" required>
            </div>
            <div class="form-group">
                <label for="productQuantity">Quantity</label>
                <input type="number" id="productQuantity" required>
            </div>
            <div class="form-group">
                <label for="productUnit">Unit</label>
                <input type="text" id="productUnit" required>
            </div>
            <div class="form-group">
                <label for="productImageUrl">Image URL</label>
                <input type="url" id="productImageUrl" required>
                <img id="imagePreview" src="/api/placeholder/400/300" alt="Preview">
            </div>
            <button type="submit" class="btn btn-primary">Add Product</button>
        </form>
    `;
    
    showModal(modalContent);
    
    // Add form submit handler
    document.getElementById('addMarketProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newProduct = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            quantity: parseInt(document.getElementById('productQuantity').value),
            unit: document.getElementById('productUnit').value,
            imageUrl: document.getElementById('productImageUrl').value,
            marketId: marketId,
            type: 'traditional_market_product',
            createdAt: new Date()
        };
        
        try {
            await addDoc(collection(db, 'market_products'), newProduct);
            closeModal();
            viewMarketProducts(marketId);
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Error adding product');
        }
    });

    // Add image preview handler
    document.getElementById('productImageUrl').addEventListener('input', (e) => {
        document.getElementById('imagePreview').src = e.target.value || '/api/placeholder/400/300';
    });
}

async function deleteTraditionalMarket(marketId) {
    if (confirm('Are you sure you want to delete this market? This will also delete all associated products.')) {
        try {
            // Delete the market
            await deleteDoc(doc(db, 'traditional_markets', marketId));
            
            // Delete all associated products
            const productsSnapshot = await getDocs(
                query(
                    collection(db, 'market_products'),
                    where('marketId', '==', marketId)
                )
            );
            
            const batch = writeBatch(db);
            productsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            
            loadTraditionalMarkets();
        } catch (error) {
            console.error('Error deleting traditional market:', error);
            alert('Error deleting market');
        }
    }
};

async function editUser(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        
        const modalContent = `
            <h2>Edit User</h2>
            <form id="editUserForm">
                <div class="form-group">
                    <label for="editUserName">Name</label>
                    <input type="text" id="editUserName" value="${userData.name}" required>
                </div>
                <div class="form-group">
                    <label for="editUserEmail">Email</label>
                    <input type="email" id="editUserEmail" value="${userData.email}" required>
                </div>
                <div class="form-group">
                    <label for="editUserRole">Role</label>
                    <select id="editUserRole">
                        <option value="User" ${userData.role === 'User' ? 'selected' : ''}>User</option>
                        <option value="Admin" ${userData.role === 'Admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Update User</button>
            </form>
        `;
        
        showModal(modalContent);
        
        document.getElementById('editUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedUser = {
                name: document.getElementById('editUserName').value,
                email: document.getElementById('editUserEmail').value,
                role: document.getElementById('editUserRole').value
            };
            try {
                await updateDoc(doc(db, 'users', userId), updatedUser);
                closeModal('dashboardModal');
                loadUsers();
            } catch (error) {
                console.error('Error updating user:', error);
                alert('Error updating user');
            }
        });
    } catch (error) {
        console.error('Error loading user details:', error);
        alert('Error loading user details');
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await deleteDoc(doc(db, 'users', userId));
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    }
}

async function editService(serviceId) {
    try {
        const serviceDoc = await getDoc(doc(db, 'services', serviceId));
        const serviceData = serviceDoc.data();
        
        const modalContent = `
            <h2>Edit Service</h2>
            <form id="editServiceForm">
                <div class="form-group">
                    <label for="editServiceName">Service Name</label>
                    <input type="text" id="editServiceName" value="${serviceData.name}" required>
                </div>
                <div class="form-group">
                    <label for="editServiceDescription">Description</label>
                    <textarea id="editServiceDescription" rows="3">${serviceData.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editServicePrice">Price</label>
                    <input type="text" id="editServicePrice" value="${serviceData.price}" required>
                </div>
                <div class="form-group">
                    <label for="editServiceCategory">Category</label>
                    <input type="text" id="editServiceCategory" value="${serviceData.category}" required>
                </div>
                <div class="form-group">
                    <label for="editServiceRating">Rating</label>
                    <input type="number" id="editServiceRating" value="${serviceData.rating}" step="0.1" min="0" max="5" required>
                </div>
                <div class="form-group">
                    <label for="editServiceImageUrl">Image URL</label>
                    <input type="url" id="editServiceImageUrl" value="${serviceData.imageUrl}" required>
                </div>
                <button type="submit" class="btn btn-primary">Update Service</button>
            </form>
        `;
        
        showModal(modalContent);
        
        document.getElementById('editServiceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedService = {
                name: document.getElementById('editServiceName').value,
                description: document.getElementById('editServiceDescription').value,
                price: document.getElementById('editServicePrice').value,
                category: document.getElementById('editServiceCategory').value,
                rating: parseFloat(document.getElementById('editServiceRating').value),
                imageUrl: document.getElementById('editServiceImageUrl').value
            };
            try {
                await updateDoc(doc(db, 'services', serviceId), updatedService);
                closeModal('dashboardModal');
                loadServices();
            } catch (error) {
                console.error('Error updating service:', error);
                alert('Error updating service');
            }
        });
    } catch (error) {
        console.error('Error loading service details:', error);
        alert('Error loading service details');
    }
}

async function deleteService(serviceId) {
    if (confirm('Are you sure you want to delete this service?')) {
        try {
            await deleteDoc(doc(db, 'services', serviceId));
            loadServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error deleting service');
        }
    }
}

async function editSupermarket(supermarketId) {
    try {
        const supermarketDoc = await getDoc(doc(db, 'supermarkets', supermarketId));
        const supermarketData = supermarketDoc.data();
        
        const modalContent = `
            <h2>Edit Supermarket</h2>
            <form id="editSupermarketForm">
                <div class="form-group">
                    <label for="editSupermarketName">Supermarket Name</label>
                    <input type="text" id="editSupermarketName" value="${supermarketData.name}" required>
                </div>
                <div class="form-group">
                    <label for="editSupermarketAddress">Address</label>
                    <input type="text" id="editSupermarketAddress" value="${supermarketData.address}" required>
                </div>
                <div class="form-group">
                    <label for="editSupermarketImageUrl">Image URL</label>
                    <input type="url" id="editSupermarketImageUrl" value="${supermarketData.imageUrl}" required>
                </div>
                <button type="submit" class="btn btn-primary">Update Supermarket</button>
            </form>
        `;
        
        showModal(modalContent);
        
        document.getElementById('editSupermarketForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedSupermarket = {
                name: document.getElementById('editSupermarketName').value,
                address: document.getElementById('editSupermarketAddress').value,
                imageUrl: document.getElementById('editSupermarketImageUrl').value
            };
            try {
                await updateDoc(doc(db, 'supermarkets', supermarketId), updatedSupermarket);
                closeModal('dashboardModal');
                loadSupermarkets();
            } catch (error) {
                console.error('Error updating supermarket:', error);
                alert('Error updating supermarket');
            }
        });
    } catch (error) {
        console.error('Error loading supermarket details:', error);
        alert('Error loading supermarket details');
    }
}

async function deleteSupermarket(supermarketId) {
    if (confirm('Are you sure you want to delete this supermarket?')) {
        try {
            await deleteDoc(doc(db, 'supermarkets', supermarketId));
            loadSupermarkets();
        } catch (error) {
            console.error('Error deleting supermarket:', error);
            alert('Error deleting supermarket');
        }
    }
}


async function viewSupermarketProducts(supermarketId) {
    try {
        const productsSnapshot = await getDocs(query(collection(db, 'products'), where('supermarketId', '==', supermarketId)));
        const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const modalContent = `
            <h2>Supermarket Products</h2>
            <div class="products-grid">
                ${products.map(product => `
                    <div class="product-card" data-product-id="${product.id}"> 
                        <img src="${product.imageUrl}" alt="${product.name}" class="product-image">
                        <h4 class="product-name">${product.name}</h4>
                        <p class="product-price">$${product.price.toFixed(2)}</p>
                        <div class="product-actions">
                            <button onclick="editProduct('${product.id}')" class="btn btn-secondary btn-sm">Edit</button>
                            <button onclick="deleteProduct('${product.id}')" class="btn btn-danger btn-sm">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        showModal(modalContent, 'supermarketProductsModal');
    } catch (error) {
        console.error('Error loading supermarket products:', error);
        alert('Error loading supermarket products');
    }
}

function showModal(content, modalId = 'dashboardModal') {
    const modal = document.getElementById(modalId) || createModal(modalId);
    modal.querySelector('.modal-content').innerHTML = content;
    modal.style.display = 'block';
}

function closeModal(modalId = 'dashboardModal') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function createModal(modalId) {
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('${modalId}')">&times;</span>
            <div id="modalContent"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function openAddCategoryModal() {
    const modal = document.getElementById('addCategoryModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Add Category Modal not found in the DOM');
    }
}

function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Add Product Modal not found in the DOM');
    }
}

function openAddServiceModal() {
    const modal = document.getElementById('addServiceModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Add Service Modal not found in the DOM');
    }
}

function openAddSupermarketModal() {
    const modal = document.getElementById('addSupermarketModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Add Supermarket Modal not found in the DOM');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    checkAuth();

    // Move addMarketBtn declaration and event listener inside DOMContentLoaded
    const addMarketBtn = document.getElementById('add-market-btn');
    if (addMarketBtn) {
        addMarketBtn.addEventListener('click', openAddMarketModal);
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            if (section === 'traditional-markets') {
                loadTraditionalMarkets();
            }
        });
    });

    // Image preview handlers
    document.getElementById('marketImageUrl')?.addEventListener('input', (e) => {
        document.getElementById('imagePreview').src = e.target.value || '/api/placeholder/400/300';
    });

    document.getElementById('productImageUrl')?.addEventListener('input', (e) => {
        document.getElementById('productImagePreview').src = e.target.value || '/api/placeholder/400/300';
    });

    // Market search handler
    document.getElementById('market-search')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.traditional-market-card').forEach(card => {
            const marketName = card.querySelector('.market-name').textContent.toLowerCase();
            const marketLocation = card.querySelector('.market-address span').textContent.toLowerCase();
            if (marketName.includes(searchTerm) || marketLocation.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });


    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const accessKey = document.getElementById('accessKey').value;
            console.log('Login form submitted with key:', accessKey);
            login(accessKey);
        });
    } else {
        console.log('Login form not found');
    }

    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', openAddCategoryModal);
    } else {
        console.error('Add Category button not found');
    }

    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', openAddProductModal);
    } else {
        console.error('Add Product button not found');
    }

    const addServiceBtn = document.getElementById('add-service-btn');
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', openAddServiceModal);
    } else {
        console.error('Add Service button not found');
    }

    const addSupermarketBtn = document.getElementById('add-supermarket-btn');
    if (addSupermarketBtn) {
        addSupermarketBtn.addEventListener('click', openAddSupermarketModal);
    } else {
        console.error('Add Supermarket button not found');
    }

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
        const supermarketId = form.productSupermarket.value;

        let category = "";
        try {
            const supermarketDoc = await getDoc(doc(db, 'supermarkets', supermarketId));
            if (supermarketDoc.exists()) {
                category = supermarketDoc.data().category || ''; 
            }
        } catch (error) {
            console.error('Error fetching supermarket category:', error);
        }

        const newProduct = {
            name: form.productName.value,
            description: form.productDescription.value,
            price: parseFloat(form.productPrice.value),
            imageUrl: form.productImageUrl.value,
            category: category,
            unit: form.productUnit.value,
            popularity: 0,
            averageRating: 0,
            url: generateProductUrl(form.productName.value),
            supermarketId: supermarketId
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

    document.getElementById('addServiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const newService = {
            name: form.serviceName.value,
            description: form.serviceDescription.value,
            price: form.servicePrice.value,
            category: form.serviceCategory.value,
            rating: parseFloat(form.serviceRating.value),
            imageUrl: form.serviceImageUrl.value
        };
        try {
            await addDoc(collection(db, 'services'), newService);
            closeModal('addServiceModal');
            loadServices();
        } catch (error) {
            console.error('Error adding service:', error);
            alert('Error adding service');
        }
    });

    document.getElementById('addSupermarketForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const newSupermarket = {
            name: form.supermarketName.value,
            address: form.supermarketAddress.value,
            imageUrl: form.supermarketImageUrl.value
        };
        try {
            await addDoc(collection(db, 'supermarkets'), newSupermarket);
            closeModal('addSupermarketModal');
            loadSupermarkets();
        } catch (error) {
            console.error('Error adding supermarket:', error);
            alert('Error adding supermarket');
        }
    });

    if (addMarketBtn) {
        addMarketBtn.addEventListener('click', openAddMarketModal);
    }

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
                case 'services':
                    loadServices();
                    break;
                case 'supermarkets':
                    loadSupermarkets();
                    break;
            }
        });
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

    document.getElementById('service-search').addEventListener('input', (e) => {
        searchServices(e.target.value);
    });

    document.getElementById('supermarket-search').addEventListener('input', (e) => {
        searchSupermarkets(e.target.value);
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }    

    // Add section handler for traditional markets
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            if (section === 'traditional-markets') {
                loadTraditionalMarkets();
            }
        });
    });
});

function generateProductUrl(productName) {
    return productName.toLowerCase().replace(/\s+/g, '-');
}

async function openAddProductToSupermarketModal(supermarketId) {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.style.display = 'block';

        // Load supermarkets
        const supermarketsSnapshot = await getDocs(collection(db, 'supermarkets'));
        const supermarketSelect = document.getElementById('productSupermarket');
        supermarketSelect.innerHTML = '<option value="">Select a supermarket</option>';
        supermarketsSnapshot.forEach(doc => {
            const supermarket = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = supermarket.name;
            supermarketSelect.appendChild(option);
        });

        // Select the appropriate supermarket option
        supermarketSelect.value = supermarketId;
    } else {
        console.error('Add Product Modal not found in the DOM');
    }
}

function showDeliveryInterfaceButton() {
    const dashboardContent = document.querySelector('.main-content');
    dashboardContent.innerHTML = `
        <h2>Welcome, Delivery Person!</h2>
        <p>Click the button below to access your delivery interface:</p>
        <button id="goToDeliveryInterfaceBtn" class="btn btn-primary">Go to Delivery Interface</button>
    `;
    document.getElementById('goToDeliveryInterfaceBtn').addEventListener('click', goToDeliveryInterface);
}

function goToDeliveryInterface() {
    window.location.href = 'delivery-interface.html';
}

function openAddMarketModal() {
    const modalContent = `
        <h2>Add Traditional Market</h2>
        <form id="addTraditionalMarketForm">
            <div class="form-group">
                <label for="marketName">Market Name</label>
                <input type="text" id="marketName" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="marketLocation">Location</label>
                <input type="text" id="marketLocation" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="marketDescription">Description</label>
                <textarea id="marketDescription" class="form-control"></textarea>
            </div>
            <div class="form-group">
                <label for="marketImageUrl">Image URL</label>
                <input type="url" id="marketImageUrl" class="form-control" required>
                <div class="image-preview mt-2">
                    <img id="marketImagePreview" src="/api/placeholder/400/300" alt="Market Preview" class="img-fluid">
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="marketStatus" checked>
                    Market is Open
                </label>
            </div>
            <div class="form-group">
                <label for="marketSpecialties">Specialties (comma-separated)</label>
                <input type="text" id="marketSpecialties" class="form-control" placeholder="e.g., Fresh Produce, Seafood, Spices">
            </div>
            <button type="submit" class="btn btn-primary">Add Market</button>
        </form>
    `;
    
    showModal(modalContent);
    
    // Set up form submission handler
    const form = document.getElementById('addTraditionalMarketForm');
    form.addEventListener('submit', handleMarketFormSubmit);
    
    // Set up image preview
    const imageUrlInput = document.getElementById('marketImageUrl');
    imageUrlInput.addEventListener('input', (e) => {
        const preview = document.getElementById('marketImagePreview');
        preview.src = e.target.value || '/api/placeholder/400/300';
    });
}

// Add the form submission handler
async function handleMarketFormSubmit(e) {
    e.preventDefault();
    
    try {
        const marketData = {
            name: document.getElementById('marketName').value,
            location: document.getElementById('marketLocation').value,
            description: document.getElementById('marketDescription').value,
            imageUrl: document.getElementById('marketImageUrl').value,
            isOpen: document.getElementById('marketStatus').checked,
            specialties: document.getElementById('marketSpecialties').value
                .split(',')
                .map(s => s.trim())
                .filter(s => s),
            createdAt: new Date()
        };

        // Add to Firestore
        await addDoc(collection(db, 'traditional_markets'), marketData);
        
        // Close modal and reload markets
        closeModal();
        loadTraditionalMarkets();
        
        // Show success message
        showNotification('Market added successfully!', 'success');
    } catch (error) {
        console.error('Error adding market:', error);
        showNotification('Error adding market. Please try again.', 'error');
    }
}

// Add notification helper
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}



// Make sure these functions are available globally
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.confirmStatusUpdate = confirmStatusUpdate;
window.deleteOrder = deleteOrder;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.openAddCategoryModal = openAddCategoryModal;
window.openAddProductModal = openAddProductModal;
window.closeModal = closeModal;
window.goToDeliveryInterface = goToDeliveryInterface;
window.openAddProductToSupermarketModal = openAddProductToSupermarketModal;
window.editService = editService;
window.deleteService = deleteService;
window.openAddServiceModal = openAddServiceModal;
window.viewSupermarketProducts = viewSupermarketProducts;
window.editSupermarket = editSupermarket;
window.deleteSupermarket = deleteSupermarket;
window.openAddSupermarketModal = openAddSupermarketModal;
window.openAddProductToMarketModal = openAddProductToMarketModal;
window.openAddMarketModal = openAddMarketModal;
window.handleMarketFormSubmit = handleMarketFormSubmit;



// Export functions for use in other modules if needed
export {
    loadDashboard,
    openAddMarketModal,
    handleMarketFormSubmit,
    openAddProductToMarketModal,
    loadOrders,
    loadInventory,
    loadUsers,
    loadAnalytics,
    loadSettings,
    loadServices,
    loadSupermarkets,
    login,
    logout,
    showSection,
    viewOrderDetails,
    updateOrderStatus,
    deleteOrder,
    editProduct,
    deleteProduct,
    editUser,
    deleteUser,
    editService,
    deleteService,
    editSupermarket,
    deleteSupermarket,
    viewSupermarketProducts,
    showModal,
    closeModal,
    openAddCategoryModal,
    openAddProductModal,
    openAddServiceModal,
    openAddSupermarketModal,
    openAddProductToSupermarketModal
};

// Add these functions to the global scope
window.addTraditionalMarket = async function() {
    const name = document.getElementById('marketName').value;
    const location = document.getElementById('marketLocation').value;
    const description = document.getElementById('marketDescription').value;
    const imageUrl = document.getElementById('marketImageUrl').value;
    const isOpen = document.getElementById('marketStatus').checked;

    try {
        await addDoc(collection(db, 'traditional_markets'), {
            name,
            location,
            description,
            imageUrl,
            isOpen,
            createdAt: new Date()
        });

        closeModal();
        loadTraditionalMarkets();
    } catch (error) {
        console.error('Error adding traditional market:', error);
        alert('Error adding traditional market');
    }
};

window.editTraditionalMarket = async function(marketId) {
    try {
        const marketDoc = await getDoc(doc(db, 'traditional_markets', marketId));
        const marketData = marketDoc.data();
        
        const modalContent = `
            <h2>Edit Traditional Market</h2>
            <form id="editMarketForm">
                <div class="form-group">
                    <label for="editMarketName">Market Name</label>
                    <input type="text" id="editMarketName" value="${marketData.name}" required>
                </div>
                <div class="form-group">
                    <label for="editMarketLocation">Location</label>
                    <input type="text" id="editMarketLocation" value="${marketData.location}" required>
                </div>
                <div class="form-group">
                    <label for="editMarketDescription">Description</label>
                    <textarea id="editMarketDescription">${marketData.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editMarketImageUrl">Image URL</label>
                    <input type="url" id="editMarketImageUrl" value="${marketData.imageUrl}" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="editMarketStatus" ${marketData.isOpen ? 'checked' : ''}>
                        Market is Open
                    </label>
                </div>
                <button type="submit" class="btn btn-primary">Update Market</button>
            </form>
        `;
        
        showModal(modalContent);
        
        document.getElementById('editMarketForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedMarket = {
                name: document.getElementById('editMarketName').value,
                location: document.getElementById('editMarketLocation').value,
                description: document.getElementById('editMarketDescription').value,
                imageUrl: document.getElementById('editMarketImageUrl').value,
                isOpen: document.getElementById('editMarketStatus').checked
            };
            try {
                await updateDoc(doc(db, 'traditional_markets', marketId), updatedMarket);
                closeModal();
                loadTraditionalMarkets();
            } catch (error) {
                console.error('Error updating market:', error);
                alert('Error updating market');
            }
        });
    } catch (error) {
        console.error('Error loading market details:', error);
        alert('Error loading market details');
    }
};

window.deleteTraditionalMarket = async function(marketId) {
    if (confirm('Are you sure you want to delete this market? This will also delete all associated products.')) {
        try {
            // Delete the market
            await deleteDoc(doc(db, 'traditional_markets', marketId));
            
            // Delete all associated products
            const productsSnapshot = await getDocs(
                query(
                    collection(db, 'market_products'),
                    where('marketId', '==', marketId)
                )
            );
            
            const batch = writeBatch(db);
            productsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            
            loadTraditionalMarkets();
        } catch (error) {
            console.error('Error deleting traditional market:', error);
            alert('Error deleting market');
        }
    }
};

window.viewMarketProducts = async function(marketId) {
    try {
        const productsSnapshot = await getDocs(
            query(
                collection(db, 'market_products'),
                where('marketId', '==', marketId),
                where('type', '==', 'traditional_market_product')
            )
        );

        const marketDoc = await getDoc(doc(db, 'traditional_markets', marketId));
        const market = marketDoc.data();

        const modalContent = `
            <h2>${market.name} - Products</h2>
            <div class="products-grid">
                ${productsSnapshot.empty ? '<p>No products available</p>' : 
                    productsSnapshot.docs.map(doc => {
                        const product = doc.data();
                        return `
                            <div class="product-card">
                                <img src="${product.imageUrl || '/api/placeholder/400/300'}" alt="${product.name}" class="product-image">
                                <h4 class="product-name">${product.name}</h4>
                                <p class="product-price">$${product.price.toFixed(2)}</p>
                                <p class="product-quantity">${product.quantity} ${product.unit}</p>
                                <div class="product-actions">
                                    <button onclick="editMarketProduct('${doc.id}')" class="btn btn-secondary btn-sm">Edit</button>
                                    <button onclick="deleteMarketProduct('${doc.id}')" class="btn btn-danger btn-sm">Delete</button>
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
            <div class="modal-actions">
                <button onclick="openAddProductToMarketModal('${marketId}')" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add New Product
                </button>
            </div>
        `;

        showModal(modalContent, 'marketProductsModal');
    } catch (error) {
        console.error('Error loading market products:', error);
        alert('Error loading market products');
    }
};

window.editMarketProduct = async function(productId) {
    try {
        const productDoc = await getDoc(doc(db, 'market_products', productId));
        const productData = productDoc.data();
        
        const modalContent = `
            <h2>Edit Market Product</h2>
            <form id="editMarketProductForm">
                <div class="form-group">
                    <label for="editMarketProductName">Product Name</label>
                    <input type="text" id="editMarketProductName" value="${productData.name}" required>
                </div>
                <div class="form-group">
                    <label for="editMarketProductDescription">Description</label>
                    <textarea id="editMarketProductDescription" rows="3">${productData.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editMarketProductPrice">Price</label>
                    <input type="number" id="editMarketProductPrice" value="${productData.price}" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="editMarketProductQuantity">Quantity</label>
                    <input type="number" id="editMarketProductQuantity" value="${productData.quantity}" required>
                </div>
                <div class="form-group">
                    <label for="editMarketProductUnit">Unit</label>
                    <input type="text" id="editMarketProductUnit" value="${productData.unit}" required>
                </div>
                <div class="form-group">
                    <label for="editMarketProductImageUrl">Image URL</label>
                    <input type="url" id="editMarketProductImageUrl" value="${productData.imageUrl}" required>
                </div>
                <button type="submit" class="btn btn-primary">Update Product</button>
            </form>
        `;
        
        showModal(modalContent);
        
        document.getElementById('editMarketProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedProduct = {
                name: document.getElementById('editMarketProductName').value,
                description: document.getElementById('editMarketProductDescription').value,
                price: parseFloat(document.getElementById('editMarketProductPrice').value),
                quantity: parseInt(document.getElementById('editMarketProductQuantity').value),
                unit: document.getElementById('editMarketProductUnit').value,
                imageUrl: document.getElementById('editMarketProductImageUrl').value,
                marketId: productData.marketId,
                type: 'traditional_market_product',
                createdAt: productData.createdAt
            };
            try {
                await updateDoc(doc(db, 'market_products', productId), updatedProduct);
                closeModal();
                viewMarketProducts(productData.marketId);
            } catch (error) {
                console.error('Error updating product:', error);
                alert('Error updating product');
            }
        });
    } catch (error) {
        console.error('Error loading product details:', error);
        alert('Error loading product details');
    }
};

window.deleteMarketProduct = async function(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            const productDoc = await getDoc(doc(db, 'market_products', productId));
            const productData = productDoc.data();
            await deleteDoc(doc(db, 'market_products', productId));
            viewMarketProducts(productData.marketId);
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product');
        }
    }
};
