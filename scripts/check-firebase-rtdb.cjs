/**
 * Script to check Firebase Realtime Database structure for orders
 */
const admin = require('firebase-admin');

const path = require('path');
const serviceAccount = require(path.join(__dirname, '../credentials/firebase/serviceAccountKey.json'));

// Initialize Firebase Admin with RTDB URL
const firebaseConfig = {
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://ascend-v2-4a67d-default-rtdb.asia-southeast1.firebasedatabase.app'
};

admin.initializeApp(firebaseConfig);
const db = admin.database();

async function checkFirebaseRTDB() {
  console.log('🔍 Checking Firebase Realtime Database...\n');
  console.log('Project:', serviceAccount.project_id);
  console.log('RTDB URL:', firebaseConfig.databaseURL);
  console.log('---\n');

  try {
    // 1. Check root structure
    console.log('📁 Root structure:');
    const rootSnapshot = await db.ref().once('value');
    const rootData = rootSnapshot.val();

    if (rootData) {
      console.log('   Root keys:', Object.keys(rootData));
    } else {
      console.log('   Root is empty');
    }
    console.log('');

    // 2. Check /orders structure
    console.log('📋 Checking /orders:');
    const ordersRef = db.ref('/orders');
    const ordersSnapshot = await ordersRef.once('value');
    const ordersData = ordersSnapshot.val();

    if (ordersData) {
      const orderIds = Object.keys(ordersData);
      console.log(`   Found ${orderIds.length} orders`);

      // Pick first order for detailed inspection
      if (orderIds.length > 0) {
        const firstOrderId = orderIds[0];
        const firstOrder = ordersData[firstOrderId];

        console.log(`\n   📦 First order: ${firstOrderId}`);
        console.log('   Order keys:', Object.keys(firstOrder));

        // Check for locations
        if (firstOrder.locations) {
          console.log('\n   ✅ /orders/{orderId}/locations EXISTS');
          console.log('   Location keys:', Object.keys(firstOrder.locations));
        } else {
          console.log('\n   ❌ /orders/{orderId}/locations NOT FOUND');
        }

        // Check for other common structures
        if (firstOrder.tracking) {
          console.log('   ✅ /orders/{orderId}/tracking EXISTS');
        }
        if (firstOrder.status) {
          console.log('   Status:', firstOrder.status);
        }
      }

      // Check ALL orders for locations structure
      console.log('\n   📊 Checking locations in ALL orders:');
      let ordersWithLocations = 0;
      for (const orderId of orderIds) {
        if (ordersData[orderId].locations) {
          ordersWithLocations++;
        }
      }
      console.log(`   Orders with locations: ${ordersWithLocations}/${orderIds.length}`);

    } else {
      console.log('   No orders found in /orders');
    }

    // 3. Check /users structure (for barista locations)
    console.log('\n👥 Checking /users:');
    const usersRef = db.ref('/users');
    const usersSnapshot = await usersRef.once('value');
    const usersData = usersSnapshot.val();

    if (usersData) {
      const userIds = Object.keys(usersData);
      console.log(`   Found ${userIds.length} users`);

      // Check structure of first user
      if (userIds.length > 0) {
        const firstUserId = userIds[0];
        const firstUser = usersData[firstUserId];
        console.log(`\n   First user structure:`);
        console.log('   User keys:', Object.keys(firstUser));

        if (firstUser.location) {
          console.log('   ✅ /users/{userId}/location EXISTS');
          console.log('   Location data:', JSON.stringify(firstUser.location));
        } else {
          console.log('   ❌ /users/{userId}/location NOT FOUND');
        }
      }

      // Count users with locations
      let usersWithLocations = 0;
      for (const userId of userIds) {
        if (usersData[userId].location) {
          usersWithLocations++;
        }
      }
      console.log(`\n   Users with location: ${usersWithLocations}/${userIds.length}`);

    } else {
      console.log('   No users found in /users');
    }

    // 4. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Database: ${firebaseConfig.databaseURL}`);
    console.log(`Orders count: ${ordersData ? Object.keys(ordersData).length : 0}`);
    console.log(`Users count: ${usersData ? Object.keys(usersData).length : 0}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errorInfo) {
      console.error('Firebase Error Code:', error.errorInfo.code);
      console.error('Firebase Error Message:', error.errorInfo.message);
    }
  } finally {
    process.exit(0);
  }
}

checkFirebaseRTDB();
