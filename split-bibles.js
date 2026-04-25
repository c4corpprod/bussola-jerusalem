// Script para dividir Bíblias JSON em arquivos por livro
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\Users\\ifoxn\\Desktop\\Biblia_Trilingue_Marcos_Fernando\\_biblias';
const DEST = path.join(__dirname, 'www', 'data', 'bibles');

const BIBLES = ['ARA', 'WLC', 'WLC_TRANSLIT', 'KJV', 'SBLGNT', 'SBLGNT_TRANSLIT'];

for (const bible of BIBLES) {
    const jsonFile = path.join(SRC, `${bible}.json`);
    const booksFile = path.join(SRC, `${bible}_books.json`);
    const outDir = path.join(DEST, bible);

    if (!fs.existsSync(jsonFile)) { console.log(`SKIP: ${bible}`); continue; }

    fs.mkdirSync(outDir, { recursive: true });

    // Copiar books.json
    if (fs.existsSync(booksFile)) {
        fs.copyFileSync(booksFile, path.join(outDir, 'books.json'));
    }

    console.log(`Processando ${bible}...`);
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    // Agrupar por livro
    const byBook = {};
    for (const v of data) {
        if (!byBook[v.book]) byBook[v.book] = [];
        byBook[v.book].push({ chapter: v.chapter, verse: v.verse, text: v.text });
    }

    for (const [bookNum, verses] of Object.entries(byBook)) {
        fs.writeFileSync(path.join(outDir, `${bookNum}.json`), JSON.stringify(verses), 'utf8');
    }
    console.log(`  -> ${bible}: ${Object.keys(byBook).length} livros`);
}

// Copiar também ARA_books.json como referência geral
fs.copyFileSync(path.join(SRC, 'ARA_books.json'), path.join(DEST, 'books_pt.json'));
if (fs.existsSync(path.join(SRC, 'KJV_books.json')))
    fs.copyFileSync(path.join(SRC, 'KJV_books.json'), path.join(DEST, 'books_en.json'));

console.log('DONE!');
