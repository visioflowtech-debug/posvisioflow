// Configuration & Data
const PRODUCTS = [
    { id: 1, name: 'Hamburguesa', price: 15000, icon: '🍔' },
    { id: 2, name: 'Perro Caliente', price: 10000, icon: '🌭' },
    { id: 3, name: 'Gaseosa', price: 5000, icon: '🥤' },
    { id: 4, name: 'Cerveza', price: 8000, icon: '🍺' },
    { id: 5, name: 'Agua', price: 3000, icon: '💧' },
    { id: 6, name: 'Papas Fritas', price: 6000, icon: '🍟' },
    { id: 7, name: 'Empanada', price: 4000, icon: '🥟' },
    { id: 8, name: 'Jugo Natural', price: 7000, icon: '🍹' }
];

let cart = JSON.parse(localStorage.getItem('pos_cart')) || [];
let salesLog = JSON.parse(localStorage.getItem('pos_sales_log')) || [];

// DOM Elements
const productGrid = document.getElementById('product-grid');
const cartContainer = document.getElementById('cart-container');
const totalDisplay = document.getElementById('total-display');
const modalTotal = document.getElementById('modal-total');
const paymentModal = document.getElementById('payment-modal');
const printArea = document.getElementById('print-area');
const clockElement = document.getElementById('clock');

// Initialization
function init() {
    renderProducts();
    renderCart();
    updateClock();
    setInterval(updateClock, 60000);
}

// Render Products
function renderProducts() {
    productGrid.innerHTML = PRODUCTS.map(product => `
    <div class="product-card" onclick="addToCart(${product.id})">
        <div class="product-icon">${product.icon}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-price">${formatCurrency(product.price)}</div>
    </div>
`).join('');
}

// Render Cart
function renderCart() {
    if (cart.length === 0) {
        cartContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #9ca3af;">
            <p>Selecciona productos para agregar</p>
        </div>`;
        totalDisplay.textContent = formatCurrency(0);
        // Clear cart from storage if empty
        localStorage.removeItem('pos_cart');
        return;
    }

    cartContainer.innerHTML = cart.map((item, index) => `
    <div class="ticket-item">
        <div class="item-info">
            <span class="item-name">${item.name}</span>
            <span class="item-price">${formatCurrency(item.price)} x ${item.qty}</span>
        </div>
        <div class="item-controls">
            <button class="btn-qty" onclick="updateQuantity(${index}, -1)">-</button>
            <span class="qty-badge" onclick="manualQuantity(${index})" title="Clic para editar cantidad">${item.qty}</span>
            <button class="btn-qty" onclick="updateQuantity(${index}, 1)">+</button>
            <button class="btn-remove" onclick="removeFromCart(${index})">×</button>
        </div>
    </div>
`).join('');

    const total = calculateTotal();
    totalDisplay.textContent = formatCurrency(total);

    // Save cart state
    localStorage.setItem('pos_cart', JSON.stringify(cart));
}

// Cart Logic
function addToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    renderCart();
}

function updateQuantity(index, change) {
    const item = cart[index];
    if (!item) return;

    const newQty = item.qty + change;

    if (newQty > 0) {
        item.qty = newQty;
        renderCart();
    }
}

function manualQuantity(index) {
    const item = cart[index];
    if (!item) return;

    const input = prompt(`Ingrese la cantidad para "${item.name}":`, item.qty);
    if (input === null) return; // Cancelled

    const newQty = parseInt(input);

    if (!isNaN(newQty) && newQty > 0) {
        item.qty = newQty;
        renderCart();
    } else if (newQty === 0) {
        if (confirm(`¿Eliminar "${item.name}" del pedido?`)) {
            removeFromCart(index);
        }
    } else {
        alert("Por favor ingrese un número válido mayor a 0");
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function clearCart() {
    if (confirm('¿Estás seguro de cancelar la orden actual?')) {
        cart = [];
        renderCart();
    }
}

function calculateTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

// Payment & Printing
function openPaymentModal() {
    if (cart.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    modalTotal.textContent = formatCurrency(calculateTotal());
    paymentModal.classList.add('active');
}

function closePaymentModal() {
    paymentModal.classList.remove('active');
}

function processPayment(method) {
    const total = calculateTotal();
    let amountTendered = 0;
    let change = 0;

    if (method === 'Efectivo') {
        const input = prompt(`Total a Pagar: ${formatCurrency(total)}\n\n¿Cuánto dinero entrega el cliente?`);
        if (input === null) return; // Cancelado por el usuario

        // Limpiar input (quitar $ y puntos si los pone)
        const cleanInput = input.replace(/[^0-9]/g, '');
        amountTendered = parseInt(cleanInput);

        if (isNaN(amountTendered)) {
            alert('Por favor ingrese un monto válido.');
            return;
        }

        if (amountTendered < total) {
            alert(`⚠️ Monto insuficiente.\n\nFaltan: ${formatCurrency(total - amountTendered)}`);
            return;
        }

        change = amountTendered - total;
        alert(`✅ Cobro Exitoso\n\n💰 VUELTO A ENTREGAR: ${formatCurrency(change)}`);
    }

    const date = new Date();

    // Record Sale
    const sale = {
        id: Date.now(),
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        items: [...cart], // Copy cart
        total: total,
        method: method,
        amountTendered: method === 'Efectivo' ? amountTendered : null,
        change: method === 'Efectivo' ? change : null
    };

    salesLog.push(sale);
    localStorage.setItem('pos_sales_log', JSON.stringify(salesLog));

    // Generate Receipt
    generateReceipt(sale);

    // Close Modal & Print
    closePaymentModal();

    // Small delay to allow DOM to update before print
    setTimeout(() => {
        window.print();

        // AUTO-BACKUP: Download a physical file to ensure data persistence
        // This allows restoring data in another browser or if cache is cleared
        const data = {
            salesLog: salesLog,
            cart: cart,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        // Filename with timestamp to avoid overwriting
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `RESPALDO_VENTA_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Visual indicator
        const saveIndicator = document.createElement('div');
        saveIndicator.style.position = 'fixed';
        saveIndicator.style.bottom = '20px';
        saveIndicator.style.right = '20px';
        saveIndicator.style.background = '#10b981';
        saveIndicator.style.color = 'white';
        saveIndicator.style.padding = '10px 20px';
        saveIndicator.style.borderRadius = '8px';
        saveIndicator.style.zIndex = '2000';
        saveIndicator.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        saveIndicator.textContent = '✅ Respaldo Descargado';
        document.body.appendChild(saveIndicator);

        setTimeout(() => {
            saveIndicator.remove();
        }, 3000);

        // Reset after print
        cart = [];
        renderCart();
    }, 500);
}

function generateReceipt(sale) {
    const itemsHtml = sale.items.map(item => `
    <div class="print-row">
        <span>${item.qty} x ${item.name}</span>
        <span>${formatCurrency(item.price * item.qty)}</span>
    </div>
`).join('');

    printArea.innerHTML = `
    <div class="print-header">
        <div class="print-title">FERIA GASTRONÓMICA</div>
        <div>Ticket #${sale.id.toString().slice(-6)}</div>
        <div>${sale.date} - ${sale.time}</div>
    </div>
    
    ${itemsHtml}
    
    <div class="print-divider"></div>
    
    <div class="print-row">
        <strong>TOTAL</strong>
        <strong>${formatCurrency(sale.total)}</strong>
    </div>
    
    <div class="print-row">
        <span>Pago:</span>
        <span>${sale.method}</span>
    </div>
    ${sale.method === 'Efectivo' ? `
    <div class="print-row">
        <span>Recibido:</span>
        <span>${formatCurrency(sale.amountTendered)}</span>
    </div>
    <div class="print-row">
        <span>Cambio:</span>
        <span>${formatCurrency(sale.change)}</span>
    </div>
    ` : ''}

    <div class="print-footer">
        <p>¡Gracias por su compra!</p>
        <p>Propina no incluida</p>
    </div>
`;
}

// Admin / Excel Report
function downloadDailyReport() {
    if (salesLog.length === 0) {
        alert('No hay ventas registradas.');
        return;
    }

    // Filter for TODAY's sales only
    const todayStr = new Date().toLocaleDateString();
    const todaySales = salesLog.filter(s => s.date === todayStr);

    if (todaySales.length === 0) {
        alert('No hay ventas registradas con la fecha de hoy (' + todayStr + ').');
        return;
    }

    // Calculate Summaries
    const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const totalCash = todaySales.filter(s => s.method === 'Efectivo').reduce((sum, s) => sum + s.total, 0);
    const totalCard = todaySales.filter(s => s.method === 'Datáfono Bold').reduce((sum, s) => sum + s.total, 0);
    const totalItems = todaySales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.qty, 0), 0);

    // Build HTML Table for Excel
    let tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <!--[if gte mso 9]>
        <xml>
            <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                    <x:ExcelWorksheet>
                        <x:Name>Cierre ${todayStr}</x:Name>
                        <x:WorksheetOptions>
                            <x:DisplayGridlines/>
                        </x:WorksheetOptions>
                    </x:ExcelWorksheet>
                </x:ExcelWorksheets>
            </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; }
            .header { background-color: #2563eb; color: white; font-weight: bold; font-size: 16px; text-align: center; }
            .subheader { background-color: #f3f4f6; font-weight: bold; }
            .money { text-align: right; }
            th { background-color: #e5e7eb; font-weight: bold; border: 1px solid #000; }
            td { border: 1px solid #ccc; }
        </style>
    </head>
    <body>
        <table>
            <tr>
                <td colspan="5" class="header" style="height: 40px; vertical-align: middle;">REPORTE DE CIERRE - FERIA GASTRONÓMICA</td>
            </tr>
            <tr>
                <td colspan="5" style="text-align: center;">Fecha: ${todayStr}</td>
            </tr>
            <tr><td colspan="5"></td></tr>
            
            <!-- Summary Section -->
            <tr>
                <td colspan="2" class="subheader">RESUMEN DEL DÍA</td>
                <td colspan="3"></td>
            </tr>
            <tr>
                <td>Ventas Totales:</td>
                <td class="money" style="font-weight: bold; color: #2563eb;">${formatCurrency(totalSales)}</td>
                <td colspan="3"></td>
            </tr>
            <tr>
                <td>Efectivo:</td>
                <td class="money">${formatCurrency(totalCash)}</td>
                <td colspan="3"></td>
            </tr>
            <tr>
                <td>Datáfono Bold:</td>
                <td class="money">${formatCurrency(totalCard)}</td>
                <td colspan="3"></td>
            </tr>
            <tr>
                <td>Total Ítems Vendidos:</td>
                <td style="text-align: right;">${totalItems}</td>
                <td colspan="3"></td>
            </tr>
            <tr><td colspan="5"></td></tr>

            <!-- Details Header -->
            <tr>
                <th>Hora</th>
                <th>Ticket #</th>
                <th>Método Pago</th>
                <th>Detalle Productos</th>
                <th>Total Venta</th>
            </tr>
`;

    // Add Rows
    todaySales.forEach(sale => {
        const itemsDetail = sale.items.map(i => `${i.qty} x ${i.name}`).join('; ');
        tableHtml += `
        <tr>
            <td>${sale.time}</td>
            <td>#${sale.id.toString().slice(-6)}</td>
            <td>${sale.method}</td>
            <td>${itemsDetail}</td>
            <td class="money">${formatCurrency(sale.total)}</td>
        </tr>
    `;
    });

    tableHtml += `
        </table>
    </body>
    </html>
`;

    // Download
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Cierre_Caja_${todayStr.replace(/\//g, '-')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Backup & Restore System
function downloadBackup() {
    const data = {
        salesLog: salesLog,
        cart: cart,
        timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pos_respaldo_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function restoreBackup(input) {
    const file = input.files[0];
    if (!file) return;

    if (!confirm('ADVERTENCIA: Esto sobrescribirá todos los datos actuales con los del archivo de respaldo. ¿Desea continuar?')) {
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            if (data.salesLog && Array.isArray(data.salesLog)) {
                salesLog = data.salesLog;
                localStorage.setItem('pos_sales_log', JSON.stringify(salesLog));
            }

            if (data.cart && Array.isArray(data.cart)) {
                cart = data.cart;
                localStorage.setItem('pos_cart', JSON.stringify(cart));
            }

            renderCart();
            alert('Datos restaurados exitosamente.');
        } catch (err) {
            alert('Error al leer el archivo de respaldo. Asegúrese de que sea un archivo JSON válido.');
            console.error(err);
        }
    };
    reader.readAsText(file);
    input.value = ''; // Reset input
}

// Utilities
function formatCurrency(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(value);
}

function updateClock() {
    const now = new Date();
    clockElement.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Start
init();
