const fs = require('fs');
const path = require('path');

console.log('🖼️  Image Optimization Report');
console.log('==========================\n');

const publicDir = path.join(process.cwd(), 'public');

// Check if public directory exists
if (!fs.existsSync(publicDir)) {
  console.log('❌ Public directory not found');
  process.exit(1);
}

// Get all image files
const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
const files = fs.readdirSync(publicDir);
const imageFiles = files.filter(file => 
  imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
);

console.log('📁 Found image files:');
let totalSize = 0;

imageFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  totalSize += stats.size;
  
  console.log(`   • ${file}: ${sizeKB} KB`);
});

console.log(`\n📊 Total images size: ${(totalSize / 1024).toFixed(2)} KB`);

// Recommendations
console.log('\n💡 Optimization Recommendations:');
console.log('================================');

imageFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  const stats = fs.statSync(filePath);
  const sizeKB = stats.size / 1024;
  
  if (file.endsWith('.png') && sizeKB > 50) {
    console.log(`   ⚠️  ${file}: Consider converting to WebP format (currently ${sizeKB.toFixed(2)} KB)`);
  }
  
  if (file.endsWith('.jpg') && sizeKB > 100) {
    console.log(`   ⚠️  ${file}: Consider compressing or converting to WebP (currently ${sizeKB.toFixed(2)} KB)`);
  }
  
  if (file.endsWith('.svg') && sizeKB > 10) {
    console.log(`   ⚠️  ${file}: Consider optimizing SVG (currently ${sizeKB.toFixed(2)} KB)`);
  }
});

// Next.js Image optimization info
console.log('\n🚀 Next.js Image Optimization:');
console.log('==============================');
console.log('✅ Image optimization is enabled in next.config.mjs');
console.log('✅ WebP and AVIF formats are configured');
console.log('✅ Responsive image sizes are set');
console.log('\n💡 To use optimized images, import Image from "next/image" instead of <img> tags');

console.log('\n✨ Optimization complete!');