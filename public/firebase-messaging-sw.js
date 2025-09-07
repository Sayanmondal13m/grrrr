
// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';
import { onBackgroundMessage } from 'firebase/messaging/sw';

const firebaseConfig = {
  projectId: "garena-gears",
  appId: "1:93335858315:web:9ef6be42c3b81a236ab88e",
  storageBucket: "garena-gears.firebasestorage.app",
  apiKey: "AIzaSyAowX6z6IDuosoxlfclYkgof5HXC27UEmA",
  authDomain: "garena-gears.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "93335858315"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: '/img/garena.png',
    image: payload.data.image,
    badge: '/img/garena-badge.png',
    data: {
        url: payload.data.link || '/',
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus().then(c => c.navigate(urlToOpen));
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
