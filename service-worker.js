const CACHE_NAME = "hijli-jubo-shongho-v1";

const urlsToCache = [
  "./",
  "./index.html",
  "./login.html",
  "./user.html",
  "./admin.html",
  "./admin-login.html",
  "./guest-profile.html",
  "./complete-profile.html",
  "./js/main.js",
  "./js/home.js",
  "./js/members.js",
  "./js/donations.js",
  "./js/blood.js",
  "./js/finance.js",
  "./components/home-section.html",
  "./components/members-section.html",
  "./components/donations-section.html",
  "./components/blood-section.html",
  "./components/profile-section.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      return caches.match("./index.html");
    })
  );
});