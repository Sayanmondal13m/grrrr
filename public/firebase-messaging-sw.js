
// This file needs to be in the public directory
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAowX6z6IDuosoxlfclYkgof5HXC27UEmA",
  authDomain: "garena-gears.firebaseapp.com",
  projectId: "garena-gears",
  storageBucket: "garena-gears.firebasestorage.app",
  messagingSenderId: "93335858315",
  appId: "1:93335858315:web:9ef6be42c3b81a236ab88e"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This is the magic part: it handles messages when the app is in the background.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/img/garena.png', // A default icon
    image: payload.notification.image,
  };
  
  // This self.clients.matchAll part is what prevents duplicate notifications.
  // It checks if the user already has the site open and focused.
  self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(windowClients) {
    let isAppInForeground = false;
    for (var i = 0; i < windowClients.length; i++) {
      // visibilityState is 'visible' or 'hidden'
      if (windowClients[i].visibilityState === 'visible') {
        isAppInForeground = true;
        break;
      }
    }

    // Only show the notification if the app is NOT in the foreground.
    if (!isAppInForeground) {
       self.registration.showNotification(notificationTitle, notificationOptions);
    }
  });

});
