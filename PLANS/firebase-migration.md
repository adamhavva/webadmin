# Firebase RTDB Migration - Progress

## Completed Items
- [x] Firebase RTDB structure design
- [x] Firebase service in Flutter
- [ ] Supabase Edge Function update (in progress)
- [ ] Flutter navigation update (in progress)
- [ ] Maps page fix (pending)

## Next Steps
1. Complete Flutter auth integration
2. Test real-time location updates
3. Deploy Edge Function with Firebase SDK

## Firebase RTDB Structure

```
/users/{firebaseId}/
  - location: { lat, lng, updatedAt, accuracy }
  - status: "ONLINE" | "OFFLINE"
  - role: "BARISTA" | "CUSTOMER" | "ADMIN"
  - name: string
  - phone: string
  - lastActiveAt: timestamp

/orders/{orderId}/tracking/
  - customerLat, customerLng, customerName
  - status, baristaId, baristaName
  - baristaLat, baristaLng, updatedAt
```

## Environment Variables

```env
FIREBASE_DATABASE_URL=https://xxx.firebaseio.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```
