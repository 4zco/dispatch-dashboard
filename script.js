/* script.js 
 * - Contains client-side logic for dispatching site.
 * - Simulates data fetching, order assignment, and marking deliveries.
 * - Uses modern ES6+ syntax and DOM manipulation to update the UI.
 * (In a real deployment, these actions would interact with a backend via API calls.)
 */

// === Sample Data Setup (mock backend data) ===

// Driver list (would normally come from a backend or be rendered server-side)
const drivers = [
  { id: 1, name: 'Alice', number: 'D1', cell: '123-456-7890' },
  { id: 2, name: 'Bob', number: 'D2', cell: '987-654-3210' },
  { id: 3, name: 'Charlie', number: 'D3', cell: '555-123-4567' }
];

// Orders data (normally fetched from an API or database). 
// Each order includes an 'urgent' flag and a 'status' field.
const orders = [
  {
    id: 101,
    invoice: 'INV001',
    garage: 'Shop A',
    area: 'North',
    total: 150.0,
    items: 4,
    warehouses: ['WH1'],
    urgent: true,
    status: 'Assigned',
    driverId: 1,
    deliveredTime: null
  },
  {
    id: 102,
    invoice: 'INV002',
    garage: 'Shop B',
    area: 'South',
    total: 75.5,
    items: 2,
    warehouses: ['WH3', 'WH5'],
    urgent: true,
    status: 'Unassigned',
    driverId: null,
    deliveredTime: null
  },
  {
    id: 103,
    invoice: 'INV003',
    garage: 'Shop C',
    area: 'East',
    total: 200.0,
    items: 5,
    warehouses: ['WH2'],
    urgent: false,
    status: 'Assigned',
    driverId: 2,
    deliveredTime: null
  },
  {
    id: 104,
    invoice: 'INV004',
    garage: 'Shop D',
    area: 'West',
    total: 300.0,
    items: 1,
    warehouses: ['WH4'],
    urgent: false,
    status: 'Delivered',
    driverId: 1,
    // Delivered 2 hours ago from current time:
    deliveredTime: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: 105,
    invoice: 'INV005',
    garage: 'Shop E',
    area: 'Central',
    total: 180.0,
    items: 3,
    warehouses: ['WH1', 'WH3'],
    urgent: false,
    status: 'Unassigned',
    driverId: null,
    deliveredTime: null
  }
];

// Variables to generate new orders (for simulation of "fetch new orders")
let nextOrderId = 106;
let nextInvoiceNum = 6; // Next invoice sequence number (for 'INV006', etc)

// Utility: get driver name by ID
const getDriverName = id => {
  const driver = drivers.find(d => d.id === id);
  return driver ? driver.name : 'Unknown';
};

// Utility: format a number as a currency string (USD in this example)
const formatAmount = amt => '$' + amt.toFixed(2);

// Utility: return HTML for priority label (urgent or normal)
const priorityLabel = order => {
  return order.urgent 
    ? '<span class="urgent-label">Urgent</span>' 
    : '<span class="normal-label">Normal</span>';
};

// Utility: show a temporary notification message at the top of the page
function showNotification(message) {
  const note = document.getElementById('notification');
  note.textContent = message;
  note.style.display = 'block';
  // Hide after 3 seconds
  setTimeout(() => {
    note.style.display = 'none';
  }, 3000);
}

// Render functions: update each section of the orders tables
function renderOrders() {
  // Unassigned Orders
  const unassignedTBody = document.querySelector('#unassigned-table tbody');
  const unassignedOrders = orders.filter(o => o.status === 'Unassigned');
  // Sort unassigned by urgency (urgent first), then by invoice number
  unassignedOrders.sort((a, b) => (b.urgent - a.urgent) || a.invoice.localeCompare(b.invoice));
  unassignedTBody.innerHTML = unassignedOrders.map(order => `
      <tr ${order.urgent ? 'class="urgent-row"' : ''}>
        <td>${priorityLabel(order)}</td>
        <td>${order.invoice}</td>
        <td>${order.garage}</td>
        <td>${order.area}</td>
        <td>${formatAmount(order.total)}</td>
        <td>${order.items}</td>
        <td>${order.warehouses.join(', ')}</td>
        <td>
          <select id="driver-select-${order.id}">
            ${drivers.map(driver => `<option value="${driver.id}">${driver.name}</option>`).join('')}
          </select>
          <button class="assign-button" data-order-id="${order.id}">Assign</button>
        </td>
      </tr>`
  ).join('');
  if (unassignedOrders.length === 0) {
    unassignedTBody.innerHTML = '<tr><td colspan="8">No unassigned orders.</td></tr>';
  }
  document.getElementById('unassigned-count').textContent = unassignedOrders.length;

  // Assigned Orders
  const assignedTBody = document.querySelector('#assigned-table tbody');
  const assignedOrders = orders.filter(o => o.status === 'Assigned');
  // Sort assigned by urgency first
  assignedOrders.sort((a, b) => (b.urgent - a.urgent) || a.invoice.localeCompare(b.invoice));
  assignedTBody.innerHTML = assignedOrders.map(order => `
      <tr ${order.urgent ? 'class="urgent-row"' : ''}>
        <td>${priorityLabel(order)}</td>
        <td>${order.invoice}</td>
        <td>${order.garage}</td>
        <td>${order.area}</td>
        <td>${formatAmount(order.total)}</td>
        <td>${order.items}</td>
        <td>${order.warehouses.join(', ')}</td>
        <td>${getDriverName(order.driverId)}</td>
        <td><button class="deliver-button" data-order-id="${order.id}">Mark Delivered</button></td>
      </tr>`
  ).join('');
  if (assignedOrders.length === 0) {
    assignedTBody.innerHTML = '<tr><td colspan="9">No orders in progress.</td></tr>';
  }
  document.getElementById('assigned-count').textContent = assignedOrders.length;

  // Delivered Orders
  const deliveredTBody = document.querySelector('#delivered-table tbody');
  const deliveredOrders = orders.filter(o => o.status === 'Delivered');
  // Sort delivered by delivery time (newest first)
  deliveredOrders.sort((a, b) => {
    if (a.deliveredTime && b.deliveredTime) {
      return b.deliveredTime - a.deliveredTime;
    }
    return 0;
  });
  deliveredTBody.innerHTML = deliveredOrders.map(order => {
    const deliveredTimeStr = order.deliveredTime ? order.deliveredTime.toLocaleString() : '';
    return `
      <tr ${order.urgent ? 'class="urgent-row"' : ''}>
        <td>${priorityLabel(order)}</td>
        <td>${order.invoice}</td>
        <td>${order.garage}</td>
        <td>${order.area}</td>
        <td>${formatAmount(order.total)}</td>
        <td>${order.items}</td>
        <td>${order.warehouses.join(', ')}</td>
        <td>${getDriverName(order.driverId)}</td>
        <td>${deliveredTimeStr}</td>
      </tr>`;
  }).join('');
  if (deliveredOrders.length === 0) {
    deliveredTBody.innerHTML = '<tr><td colspan="9">No delivered orders yet.</td></tr>';
  }
  document.getElementById('delivered-count').textContent = deliveredOrders.length;

  // Attach event handlers for the new buttons in the rendered table
  attachEventHandlers();
}

// Attach event listeners to dynamically generated buttons
function attachEventHandlers() {
  // "Assign" buttons (for unassigned orders)
  document.querySelectorAll('.assign-button').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault(); // prevent form submission (if any)
      const orderId = Number(button.getAttribute('data-order-id'));
      const selectEl = document.getElementById('driver-select-' + orderId);
      const driverId = Number(selectEl.value);
      assignOrder(orderId, driverId);
    });
  });
  // "Mark Delivered" buttons (for assigned orders)
  document.querySelectorAll('.deliver-button').forEach(button => {
    button.addEventListener('click', () => {
      const orderId = Number(button.getAttribute('data-order-id'));
      markDelivered(orderId);
    });
  });
}

// Simulate fetching new orders from server
function fetchNewOrders() {
  const fetchBtn = document.getElementById('fetch-button');
  // Disable button and show loading state
  fetchBtn.disabled = true;
  fetchBtn.textContent = 'Fetching...';

  setTimeout(() => {
    // Simulate an API response with one new order
    const newId = nextOrderId++;
    const invNumber = String(nextInvoiceNum++).padStart(3, '0');
    const newInvoice = 'INV' + invNumber;
    // Generate random sample order data
    const sampleGarages = ['Shop X', 'Shop Y', 'Shop Z'];
    const sampleAreas = ['North', 'East', 'South', 'West', 'Central'];
    const sampleWarehouses = ['WH1', 'WH2', 'WH3', 'WH4', 'WH5'];
    const randomGarage = sampleGarages[Math.floor(Math.random() * sampleGarages.length)];
    const randomArea = sampleAreas[Math.floor(Math.random() * sampleAreas.length)];
    const randomAmount = parseFloat((Math.random() * 300 + 50).toFixed(2)); // amount between $50 and $350
    const randomItems = Math.floor(Math.random() * 5) + 1; // 1 to 5 items
    // Randomly select 1-2 warehouses
    const warehouseCount = Math.floor(Math.random() * 2) + 1;
    const whSet = new Set();
    while (whSet.size < warehouseCount) {
      const wh = sampleWarehouses[Math.floor(Math.random() * sampleWarehouses.length)];
      whSet.add(wh);
    }
    const newOrder = {
      id: newId,
      invoice: newInvoice,
      garage: randomGarage,
      area: randomArea,
      total: randomAmount,
      items: randomItems,
      warehouses: Array.from(whSet),
      urgent: Math.random() < 0.3, // ~30% chance to be urgent
      status: 'Unassigned',
      driverId: null,
      deliveredTime: null
    };
    orders.push(newOrder);
    // Re-render tables to show the new order
    renderOrders();
    // Restore button state
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Fetch New Orders';
    // Notify user of the new order
    showNotification(`Fetched 1 new order (Invoice ${newInvoice}).`);
  }, 1000);
}

// Assign an order to a driver
function assignOrder(orderId, driverId) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.driverId = driverId;
    order.status = 'Assigned';
    // In a real app, send an update to server here
  }
  renderOrders();
  // Optionally notify user (visible UI update already provides feedback)
  // showNotification(`Order ${order.invoice} assigned to ${getDriverName(driverId)}.`);
}

// Mark an order as delivered
function markDelivered(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = 'Delivered';
    order.deliveredTime = new Date();
    // In real app, update server-side status as well
  }
  renderOrders();
  // Notify the user of completion
  showNotification(`Order ${order ? order.invoice : ''} marked as delivered.`);
}

// Initialize the page once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Hook up the fetch button
  document.getElementById('fetch-button').addEventListener('click', e => {
    e.preventDefault();
    fetchNewOrders();
  });
  // Initial render of all tables
  renderOrders();
});

