// Script para gerar ícones PWA a partir do logo
// Execute: node generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const input = path.join(__dirname, 'logo-brolezi.png');
const outputDir = path.join(__dirname, 'icons');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

sizes.forEach((size) => {
  sharp(input)
    .resize(size, size, { fit: 'contain', background: { r: 30, g: 58, b: 95, alpha: 1 } })
    .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
    .then(() => console.log(`✅ icon-${size}x${size}.png gerado`))
    .catch(console.error);
});
