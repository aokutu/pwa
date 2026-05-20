$(document).ready(function() {

    $('#content').html('PWA Ready! 🚀');

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => $('#content').append('<p>Service Worker Active!</p>'))
            .catch(err => console.error('SW failed:', err));
    }

    // =========================
    // INDEXEDDB STARTS HERE
    // =========================

    let db;

    let request = indexedDB.open("MyAppDB", 1);

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        db.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
        console.log("Database & store created");
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("Database opened");

        // Save sample data
        saveMessage("Hello Andrew 🚀");
    };

    request.onerror = function(event) {
        console.error("Database error:", event.target.error);
    };

    function saveMessage(text) {
        let transaction = db.transaction("messages", "readwrite");
        let store = transaction.objectStore("messages");

        store.add({ message: text, date: new Date() });

        transaction.oncomplete = function() {
            console.log("Message saved");
            readMessages();
        };
    }

    function readMessages() {
        let transaction = db.transaction("messages", "readonly");
        let store = transaction.objectStore("messages");

        let request = store.getAll();

        request.onsuccess = function() {
            console.log("All messages:", request.result);
        };
    }

});