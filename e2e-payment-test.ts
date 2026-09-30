import { chromium } from '@playwright/test';

async function testPaymentFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  page.on('dialog', async dialog => {
    console.log(`   Dialog: "${dialog.message()}"`);
    await dialog.dismiss();
  });

  try {
    console.log('=== ASCEND Payment Flow Test ===\n');

    // Navigate to simulation page
    console.log('1. Navigating to simulation page...');
    await page.goto('http://localhost:3000/orders/simulation');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('   Page loaded');

    // Verify main page
    console.log('\n2. Verifying main page...');
    const pageText = await page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script, style').forEach(s => s.remove());
      return clone.innerText || clone.textContent || '';
    });

    const hasProduct = pageText.includes('Kopi 1') || pageText.includes('Rp 50,000');
    const cashOnMain = pageText.includes('Bayar di Tempat') || pageText.includes('CASH');
    console.log(`   - Product visible: ${hasProduct ? '✓' : '✗'}`);
    console.log(`   - CASH on main: ${cashOnMain ? '✗ FOUND!' : '✓ Not found'}`);

    // Checkout flow
    console.log('\n3. Starting checkout flow...');

    await page.locator('button').filter({ hasText: /Rp 50,000/ }).first().click();
    await page.waitForTimeout(1500);

    await page.locator('button').filter({ hasText: /^Tambah/ }).first().click();
    await page.waitForTimeout(1000);

    await page.locator('button').filter({ hasText: /item/ }).first().click();
    await page.waitForTimeout(1500);

    await page.locator('button').filter({ hasText: /Lanjut ke Pembayaran/ }).click();
    await page.waitForTimeout(1500);

    // Get modal
    const modal = page.locator('[class*="rounded-t-3xl"]').first();

    // Fill customer info
    const modalInputs = modal.locator('input');
    await modalInputs.first().fill('Test Customer');
    await modalInputs.nth(1).fill('081234567890');

    // Navigate through steps
    console.log('4. Navigating through checkout...');
    await modal.locator('button').filter({ hasText: /^Lanjut$/ }).click();
    await page.waitForTimeout(1000);
    await modal.locator('button').filter({ hasText: /^Lanjut$/ }).click();
    await page.waitForTimeout(1500);

    // Get modal text content
    const modalText = await modal.evaluate(el => el.textContent || '');

    console.log('\n5. Checking payment methods in checkout modal...');
    console.log('\n   Modal content preview:');
    console.log(`   "${modalText.substring(0, 500)}..."`);

    // Check for payment methods (updated to match actual code)
    const hasQris = modalText.includes('QRIS');
    const hasTransferBank = modalText.includes('Transfer Bank');
    const hasKartuKredit = modalText.includes('Kartu Kredit') || modalText.includes('Kartu Kredit/Debit');
    const hasCash = modalText.includes('Bayar di Tempat') || modalText.includes('Bayar di Tempat');
    const hasCARDText = modalText.includes('CASH');
    const hasPaymentSection = modalText.includes('Metode Pembayaran');

    console.log('\n=== PAYMENT METHODS CHECK ===');
    console.log(`   - QRIS: ${hasQris ? '✓ Found' : '✗ Not found'}`);
    console.log(`   - Transfer Bank (VA): ${hasTransferBank ? '✓ Found' : '✗ Not found'}`);
    console.log(`   - Kartu Kredit/Debit: ${hasKartuKredit ? '✓ Found' : '✗ Not found'}`);
    console.log(`   - CASH (Bayar di Tempat): ${hasCash || hasCARDText ? '✗ FOUND!' : '✓ Not found'}`);
    console.log(`   - Payment section header: ${hasPaymentSection ? '✓ Found' : '✗ Not found'}`);

    // Final results
    console.log('\n=== TEST RESULTS ===');
    let allPassed = true;

    // CASH should NOT be present
    if (hasCash || hasCARDText) {
      console.error('✗ FAIL: CASH option found!');
      allPassed = false;
    } else {
      console.log('✓ PASS: CASH option not found (correct - removed)');
    }

    // QRIS should be present
    if (hasQris) {
      console.log('✓ PASS: QRIS option found');
    } else {
      console.error('✗ FAIL: QRIS option not found');
      allPassed = false;
    }

    // Transfer Bank (Virtual Account) should be present
    if (hasTransferBank) {
      console.log('✓ PASS: Transfer Bank (Virtual Account) option found');
    } else {
      console.error('✗ FAIL: Transfer Bank option not found');
      allPassed = false;
    }

    // Kartu Kredit/Debit should be present
    if (hasKartuKredit) {
      console.log('✓ PASS: Kartu Kredit/Debit option found');
    } else {
      console.error('✗ FAIL: Kartu Kredit/Debit option not found');
      allPassed = false;
    }

    // Payment section header should be present
    if (hasPaymentSection) {
      console.log('✓ PASS: Metode Pembayaran section found');
    } else {
      console.error('✗ FAIL: Metode Pembayaran section not found');
      allPassed = false;
    }

    console.log(`\n=== FINAL: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'} ===`);
    return allPassed;

  } catch (error) {
    console.error('\nTest failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testPaymentFlow()
  .then((passed) => process.exit(passed ? 0 : 1))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
