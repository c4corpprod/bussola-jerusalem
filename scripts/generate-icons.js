/**
 * Script para gerar ícones PNG a partir do icon.svg
 * Execução: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG_PATH = path.join(__dirname, '..', 'www', 'assets', 'img', 'icon.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'www', 'assets', 'img');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
    const svgBuffer = fs.readFileSync(SVG_PATH);

    for (const size of SIZES) {
        const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        console.log(`✅ icon-${size}.png gerado`);
    }

    // Ícone adaptativo Android (com padding para foreground)
    const foregroundSize = 432; // 108dp * 4
    const foreground = path.join(OUTPUT_DIR, 'ic_launcher_foreground.png');
    await sharp(svgBuffer)
        .resize(Math.round(foregroundSize * 0.7), Math.round(foregroundSize * 0.7))
        .extend({
            top: Math.round(foregroundSize * 0.15),
            bottom: Math.round(foregroundSize * 0.15),
            left: Math.round(foregroundSize * 0.15),
            right: Math.round(foregroundSize * 0.15),
            background: { r: 10, g: 6, b: 0, alpha: 0 }
        })
        .resize(foregroundSize, foregroundSize)
        .png()
        .toFile(foreground);
    console.log('✅ ic_launcher_foreground.png gerado');

    console.log('\n🎉 Todos os ícones gerados com sucesso!');
}

generate().catch(err => {
    console.error('❌ Erro ao gerar ícones:', err);
    process.exit(1);
});
