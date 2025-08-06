import puppeteer from 'puppeteer';
const fetch = require('node-fetch');

describe('Market Analysis Page', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();

    // Create a new user and get the session cookie
    const username = `testuser-${Date.now()}`;
    const password = 'password123';
    const signupResponse = await fetch('http://localhost:3000/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${username}&password=${password}`,
    });

    const cookies = signupResponse.headers.get('set-cookie');
    if (!cookies) {
      throw new Error('Session cookie not found in signup response');
    }
    const sessionIdCookie = cookies.split(';').find(c => c.trim().startsWith('session_id='));
    if (!sessionIdCookie) {
      throw new Error('session_id cookie not found in set-cookie header');
    }
    const [cookieName, cookieValue] = sessionIdCookie.split('=');

    await page.setCookie({
      name: cookieName,
      value: cookieValue,
      domain: 'localhost',
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should load the market analysis page successfully', async () => {
    await page.goto('http://localhost:3000/analyse-marche');
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Analyse de Marché');
  }, 15000);
});