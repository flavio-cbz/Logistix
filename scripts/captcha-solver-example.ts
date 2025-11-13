/**
 * Example: Captcha Solver Integration
 * 
 * This script demonstrates how to integrate the captcha solver
 * with a web scraping workflow using Puppeteer or Selenium.
 */

import puppeteer from 'puppeteer';

interface CaptchaSolveResponse {
  success: boolean;
  data: {
    attemptId: string;
    detectedPosition: number;
    confidence: number;
    status: string;
  };
}

/**
 * Solve a slider captcha on a webpage
 */
async function solveCaptchaOnPage(page: any, apiBaseUrl: string, authToken: string) {
  console.log('🔍 Detecting captcha on page...');

  // 1. Wait for captcha to appear
  await page.waitForSelector('.captcha-container', { timeout: 10000 });

  // 2. Extract captcha image URLs
  const captchaData = await page.evaluate(() => {
    const backgroundImg = document.querySelector('.captcha-background') as HTMLImageElement;
    const puzzleImg = document.querySelector('.captcha-puzzle') as HTMLImageElement;
    
    return {
      backgroundUrl: backgroundImg?.src,
      puzzleUrl: puzzleImg?.src,
    };
  });

  console.log('📸 Captcha images found:', captchaData);

  // 3. Call the captcha solver API
  console.log('🤖 Calling captcha solver API...');
  const solveResponse = await fetch(`${apiBaseUrl}/api/v1/captcha/solve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      imageUrl: captchaData.backgroundUrl,
      puzzlePieceUrl: captchaData.puzzleUrl,
      metadata: {
        source: 'example-site',
        timestamp: new Date().toISOString(),
      },
    }),
  });

  const solveResult: CaptchaSolveResponse = await solveResponse.json();

  if (!solveResult.success) {
    throw new Error('Failed to solve captcha');
  }

  console.log(`✅ Captcha solved! Position: ${solveResult.data.detectedPosition}, Confidence: ${solveResult.data.confidence}`);

  // 4. Simulate slider movement
  const sliderPosition = solveResult.data.detectedPosition;
  await moveSlider(page, sliderPosition);

  // 5. Wait for validation
  await page.waitForTimeout(2000);

  // 6. Check if captcha was solved successfully
  const success = await page.evaluate(() => {
    // Check if captcha disappeared or success message appeared
    const captcha = document.querySelector('.captcha-container');
    const successMsg = document.querySelector('.captcha-success');
    return !captcha || !!successMsg;
  });

  // 7. Report result back to the API
  console.log(`📊 Validating result: ${success ? 'SUCCESS' : 'FAILURE'}`);
  await fetch(`${apiBaseUrl}/api/v1/captcha/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      attemptId: solveResult.data.attemptId,
      success,
      actualPosition: success ? sliderPosition : undefined,
    }),
  });

  return success;
}

/**
 * Simulate human-like slider movement
 */
async function moveSlider(page: any, targetPosition: number) {
  console.log(`🎯 Moving slider to position ${targetPosition}...`);

  // Find the slider handle
  const sliderHandle = await page.$('.slider-handle');
  
  if (!sliderHandle) {
    throw new Error('Slider handle not found');
  }

  // Get initial position
  const box = await sliderHandle.boundingBox();
  
  if (!box) {
    throw new Error('Could not get slider bounding box');
  }

  // Calculate movement
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endX = startX + targetPosition;

  // Simulate human-like drag with multiple steps
  const steps = 10 + Math.floor(Math.random() * 5); // 10-15 steps
  
  await page.mouse.move(startX, startY);
  await page.mouse.down();

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    // Add slight randomness to movement
    const currentX = startX + (targetPosition * progress) + (Math.random() - 0.5) * 2;
    const currentY = startY + (Math.random() - 0.5) * 2;
    
    await page.mouse.move(currentX, currentY, { steps: 1 });
    await page.waitForTimeout(20 + Math.random() * 30); // 20-50ms delay
  }

  await page.mouse.up();
  console.log('✅ Slider moved');
}

/**
 * Main workflow example
 */
async function main() {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token';
  const TARGET_URL = process.env.TARGET_URL || 'https://example.com/login';

  console.log('🚀 Starting captcha solver example...');

  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Navigate to target page
    console.log(`🌐 Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

    // Wait for captcha to appear
    await page.waitForTimeout(2000);

    // Solve captcha
    const solved = await solveCaptchaOnPage(page, API_BASE_URL, AUTH_TOKEN);

    if (solved) {
      console.log('🎉 Captcha solved successfully!');
      
      // Continue with your workflow...
      // e.g., submit login form, scrape data, etc.
      
    } else {
      console.log('❌ Failed to solve captcha. Manual intervention may be required.');
      
      // You can implement retry logic here
      // or request manual annotation
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

/**
 * Example: Manual annotation workflow
 */
async function manualAnnotationExample(attemptId: string, apiBaseUrl: string, authToken: string) {
  console.log('📝 Manual annotation workflow...');

  // User manually identifies the correct position (e.g., through UI)
  const correctPosition = 147.5;

  // Submit annotation
  const response = await fetch(`${apiBaseUrl}/api/v1/captcha/annotate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      attemptId,
      gapPosition: correctPosition,
    }),
  });

  const result = await response.json();
  console.log('✅ Annotation saved:', result);
}

/**
 * Example: Get training statistics
 */
async function getTrainingStatsExample(apiBaseUrl: string, authToken: string) {
  console.log('📊 Fetching training statistics...');

  const response = await fetch(`${apiBaseUrl}/api/v1/captcha/training/stats`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Training Statistics:');
    console.log(`  Total Samples: ${result.data.totalSamples}`);
    console.log(`  Validated: ${result.data.validatedSamples}`);
    console.log(`  Success Rate: ${result.data.successRate.toFixed(2)}%`);
    console.log(`  Average Error: ${result.data.averageError.toFixed(2)}px`);
    console.log(`  Manual Annotations: ${result.data.manualAnnotations}`);
  }
}

// Run the main workflow
if (require.main === module) {
  main().catch(console.error);
}

export {
  solveCaptchaOnPage,
  moveSlider,
  manualAnnotationExample,
  getTrainingStatsExample,
};
