// Script para dividir TODAS as Bíblias JSON em arquivos por livro
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\Users\\ifoxn\\Desktop\\Biblia_Trilingue_Marcos_Fernando\\_biblias';
const DEST = path.join(__dirname, 'www', 'data', 'bibles');

// Pegar TODOS os .json que não sejam _books
const allFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.json') && !f.includes('_books'));

for (const file of allFiles) {
    const bible = file.replace('.json', '');
    const jsonFile = path.join(SRC, file);
    const booksFile = path.join(SRC, `${bible}_books.json`);
    const baseForBooks = bible.replace('_TRANSLIT', '');
    const altBooksFile = path.join(SRC, `${baseForBooks}_books.json`);
    const outDir = path.join(DEST, bible);

    // Skip se já processado e tem mais de 1 arquivo
    if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 1) {
        console.log(`SKIP (já existe): ${bible}`);
        continue;
    }

    fs.mkdirSync(outDir, { recursive: true });

    if (fs.existsSync(booksFile)) {
        fs.copyFileSync(booksFile, path.join(outDir, 'books.json'));
    } else if (fs.existsSync(altBooksFile)) {
        fs.copyFileSync(altBooksFile, path.join(outDir, 'books.json'));
    }

    console.log(`Processando ${bible}...`);
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    const byBook = {};
    for (const v of data) {
        const bk = v.book;
        if (!byBook[bk]) byBook[bk] = [];
        byBook[bk].push({ chapter: v.chapter, verse: v.verse, text: v.text });
    }

    const info = { books: Object.keys(byBook).map(Number).sort((a, b) => a - b) };
    fs.writeFileSync(path.join(outDir, 'info.json'), JSON.stringify(info), 'utf8');

    for (const [bookNum, verses] of Object.entries(byBook)) {
        fs.writeFileSync(path.join(outDir, `${bookNum}.json`), JSON.stringify(verses), 'utf8');
    }
    console.log(`  -> ${bible}: ${Object.keys(byBook).length} livros`);
}

console.log('DONE!');
