// printer.js
// ==================== FUNGSI PRINT VIA WEB SERIAL ====================

async function printReceipt() {
    if (!printerPort) {
        showNotification('Printer belum terhubung', 'error');
        return;
    }

    let dataToPrint = lastTransactionData;
    if (!dataToPrint) {
        if (cart.length === 0) {
            showNotification('Tidak ada data untuk dicetak', 'warning');
            return;
        }
        const total = cart.reduce((s, c) => s + c.subtotal, 0);
        dataToPrint = {
            items: cart.map(c => ({
                name: c.item.name,
                qty: c.qty,
                unit: c.unitConversion ? (kasirSatuan.find(s => s.id == c.unitConversion.unit)?.name || '?') : (c.weightGram ? 'kg' : 'pcs'),
                price: c.pricePerUnit,
                subtotal: c.subtotal
            })),
            total: total,
            paidAmount: total,
            change: 0,
            date: new Date().toLocaleString('id-ID'),
            transactionNumber: 'DRAFT'
        };
    }

    const { paperWidth, header, footer, showDateTime, showTransactionNumber, showCashier } = receiptConfig;

    try {
        const writer = printerPort.writable.getWriter();
        const encoder = new TextEncoder();
        let receipt = '\n';

        const headerLines = header.split('\n');
        headerLines.forEach(line => {
            const wrapped = wrapText(line, paperWidth);
            wrapped.forEach(l => {
                receipt += l.padEnd(paperWidth) + '\n';
            });
        });
        receipt += '='.repeat(paperWidth) + '\n';

        if (showDateTime) {
            receipt += `Tanggal: ${new Date().toLocaleString('id-ID')}\n`;
        }
        if (showTransactionNumber && dataToPrint.transactionNumber) {
            receipt += `No.    : ${dataToPrint.transactionNumber}\n`;
        }
        if (showCashier) {
            receipt += `Kasir  : ${currentUser ? currentUser.name : 'Admin'}\n`;
        }
        receipt += '-'.repeat(paperWidth) + '\n';

        dataToPrint.items.forEach(item => {
            const nameWrapped = wrapText(item.name, paperWidth - 5);
            nameWrapped.forEach((line, idx) => {
                if (idx === 0) {
                    receipt += line + '\n';
                } else {
                    receipt += '     ' + line + '\n';
                }
            });
            const qtyStr = `${item.qty} ${item.unit} x ${formatRupiah(item.price)}`;
            const subtotalStr = formatRupiah(item.subtotal);
            const line = qtyStr + ' '.repeat(Math.max(1, paperWidth - qtyStr.length - subtotalStr.length)) + subtotalStr;
            receipt += line + '\n';
        });

        receipt += '-'.repeat(paperWidth) + '\n';

        const totalLabel = 'Total';
        const totalVal = formatRupiah(dataToPrint.total);
        receipt += totalLabel + ' '.repeat(paperWidth - totalLabel.length - totalVal.length) + totalVal + '\n';

        const paidLabel = 'Bayar';
        const paidVal = formatRupiah(dataToPrint.paidAmount);
        receipt += paidLabel + ' '.repeat(paperWidth - paidLabel.length - paidVal.length) + paidVal + '\n';

        const changeLabel = 'Kembali';
        const changeVal = formatRupiah(dataToPrint.change);
        receipt += changeLabel + ' '.repeat(paperWidth - changeLabel.length - changeVal.length) + changeVal + '\n';

        receipt += '='.repeat(paperWidth) + '\n';

        const footerLines = footer.split('\n');
        footerLines.forEach(line => {
            const wrapped = wrapText(line, paperWidth);
            wrapped.forEach(l => {
                receipt += l.padEnd(paperWidth) + '\n';
            });
        });

        receipt += '\n\n\n';

        await writer.write(encoder.encode(receipt));
        writer.releaseLock();
        showNotification('Struk berhasil dicetak', 'success');
    } catch (error) {
        console.error('Error printing:', error);
        showNotification('Gagal mencetak: ' + error.message, 'error');
    }
}

async function togglePrinter() {
    if (printerPort) {
        try {
            await printerPort.close();
            printerPort = null;
            updatePrinterStatus(false);
            showNotification('Printer diputuskan', 'info');
        } catch (error) {
            console.error('Error disconnecting printer:', error);
            showNotification('Gagal memutuskan printer: ' + error.message, 'error');
        }
    } else {
        if (!navigator.serial) {
            showNotification('Web Serial API tidak didukung di browser ini. Gunakan Chrome/Edge.', 'error');
            return;
        }
        try {
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            printerPort = port;
            updatePrinterStatus(true);
            showNotification('Printer terhubung', 'success');
        } catch (error) {
            console.error('Error connecting printer:', error);
            showNotification('Gagal connect printer: ' + error.message, 'error');
        }
    }
}

function updatePrinterStatus(connected) {
    const statusLight = document.getElementById('printer-status-light');
    const statusText = document.getElementById('printer-status-text');
    const connectBtnText = document.getElementById('connect-btn-text');
    if (connected) {
        statusLight.classList.add('connected');
        statusText.textContent = '';
        connectBtnText.textContent = 'Disconnect';
    } else {
        statusLight.classList.remove('connected');
        statusText.textContent = '';
        connectBtnText.textContent = 'Connect';
    }
}

async function autoReconnectPrinter() {
    if (!navigator.serial) return;
    try {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
            const port = ports[0];
            await port.open({ baudRate: 9600 });
            printerPort = port;
            updatePrinterStatus(true);
            console.log('Printer auto-connected');
        }
    } catch (error) {
        console.warn('Auto reconnect printer failed:', error);
    }
}
