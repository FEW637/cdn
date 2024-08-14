(function() {
    function createFloatingChat() {
        // Create the floating chat button
        const floatingChat = document.createElement('div');
        floatingChat.className = 'floating-chat';
        floatingChat.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/512/9374/9374926.png" alt="Chat Icon">';
        document.body.appendChild(floatingChat);

        // Create the chat window
        const chatWindow = document.createElement('div');
        chatWindow.className = 'chat-window';
        chatWindow.innerHTML = `
            <div class="chat-header">
                <h4>Chat with us</h4>
                <span class="close-chat">×</span>
            </div>
            <div class="chat-body">
                <p>Hello! How can we assist you?</p>
            </div>
            <div class="chat-footer">
                <input type="text" placeholder="Type your message...">
                <button>Send</button>
            </div>
        `;
        document.body.appendChild(chatWindow);

        // Add event listeners
        floatingChat.addEventListener('click', function() {
            chatWindow.style.display = 'flex';
        });

        chatWindow.querySelector('.close-chat').addEventListener('click', function() {
            chatWindow.style.display = 'none';
        });
    }

    // Initialize the floating chat after the DOM content is loaded
    document.addEventListener('DOMContentLoaded', createFloatingChat);
})();
