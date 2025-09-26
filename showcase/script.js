// This event listener ensures that the entire script runs only after the
// HTML document has been fully loaded and parsed by the browser.
window.addEventListener('DOMContentLoaded', () => {

    // --- Get DOM Elements ---
    // We get references to all the interactive elements on the page once,
    // so we don't have to search for them repeatedly.
    const customCursor = document.getElementById('cursor');
    const music = document.getElementById('bg-music');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const navButtons = document.querySelectorAll('.nav-button');
    const contentSections = document.querySelectorAll('.content-section');

    // --- Custom Cursor Logic ---
    // This listens for the mouse moving anywhere on the window.
    window.addEventListener('mousemove', function(e) {
        // We update the 'left' and 'top' CSS properties of our custom cursor
        // div to match the mouse's X and Y coordinates.
        if (customCursor) {
            customCursor.style.left = e.clientX + 'px';
            customCursor.style.top = e.clientY + 'px';
        }
    });

    // This adds a simple visual effect to the cursor on mouse down.
    window.addEventListener('mousedown', function() {
        if (customCursor) {
            customCursor.classList.add('click-effect');
        }
    });

    // This removes the effect on mouse up.
    window.addEventListener('mouseup', function() {
        if (customCursor) {
            customCursor.classList.remove('click-effect');
        }
    });

    // --- NUI Event Listener from Lua ---
    // This listens for messages sent from the client.lua script.
    window.addEventListener('message', function(event) {
        const data = event.data; // The data object sent from Lua.

        // We check the 'action' property of the data.
        if (data.action === 'hide') {
            // This is the "true kill switch." It completely erases all HTML
            // content from the page, which instantly stops all music, animations,
            // and scripts, preventing any conflicts with the game's renderer.
            document.body.innerHTML = '';
        }
    });

    // --- Music Controls Logic ---
    if (music) {
        // Set a default starting volume.
        music.volume = 0.3;
    }
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            // Toggle between playing and pausing the music.
            if (music.paused) {
                music.play();
                // Change the icon to 'pause'.
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                music.pause();
                // Change the icon to 'play'.
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
    }
    if (volumeSlider) {
        // The 'input' event fires continuously as the slider is dragged.
        volumeSlider.addEventListener('input', (e) => {
            // Update the music volume to match the slider's value.
            music.volume = e.target.value;
        });
    }

    // --- Tab Navigation Logic ---
    // Loop through each navigation button.
    navButtons.forEach(button => {
        // Add a click event listener to each one.
        button.addEventListener('click', () => {
            // First, remove the 'active' class from all buttons and sections
            // to reset the state.
            navButtons.forEach(btn => btn.classList.remove('active'));
            contentSections.forEach(sec => sec.classList.remove('active'));

            // Second, add the 'active' class to the specific button that was clicked.
            button.classList.add('active');
            
            // Third, get the 'data-target' attribute from the clicked button
            // (e.g., "info", "rules") and show the corresponding content section.
            const targetId = button.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
});