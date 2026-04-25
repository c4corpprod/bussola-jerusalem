/**
 * Script de Importação Segura de Bíblias Externas
 * Converte formato monolítico (_biblias/*.json) para formato modular da Bússola
 * Sem sobrescrever traduções existentes
 */

const fs = require('fs');
const path = require('path');

// Caminhos
const EXTERNAL_DIR = 'C:\\Users\\ifoxn\\Desktop\\Biblia_Trilingue_Marcos_Fernando\\_biblias';
const BIBLE_DATA_DIR = path.join(__dirname, 'www/data/bibles');
const LOG_FILE = path.join(__dirname, 'import-log.txt');

// Estado do log
let logOutput = `[${new Date().toISOString()}] Iniciando importação de Bíblias Externas\n`;

function log(msg) {
  console.log(msg);
  logOutput += msg + '\n';
}

function getTranslationCode(filename) {
  // ACF11.json -> ACF11
  return filename.replace('.json', '').toUpperCase();
}

function isValidBibleFile(filename) {
  // Ignora _books, _meta, etc.
  if (filename.includes('_')) return false;
  if (!filename.endsWith('.json')) return false;
  return true;
}

function parseExternalBible(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    // Valida estrutura: esperamos array de versículos com chapter, verse, text
    if (!data[0].chapter || !data[0].verse || data[0].text === undefined) {
      return null;
    }
    
    return data;
  } catch (err) {
    log(`  ⚠️  Erro ao ler ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

function groupByBook(verses) {
  // Agrupa versículos por livro (1=Gênesis, 2=Êxodo, etc.)
  const books = {};
  
  verses.forEach(v => {
    const bookNum = v.chapter; // Assumindo que 'chapter' é o número do livro
    
    if (!books[bookNum]) {
      books[bookNum] = [];
    }
    books[bookNum].push(v);
  });
  
  return books;
}

function convertToModularFormat(verses) {
  // Converte para formato modular: {bookNum: [...verses]}
  // Se não tiver estrutura chapter/book clara, trata como um livro único
  
  const books = {};
  
  verses.forEach(v => {
    // Tenta inferir livro a partir de 'book' ou trata como capítulo simples
    const bookNum = v.book || 1;
    
    if (!books[bookNum]) {
      books[bookNum] = [];
    }
    
    books[bookNum].push({
      chapter: v.chapter,
      verse: v.verse,
      text: v.text
    });
  });
  
  return books;
}

function importTranslation(filename) {
  const code = getTranslationCode(filename);
  const translationDir = path.join(BIBLE_DATA_DIR, code);
  
  // Verifica se já existe (segurança)
  if (fs.existsSync(translationDir)) {
    log(`  ⏭️  ${code}: Já existe, pulando...`);
    return false;
  }
  
  // Lê arquivo externo
  const externalPath = path.join(EXTERNAL_DIR, filename);
  const verses = parseExternalBible(externalPath);
  
  if (!verses) {
    log(`  ❌ ${code}: Formato inválido, pulando...`);
    return false;
  }
  
  // Converte para modular
  const books = convertToModularFormat(verses);
  
  // Cria pasta
  fs.mkdirSync(translationDir, { recursive: true });
  
  // Salva cada livro
  let bookCount = 0;
  Object.keys(books).forEach(bookNum => {
    const bookFile = path.join(translationDir, `${bookNum}.json`);
    fs.writeFileSync(bookFile, JSON.stringify(books[bookNum], null, 0));
    bookCount++;
  });
  
  // Salva metadados de versão
  const metaFile = path.join(translationDir, '_meta.json');
  const metadata = {
    version: `v${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}-imported`,
    language: code,
    source: 'external-import',
    importedAt: new Date().toISOString(),
    bookCount: bookCount
  };
  fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));
  
  log(`  ✅ ${code}: Importado com ${bookCount} livros`);
  return true;
}

function main() {
  try {
    // Verifica pasta externa
    if (!fs.existsSync(EXTERNAL_DIR)) {
      log(`❌ Pasta externa não encontrada: ${EXTERNAL_DIR}`);
      return;
    }
    
    log(`📂 Pasta externa: ${EXTERNAL_DIR}`);
    log(`📂 Pasta destino: ${BIBLE_DATA_DIR}\n`);
    
    // Lista arquivos
    const files = fs.readdirSync(EXTERNAL_DIR).filter(isValidBibleFile);
    
    if (files.length === 0) {
      log('⚠️  Nenhum arquivo de Bíblia válido encontrado.');
      return;
    }
    
    log(`Encontrados ${files.length} arquivo(s) de Bíblia:\n`);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    files.forEach(filename => {
      if (importTranslation(filename)) {
        importedCount++;
      } else {
        skippedCount++;
      }
    });
    
    log(`\n📊 Resumo:`);
    log(`  ✅ Importados: ${importedCount}`);
    log(`  ⏭️  Pulados: ${skippedCount}`);
    log(`  📁 Total no arsenal: ${fs.readdirSync(BIBLE_DATA_DIR).length}`);
    
  } catch (err) {
    log(`❌ Erro geral: ${err.message}`);
  } finally {
    // Salva log
    fs.writeFileSync(LOG_FILE, logOutput);
    log(`\n📋 Log salvo em: ${LOG_FILE}`);
  }
}

// Executa
main();
