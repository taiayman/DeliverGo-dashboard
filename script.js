import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
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

function goToDeliveryInterface() {
    // Redirect to the delivery interface page
    window.location.href = 'delivery-interfacedelivery_interface.html';
}



function showDeliveryInterfaceButton() {
    const dashboardContent = document.querySelector('.main-content');
    dashboardContent.innerHTML = `
        <h2>Welcome, Delivery Person!</h2>
        <p>Click the button below to access your delivery interface:</p>
        <button id="goToDeliveryInterfaceBtn" class="btn btn-primary">Go to Delivery Interface</button>
    `;
    
    // Add event listener to the button
    document.getElementById('goToDeliveryInterfaceBtn').addEventListener('click', window.goToDeliveryInterface);
}

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
        <h4 class="service-name">${service.name}</h4>
        <p class="service-price">${service.price}</p>
        <p class="service-category">${service.category}</p>
        <p class="service-rating">Rating: ${service.rating}</p>
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
        
        // Handle form submission
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

function openAddServiceModal() {
    const modal = document.getElementById('addServiceModal');
    modal.style.display = 'block';
}


async function login(accessKey) {
    console.log('Login attempt with key:', accessKey);
    if (accessKey === '159357') {
        console.log('Correct access key entered');
        // Remove the call to getUserRole
        const userRole = 'admin'; // Set a default role or implement role logic here
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
        document.getElementById('chart-container').innerHTML = '<p>Error loading analytics data</p>';
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
                    <label for="editProductCategory">Category</label>
                    <select id="editProductCategory" required>
                        <!-- Categories will be loaded dynamically -->
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Update Product</button>
            </form>
        `;
        
        showModal(modalContent);
        
        // Load categories for the edit form
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categorySelect = document.getElementById('editProductCategory');
        categorySelect.innerHTML = '<option value="">Select a category</option>';
        categoriesSnapshot.forEach(doc => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = category.name;
            if (doc.id === productData.category) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });
        
        // Handle form submission
        document.getElementById('editProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedProduct = {
                name: document.getElementById('editProductName').value,
                description: document.getElementById('editProductDescription').value,
                price: parseFloat(document.getElementById('editProductPrice').value),
                imageUrl: document.getElementById('editProductImageUrl').value,
                category: document.getElementById('editProductCategory').value
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
        
        // Handle form submission
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    checkAuth();

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

    document.getElementById('add-service-btn').addEventListener('click', openAddServiceModal);

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

    document.getElementById('service-search').addEventListener('input', (e) => {
        searchServices(e.target.value);
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

    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const sidebar = document.querySelector('.sidebar');

    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });


});

function generateProductUrl(productName) {
    return productName.toLowerCase().replace(/\s+/g, '-');
}



function hasDeliveryPersonPermissions() {
    // This is a placeholder. You should implement your own logic to check permissions.
    // For example, you might check the user's role in your authentication system.
    // Return true if the user has delivery person permissions, false otherwise.
    return true; // Placeholder: always returns true
}


// Make functions available globally
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

window.editService = editService;
window.deleteService = deleteService;
window.openAddServiceModal = openAddServiceModal;



// Export functions for potential use as a module
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
    viewOrderDetails,
    updateOrderStatus,
    confirmStatusUpdate,
    deleteOrder,
    editProduct,
    deleteProduct,
    editUser,
    deleteUser,
    loadServices,
    editService,
    deleteService,
    openAddServiceModal
};
