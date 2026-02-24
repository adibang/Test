// ==================== FUNGSI UTILITAS ====================

function formatRupiah(angka) {
    return 'Rp ' + angka.toLocaleString('id-ID');
}

function wrapText(text, maxWidth) {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (let word of words) {
        if (word.length > maxWidth) {
            if (currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = '';
            }
            for (let i = 0; i < word.length; i += maxWidth) {
                lines.push(word.substr(i, maxWidth));
            }
        } else {
            if (currentLine.length + word.length + 1 > maxWidth) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                if (currentLine.length === 0) {
                    currentLine = word;
                } else {
                    currentLine += ' ' + word;
                }
            }
        }
    }
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    return lines;
}
