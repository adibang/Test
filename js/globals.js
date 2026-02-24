// ==================== GLOBAL VARIABLES ====================
let db = null;
let barcodeConfig = {
    flexLength: 2,
    flexValue: '11',
    productLength: 6,
    weightLength: 5
};
let receiptConfig = {
    paperWidth: 32,
    header: "TOKO LOKABUMBU\nTAN KES \n PURB\nTelp: 082",
    footer: "Terima kasih\nSelamat berbelanja kembali\nDelivery Order Via WhatsApp 082",
    showDateTime: true,
    showTransactionNumber: true,
    showCashier: false
};
let kasirCategories = [];
let kasirItems = [];
let kasirSatuan = [];
let customers = [];
let suppliers = [];
let pendingTransactions = [];
let users = [];
let roles = [];
let bundles = [];
let currentUser = null;
let editingKasirCategoryId = null;
let editingKasirItemId = null;
let editingSatuanId = null;
let editingCustomerId = null;
let editingSupplierId = null;
let selectedCustomer = null;
let tempUnitConversions = [];
let editingConversionIndex = -1;
let currentFilteredItems = [];
let cart = [];
let productViewMode = 'list';
let lastTransactionData = null;
let printerPort = null;
let pendingPayments = [];
let pendingTotalPaid = 0;
let salesChartInstance = null;
let editingUserId = null;

// ==================== LOCALSTORAGE KEYS ====================
const CART_STORAGE_KEY = 'pos_cart';
const CUSTOMER_STORAGE_KEY = 'pos_selected_customer';
