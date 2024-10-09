// chatWidget.js
(function () {
    // Check if the widget is already initialized
    if (window.chatWidgetInitialized) return;
    window.chatWidgetInitialized = true;

    const BASE_URL = 'https://collab-x-dev.techberry.co.th';
    const LOGIN_URI = '/collabx/user/login';
    const LOGOUT_URI = '/collabx/user/logout';
    const UPLOAD_IMAGE_URI = '/collabx/file/upload';

    const PROFILE_ID = 'e8670e';
    const ACCEPT_IMAGE_EXTENSION = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const ACCEPT_VIDEO_EXTENSION = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mpeg', '3gp'];
    const ACCEPT_FILE_EXTENSION = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx','txt', 'zip','rar', '7z', 'csv','json','xml'];

    const MESSAGE_TYPE = 0;
    const IMAGE_TYPE = 1;
    const FILE_TYPE = 3;
    const VIDEO_TYPE = 4;
    const HTML_TYPE = 30;

    let centrifuge;
    let sessionId;
    let centifuge_token;
    let displayName;
    let channel = "collabx_assist";
    let unreadCount = 0;
    let groupId;
    let isResizingWidth = false;
    let isResizingHeight = false;


    // Dynamically load Centrifugo client library via CDN
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/centrifuge@latest/dist/centrifuge.min.js";
    script.onload = () => {
        sessionId = getCookie('ss_id');
        centifuge_token = getCookie('centrifugo_token');
        displayName = getCookie('displayName');
        groupId = getCookie('groupId');
        // channel = getCookie('channel');

        if(centifuge_token == null){
            sessionId = getRandomAlphabet(7);
            document.getElementById('send-button').disabled = true;
            document.getElementById('chat-input').disabled = true;
            document.getElementById('file-input').disabled = true;
            document.getElementById('chat-input').readOnly = true;
            document.getElementById('file-input').readOnly = true;
            document.getElementById('attach-file-button').disabled = true;
        } else {
            initializeCentrifugo().then(() =>
                publishOnline(true)
        );
            document.getElementById('initial_bubble').style.display = "none";
        }

        updateUnreadBadge();
    };
    script.onerror = () => {
        console.error('Failed to load Centrifuge.');
    };
    document.head.appendChild(script);


    // สร้าง element <script> เพื่อโหลดไลบรารี Axios ผ่าน CDN
    const axiosScript = document.createElement('script');
    axiosScript.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
    axiosScript.onload = () => {
        console.log('Axios loaded successfully!');
    };
    axiosScript.onerror = () => {
        console.error('Failed to load Axios.');
    };

    // เพิ่ม element <script> ไปยัง <head> หรือ <body>
    document.head.appendChild(axiosScript);

    // สร้าง element <script> เพื่อโหลดไลบรารี Autolinker ผ่าน CDN
    const autoLinkerScript = document.createElement('script');
    axiosScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/Autolinker/3.15.0/Autolinker.min.js';
    axiosScript.onload = () => {
        console.log('Autolinker loaded successfully!');
    };
    axiosScript.onerror = () => {
        console.error('Failed to load Autolinker.');
    };

    // เพิ่ม element <script> ไปยัง <head> หรือ <body>
    document.head.appendChild(autoLinkerScript);

    // -----------------------------
    // Load Roboto Font from Google Fonts
    // -----------------------------
    const robotoFont = document.createElement('link');
    robotoFont.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
    robotoFont.rel = 'stylesheet';
    document.head.appendChild(robotoFont);

    // -----------------------------
    // Load Font Awesome Dynamically
    // -----------------------------
    const faScript = document.createElement('script');
    faScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/js/all.min.js';
    faScript.crossOrigin = 'anonymous';
    document.head.appendChild(faScript);


    // -----------------------------
    // Tab,browser is closing
    // -----------------------------
    // window.addEventListener('beforeunload', function (event) {
    //     // ทำการตรวจสอบหรือบันทึกข้อมูลก่อนที่จะออกจากหน้าเว็บ
    //     event.preventDefault();
    //     this.window.alert("Bye Bye");
    //   });

    // -----------------------------
    // Configuration Constants
    // -----------------------------
    const ININTIAL_PRODUCT_MESSAGE = 'I can help you understand how our products and services can help you. You can type your question or select one of the following options.';
    const ABOUT_PRODUCT_MESSAGE = "Our product line includes a wide range of tools designed to boost collaboration and streamline workflows. From real-time messaging platforms to project management solutions, we provide everything teams need to work efficiently and stay connected. Our products also feature advanced integrations, allowing seamless connectivity with popular third-party apps, ensuring a smooth and unified work experience. Whether you need a powerful communication tool or a robust task management system, our product suite has the solution to fit your team's needs.";

    const DMA_PRODUCT_URL = 'https://web.techberry.tech/dynamic-mobile-application/';
    const SS_API_G_URL = 'https://web.techberry.tech/ssquare-apis-generator/';
    const SS_API_M_URL = 'https://web.techberry.tech/ssquare-api-management/';
    const I_CONNECTER_URL = 'https://web.techberry.tech/iconnector/';

    const products = [
        {
            'text': "SSQUARE - APIs Generator",
            'keyword': 'sapig',
            'linkUrl': SS_API_G_URL
        },
        {
            'text': "SSQUARE - API Management",
            'keyword': 'apim',
            'linkUrl': SS_API_M_URL
        },
        {
            'text': "DMA - Dynamic Mobile Application",
            'keyword': 'dma',
            'linkUrl': DMA_PRODUCT_URL
        },
        {
            'text': "iConnector",
            'keyword': 'iconnector',
            'linkUrl': I_CONNECTER_URL
        },
        {
            'text': "Collabx",
            'keyword': 'collabx',
            'linkUrl': ''
        },
    ];

    // -----------------------------
    // Inject Styles
    // -----------------------------
    const styles = `
        :root{
            --main-icon-chat-color : #D6357F;
            --header-color: #D6357F;
            --header-text-color: #ffffff;
            --chat-background-color: #ffffff;
            --me-bubble-color: #8C35D6;
            --me-bubble-TextColor: #ffffff;
            --participants-bubble-color: #e5e5e5;
            --participant-text-color: #000000;
            --container-send-message-color: #ffffff;
            --send-button-color:#D6357F;
            --send-icon-color:#ffffff;

            --choice-border-color: #d635d0;
            --choice-text-color: #d635d0;
            --choice-hover-color: #D6357F;
            --choice-hover-text-color: #ffffff;

            --scroll-bar-color: #f3cedf;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Roboto', sans-serif; /* Apply Roboto font globally */
        }

        p, h1, h2, h3, h4, h5, h6, li {
            letter-spacing: 0.5px;
            margin-bottom: 0 !important;
        }

        /* Chat button */
        #chat-button {
            position: fixed;
            bottom: 80px;
            right: 20px;
            padding : 0 !important;
            background: var(--main-icon-chat-color);
            color: #fff;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            font-size: 24px;
            transition: background 0.3s;
            border: none;
            font-family: 'Roboto', sans-serif;
        }

        #chat-button:hover {
            background: var(--main-icon-chat-color);
        }

        /* Chat overlay */
        #chat-overlay {
            position: fixed;
            bottom: 80px;
            right: 0;
            width: 400px;
            height: 650px;
            margin: 20px;
            background: #fff;
            border-radius: 10px 10px 10px 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: none;
            flex-direction: column;
            z-index: 1000000;
            transform: scale(0);
            transform-origin: bottom right;
            transition: transform 0.3s ease;
            resize: none;
            overflow: auto;
        }

        /* แสดง badge เมื่อมี unread count */
        .show-badge {
            display: block;
        }

        /* Badge ที่มุมขวาบน */
        .badge {
            position: absolute;
            top: 0;
            right: 0;
            background-color: red;
            color: white;
            padding: 0 5px 5px 5px; 
            border-radius: 50%;
            font-size: 12px;
            display: none; /* ซ่อน badge ไว้ตอนเริ่มต้น */
            height: 23px;
            width: 20px;
        }

        /* ซ่อน chat */
        .chat-hidden {
            display: none;
        }

        /* แสดง chat */
        .chat-visible {
            display: block;
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 300px;
            height: 400px;
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 10px;
        }

        /* Badge แสดงสถานะ online/offline ที่มุมซ้ายล่าง */
        .status {
            position: absolute;
            left: -0.5px;
            top: -5px;
            width: 15px;
            height: 15px;
            border-radius: 50%;
            border: 2px solid white;
            display: block;
            margin-top: 50px;
        }

        /* แสดงสถานะ online */
        .status.online {
            background-color: green;
        }

        /* แสดงสถานะ offline */
        .status.offline {
            background-color: gray;
        }


        #chat-overlay.open {
            display: flex;
            transform: scale(1);
        }

        #chat-overlay.close {
            transform: scale(0);
        }

        #chat-header {
            background: var(--header-color);
            color: var(--header-text-color);
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 10px 10px 0 0;
            position: relative;
            font-family: 'Roboto', sans-serif;
        }

        #header-content {
            display: flex;
            flex-direction: column;
        }

        #chat-header h2 {
            font-size: 18px;
            font-weight: 500; /* Use Roboto medium weight */
            margin-bottom: 5px;
            color: var(--header-text-color);
        }

        #chat-header p {
            font-size: 14px;
            font-weight: 400; /* Use Roboto regular weight */
            margin: 0;
        }

        #close-button {
            background: none;
            border: none;
            width: 40px; /* กำหนดขนาดของปุ่มตามที่ต้องการ */
            height: 40px; /* กำหนดขนาดของปุ่มให้เหมาะสม */
            display: flex; /* ใช้ flexbox เพื่อจัดไอคอนตรงกลาง */
            justify-content: center; /* จัดไอคอนให้ตรงกลางแนวนอน */
            align-items: center; /* จัดไอคอนให้ตรงกลางแนวตั้ง */
            cursor: pointer;
            transition: color 0.3s;
            color: var(--header-text-color); /* สีของไอคอน */
            font-size: 20px; /* ขนาดของไอคอน */
            padding: 0; /* ลบ padding เพื่อไม่ให้ขนาดปุ่มเพิ่มขึ้น */
        }

        #close-button:hover {
            color: #ddd;
        }

        #clear-cookie-button {
            background: none;
            border: none;
            font-size: 20px;
            color: var(--header-text-color);
            cursor: pointer;
            transition: color 0.3s;
            padding: 10px !important;
            margin-left: 60px;
        }

        #clear-cookie-button :hover {
            color: #ddd;
        }

        #chat-body {
            flex: 1;
            padding: 10px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            line-height: 1.5;
        }

        /* CSS สำหรับ icon paste ตรงกลาง */
        #drop-icon {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 50px;
            color: #aaa;
            display: none;
            z-index: 999; /* ให้อยู่ข้างหน้าสุด */
        }

        #chat-body.dragging {
            background-color: #f0f0f0; /* เปลี่ยนสีพื้นหลังเมื่อไฟล์ถูกลากเข้า */
        }

        .message {
            margin: 10px;
            max-width: 100%;
            border-radius: 15px;
            padding: 10px;
            position: relative;
            font-weight: 400;
            font-family: 'Roboto', sans-serif;
        }

        #message_image {
                border-radius: 10px;
        } 

        /* styling สำหรับ file bubble */
        .file-bubble {
            background-color: #f1f1f1;
            border-radius: 10px;
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }

        .file-info {
            display: flex;
            align-items: center;
        }

        .file-icon {
            font-size: 24px;
            color: #555;
            margin-right: 10px;
        }

        .file-details {
            display: flex;
            flex-direction: column;
            margin-right: 10px;
        }

        .file-name {
            font-weight: bold;
            margin: 0;
            color: #615555;
        }

        .file-size {
            color: #888;
            font-size: 12px;
            margin: 0;
        }

        /* ปุ่มดาวน์โหลด */
        .file-download {
            background-color: var(--me-bubble-color);
            color: white;
            text-decoration: none;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 14px;
        }

        .file-download:hover {
            background-color: #0056b3;
        }   

        .user-message {
            align-self: flex-end;
            background: var(--me-bubble-color);
            color: var(--me-bubble-TextColor);
            max-width: 80%;
            margin-bottom: 0 !improtant;
        }

        .bot-message {
            // align-self: flex-start;
            background: var(--participants-bubble-color);
            color: var(--participant-text-color);
        }

        .options {
            margin-top: 10px;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .option-button {
            background: transparent;
            border: 1px solid var(--choice-border-color);
            color:  var(--choice-text-color);
            border-radius: 10px;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            transition: background 0.1s, color 0.1s;
        }

        .option-button:hover {
            background: var(--choice-hover-color);
            color: var(--choice-hover-text-color);
        }

        .time {
            display: block;
            font-size: 12px;
            color: #888;
            margin-top: 5px;
        }

        #chat-footer {
            display: flex;
            padding: 10px;
            border-top: 1px solid var(--container-send-message-color);
            background: #f9f9f9;
            border-radius: 0 0 10px 10px;
        }

        #chat-input {
            flex: 1;
            padding: 15px;
            border: 1px solid var(--container-send-message-color);
            border-radius: 20px;
            margin-right: 10px;
            font-weight: 400;
            font-family: 'Roboto', sans-serif;
        }

        #chat-name {
            flex: 1;
            padding: 15px;
            border: 1px solid var(--container-send-message-color);
            border-radius: 10px;
            margin-right: 10px;
            margin-top: 10px;
            font-weight: 400;
            font-family: 'Roboto', sans-serif;
            width: 100%;
        }

        #send-button {
            background: var(--send-button-color);
            color: var(--send-icon-color);
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            cursor: pointer;
            transition: background 0.3s;
            font-family: 'Roboto', sans-serif;
        }

        #attach-file-button {
            padding: 0 10px 0 10px !important;
            background: none;
            border: none;
            margin-right: 10px;
            font-size: 18px;
            cursor: pointer;
            color: #333;
            border-radius: 20px;
        }

        ::-webkit-scrollbar {
        width: 8px;
        }

        ::-webkit-scrollbar-thumb {
        background-color: var(--scroll-bar-color);
        border-radius: 20px;
        }

        ::-webkit-scrollbar-track {
        background-color: #f1f1f1;
        border-radius: 10px;
        }

        * {
        scrollbar-width: thin;
        scrollbar-color: var(--scroll-bar-color) #f1f1f1;
        }

        /* animation dots */
        #sending-animation {
            display: flex;
            justify-content: center;
            position: absolute;
            bottom: 75px;
            left: 0;
            right: 0;
        }

        .dot {
            width: 10px;
            height: 10px;
            background-color: #D6357F;
            border-radius: 50%;
            margin: 0 5px;
            animation: bounce 1.2s infinite ease-in-out;
        }

        .dot:nth-child(2) {
            animation-delay: -1.1s;
        }

        .dot:nth-child(3) {
            animation-delay: -1.0s;
        }

        .dot:nth-child(4) {
            animation-delay: -0.9s;
        }

        /* animation ของการกระโดด */
        @keyframes bounce {
            0%, 80%, 100% {
                transform: translateY(0);
            }
            40% {
                transform: translateY(-15px);
            }
        }

        /* The Close Button */
        .close {
            position: absolute;
            top: 10px;
            right: 25px;
            color: #fff;
            font-size: 35px;
            font-weight: bold;
            cursor: pointer;
        }

        .close:hover,
        .close:focus {
            color: #bbb;
            text-decoration: none;
            cursor: pointer;
        }
        
        /* Handle สำหรับ resize */
        .resize-handle {
            width: 20px;
            height: 20px;
            background-color: transparent;
            position: absolute;
            right: 0;
            bottom: 0;
            cursor: nwse-resize; /* แสดง cursor สำหรับ resize */
        }
            
        /* เพิ่มพื้นที่ขอบซ้าย ขวา ล่าง เพื่อให้สามารถ resize ได้ */
        #chat-overlay::before,
        #chat-overlay::after {
            content: "";
            position: absolute;
            z-index: 100;
        }

        /* ด้านขวา (สำหรับขยายความกว้าง) */
        #chat-overlay::before {
            right: 0;
            top: 0;
            width: 10px;
            height: 100%;
            cursor: ew-resize;
        }

        /* ด้านล่าง (สำหรับขยายความสูง) */
        #chat-overlay::after {
            bottom: 0;
            left: 0;
            width: 100%;
            height: 10px;
            cursor: ns-resize;
        }
        
        /* container ของวิดีโอ */
        .video-container {
            position: relative;
        }

        /* video player */
        .video-player {
            width: 100%;
            height: auto;
            border-radius: 10px;
        }

        /* video control buttons */
        .video-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            gap: 10px;
        }

        /* ปุ่ม control สำหรับ fullscreen และ download */
        .control-button {
            background: rgba(0, 0, 0, 0.6);
            border: none;
            color: white;
            padding: 5px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }

        .control-button i {
            margin-right: 5px;
        }

        .control-button:hover {
            background: rgba(0, 0, 0, 0.8);
        }   
        `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // -----------------------------
    // Function Definitions
    // -----------------------------

    // เมื่อหน้าเว็บโหลดขึ้นให้บอกว่าออนไลน์
    window.onload = function() {
        updateStatus(true); // อัปเดตสถานะใน UI
        // publishStatus('online'); // ส่งข้อมูลสถานะออนไลน์ไปที่ Centrifugo
    };

    // เมื่อปิดแท็บหรือปิดเบราว์เซอร์ให้แจ้งสถานะออฟไลน์
    window.onbeforeunload = function() {
        updateStatus(false); // อัปเดตสถานะใน UI
        publishOnline(false);
    };

    const publishOnline = (status) => {
        centrifuge.publish('collabx_inbox',
            prepareMessageFormat('assist/online/set', {'groupId': groupId, "onlineStatus": status}, 'WDZ', '1', sessionId)).then(() => {
                // console.log('Message published assist/online/set successfully');
            })
        .catch((err) => {
            console.error('Failed to publish message:', err);
        });
    }

    // ฟังก์ชันแสดงหรือซ่อน badge ตามสถานะของ chat
    function updateUnreadBadge() {
        const badge = document.getElementById('unread-badge');
        const chatButtonO = document.getElementById('chat-button');
        
        // ถ้า chat ถูกปิดและมี unreadCount ให้แสดง badge
        if (unreadCount > 0) {
            badge.innerHTML = unreadCount;
            // badge.classList.add('show-badge');
            badge.style.display = 'block';
        } else {
            // badge.classList.remove('show-badge');
            badge.style.display = 'none';
        }
    }

    // ฟังก์ชันแสดงสถานะออนไลน์/ออฟไลน์
    function updateStatus(isOnline) {
        const statusBadge = document.getElementById('status-badge');
        if (isOnline) {
            statusBadge.classList.add('online');
            statusBadge.classList.remove('offline');
        } else {
            statusBadge.classList.add('offline');
            statusBadge.classList.remove('online');
        }
    }

    function toggleChat() {
        if (chatOverlay.classList.contains('open')) {
            chatOverlay.classList.remove('open');
            chatOverlay.classList.add('close');
            setTimeout(() => {
                chatOverlay.style.display = 'none';
                chatOverlay.classList.remove('close');
                chatOverlay.style.left = '';
                chatOverlay.style.top = '';
                chatOverlay.style.right = '0';
                chatOverlay.style.bottom = '80';
                chatButton.style.display = 'flex';
                unreadCount = 0;
                updateUnreadBadge();
            }, 100);
        } else {
            // getHeaderContentForPage()
            chatOverlay.style.display = 'flex';
            chatButton.style.display = 'none';
            setTimeout(() => {
                chatOverlay.classList.add('open');
            }, 10);
        }
    }

    async function initializeCentrifugo() {
        centrifuge = new Centrifuge("wss://collab-x-dev.techberry.co.th/connection/websocket",
            {
                "token" : centifuge_token
            }
        );
        centrifuge.on('connect', function (ctx) {
            console.log('Connected to Centrifugo', ctx);
        });
        centrifuge.on('disconnect', function (ctx) {
            console.log('Disconnected from Centrifugo', ctx);
        });
        centrifuge.on('error', function (err) {
            console.error('Connection error:', err);
        });

        centrifuge.connect();
        subscribeMessage(sessionId);
        subscribeCollabxDemo('collabx_assist');
    }

    const prepareMessageFormat = (action, data, device, version, did) => {
        return {
            "username": '',
            "action": action,
            "data": data,
            "device": device,
            "version": version,
            "did": did,
            "timestamp": performance.now() * 1000,
          };
    }

    const subscribeMessage = (channel) => {
        const subscription = centrifuge.newSubscription(channel);
    
        subscription.on('publication', function(context) {
            const { message } = context.data;
            scrollToBottom();
            unreadCount++;
            updateUnreadBadge();

            // เรียกฟังก์ชันแสดงข้อความใน bubble แบบ chunk
            messageManaging('chat-body', message , 10, 100); // Chunk size = 10, Speed = 100ms
        });
    
        subscription.on('subscribe', function (context) {
            console.log('Subscribed to chat_channel:', context);
        });
    
        subscription.on('error', function (err) {
            console.error('Subscription error:', err);
        });
    
        // if(!subscription.isSubscribed){
          subscription.subscribe();
        // }
    }

    const subscribeCollabxDemo = (channel) => {
        const subscription2 = centrifuge.newSubscription(channel);
    
        subscription2.on('publication', function(context) {
            
        });
    
        subscription2.on('subscribe', function (context) {
            console.log('Subscribed to chat_channel:', context);
        });
    
        subscription2.on('error', function (err) {
            console.error('Subscription error:', err);
        });
    
        subscription2.subscribe();
    
        // const unsubscribe = () => {
          // subscription2.unsubscribe();
        // }
    }

    async function disconnectCentrifugo() {
        if (centrifuge) {
            centrifuge.disconnect();
            console.log('Disconnected from Centrifugo');
        } else {
            console.log('Centrifuge instance not found');
        }
    }

    // Function to set a cookie
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + JSON.stringify(value) + expires + "; path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const cookiesArray = document.cookie.split(';');

        function removeQuotes(str) {
            return str.replace(/"/g, ''); // ใช้ regular expression เพื่อแทนที่เครื่องหมาย " ด้วยค่าว่าง
          }
        
        for(let i = 0; i < cookiesArray.length; i++) {
            let cookie = cookiesArray[i].trim();
            if (cookie.indexOf(nameEQ) === 0) {
                return removeQuotes(cookie.substring(nameEQ.length, cookie.length));
            }
        }
        return null; // If the cookie is not found
    }

    const isYourMessage = (fromUserId) => {
        if(fromUserId == sessionId){
            user = 'user-message';
        } else {
            user = 'bot-message';
        }

        return user;
    }

    async function onClearCookieClick() {
        await disconnectCentrifugo();
        await unRegister();
        publishOnline(false);
        const keysForDelete = ['displayName', 'ss_id', "centrifugo_token"];
        keysForDelete.map((name) => document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;');
        location.reload();
    }

    function messageManaging(chatBodyId, message, chunkSize, speed) { 
        let user;  
        const {messageContentType, message:messageText, fromUserId} = message;

        user = isYourMessage(fromUserId);
        
        if(messageContentType == HTML_TYPE){

            // สร้าง bubble ของข้อความ
            const messageBubble = document.createElement('div');
            messageBubble.classList.add('message', user);

            messageBubble.innerHTML = messageText;
            // เพิ่ม bubble เข้าไปใน chat body
            chatBody.appendChild(messageBubble);

        } else if(messageContentType == IMAGE_TYPE || messageContentType == VIDEO_TYPE || messageContentType == FILE_TYPE) {
            addImageMessage(message);
        } else if(messageContentType == MESSAGE_TYPE) {
            typeWriterEffectInBubble(chatBodyId, message, chunkSize, speed);

        } else {
            console.log('no type');
        }
    }

    const typeWriterEffectInBubble = (chatBodyId, message, chunkSize = 5, speed = 100) => {
        let user;
        const chatBody = document.getElementById(chatBodyId);
        const {message:messageText, fromUserId} = message;

        user = isYourMessage(fromUserId);

        // สร้าง bubble ของข้อความ
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message', user);

        // const linkedText = linkifyText(messageText);

        let i = 0;
            function typeChunk() {
                if (i < messageText.length) {
                    messageTextElement.innerHTML += messageText.substr(i, chunkSize);
                    i += chunkSize;
                    setTimeout(typeChunk, speed);
                    scrollToBottom();
                }
            }

            // สร้าง element สำหรับแสดงข้อความ
            const messageTextElement = document.createElement('p');
            messageBubble.appendChild(messageTextElement);
            // addParticipantMessage(messageText);

             // เริ่มแสดงผลข้อความแบบค่อยๆขึ้นทีละ chunk
            typeChunk();

            // เพิ่ม bubble เข้าไปใน chat body
            chatBody.appendChild(messageBubble);
    }

    function setTokenInCookies(keyBase, value, maxChunkSize = 4000, days = 7) {
        // แบ่งข้อความเป็นส่วนย่อย ๆ โดยใช้ maxChunkSize
        const chunks = [];
        for (let i = 0; i < value.length; i += maxChunkSize) {
            chunks.push(value.substring(i, i + maxChunkSize));
        }
    
        // เก็บแต่ละ chunk ไว้ใน cookie ที่ชื่อ keyBase1, keyBase2, ...
        chunks.forEach((chunk, index) => {
            setCookie(`${keyBase}${index + 1}`, chunk, days);
        });
    
        // เก็บจำนวน chunk ใน cookie เพื่อตอนเอามาต่อจะได้รู้ว่ามีกี่ส่วน
        setCookie(`${keyBase}_chunks`, chunks.length, days);
    }


    function getTokenFromCookies(keyBase) {
        // ดึงจำนวน chunk ที่เคยเก็บไว้
        const numChunks = getCookie(`${keyBase}_chunks`);
        if (!numChunks) return null;
    
        // นำแต่ละ chunk มาต่อกัน
        let fullText = "";
        for (let i = 1; i <= numChunks; i++) {
            const chunk = getCookie(`${keyBase}${i}`);
            if (chunk) {
                fullText += chunk;
            }
        }
    
        return fullText;
    }


    // Function to generate a random alphabet
    function getRandomAlphabet(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    const onRegisterClick = async () => {

        const chatNameField = document.getElementById('chat-name');
        const dn = chatNameField.value.trim();
        if (!dn) return;

        const headers = {
            'Content-Type': 'application/json',
            'X-Agent-Code': 'WDZ'
        };

        function callLoginAPI() {
            axios.post(`${BASE_URL}${LOGIN_URI}`,{did: sessionId, displayName: dn, metadata: {}, 'profile_id': PROFILE_ID}, {headers})
                .then(response => {
                    if(response.status == 200 && response.data._hyper_code == "200") {
                        const {token, groupId:room, channel:cn } = response.data;
                        setCookie('centrifugo_token', token);
                        centifuge_token = token;
                        displayName = dn;
                        groupId = room;
                        /* พี่ต่อจะส่ง channel มาให้ */
                        // channel = cn;
                        initializeCentrifugo().then(() => publishOnline(true));

                        document.getElementById('send-button').disabled = false;
                        document.getElementById('chat-input').disabled = false;
                        document.getElementById('file-input').disabled = false;
                        document.getElementById('chat-input').readOnly = false;
                        document.getElementById('file-input').readOnly = false;
                        document.getElementById('attach-file-button').disabled = false;

                        document.getElementById('initial_bubble').style.display = "none";

                        setCookie("ss_id", sessionId, 7);
                        setCookie("displayName", dn);
                        setCookie("groupId", room);
                        setCookie("channel", channel);

                        // เรียกฟังก์ชันแสดงข้อความใน bubble แบบ chunk
                        // messageManaging('chat-body',false ,0, `Hello, MR.${dn} ${ININTIAL_PRODUCT_MESSAGE}`, 10, 100); // Chunk size = 10, Speed = 100ms
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        }

        callLoginAPI();
    }

    const unRegister = async () => {

        const headers = {
            'Content-Type': 'application/json',
            'X-Agent-Code': 'WDZ'
        };

        function callUnLoginAPI() {
            axios.post(`${BASE_URL}${LOGOUT_URI}`,{did: sessionId, displayName: displayName, metadata: {}, 'profile_id': PROFILE_ID}, {headers})
                .then(response => {
                    if(response.status == 200 && response.data._hyper_code == "200") {
                        // console.log('===> logout');
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        }

        callUnLoginAPI();
    }

    const prepareMessagedata = (messageContentType, message, object) => {
        const metadata_pattern = {
            'toUserId': "",
            'toDisplayName': "",
            'channel': channel
        };

        if(messageContentType == MESSAGE_TYPE){
            metadata = {'texts': [metadata_pattern]};

        } else if(messageContentType == IMAGE_TYPE) {
            const {path, thumbnail_url, size, name} = object;
            metadata = {'images': [{
                'name': name || "",
                'path': path || "",
                'thumbnailUrl': thumbnail_url || "",
                'size': size || 0,
                ...metadata_pattern
            }]};

        } else if(messageContentType == VIDEO_TYPE) {
            const {path, thumbnail_url, size, name, streamUrl} = object;
            metadata = {'videos': [{
                'name': name || "",
                'path': path || "",
                'thumbnailUrl': thumbnail_url || "",
                'size': size || 0,
                'streamUrl': streamUrl || "",
                ...metadata_pattern
            }]};

        } else if(messageContentType == FILE_TYPE) {
            const {path, thumbnail_url, size, name} = object;
            metadata = {'files': [{
                'name': name || "",
                'path': path || "",
                'thumbnailUrl': thumbnail_url || "",
                'size': size || 0,
                ...metadata_pattern
            }]};

        } else {
            metadata = {
                'other': [metadata_pattern]
            }
        }

        return data = {
            "message" : message,
            "fromUserId": sessionId,
            "id": (performance.now() * 1000).toString(),
            "pairedMessageId": '',
            "sharedMessageId": 0,
            "messageContentType": messageContentType,
            "groupId": groupId,
            "source": 0,
            "display": true,
            "caption": message,
            "metadata": metadata,
            'displayName': displayName || sessionId
        };
    }

    function sendMessage(messageObj) {
        const {messageContentType, message, fromUserId} = messageObj;
        const inputField = document.getElementById('chat-input');
    
        if (!message && messageContentType == MESSAGE_TYPE) return;

        if(messageContentType == MESSAGE_TYPE){
            addUserMessage(messageObj);
        } else if(messageContentType == IMAGE_TYPE) {
            addImageMessage(messageObj);
        } else if(messageContentType == VIDEO_TYPE) {
            addImageMessage(messageObj);
        } else if(messageContentType == FILE_TYPE) {
            addImageMessage(messageObj);
        } else {
            addUserMessage(messageObj);
        }

        // Publish the message to the channel
        centrifuge.publish('collabx_inbox',
            prepareMessageFormat('message/send', messageObj, 'WDZ', '1', sessionId)).then(() => {
                // console.log('Message published successfully', messageObj);
            })
        .catch((err) => {
            console.error('Failed to publish message:', err);
        });

        inputField.value = ''; // Clear the input field after sending
    }

    function addUserMessage(data) {
        const {message} = data;
        const chatBody = document.getElementById('chat-body');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'user-message');
        messageElement.innerHTML = `<p>${message}</p>`;
        chatBody.appendChild(messageElement);
        scrollToBottom();
    }

    
    function scrollToBottom() {
        const chatBody = document.getElementById('chat-body');
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function formatFileSize(bytes) {
        const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(2)} ${units[i]}`;
    }
    
    // แสดงภาพเป็น bubble ฝั่งขวา (ผู้ใช้)
    function addImageMessage(message) {

        let thumbnail = '';
        let pathUrl = '';
        let widget = '';
        const {fromUserId, metadata, messageContentType} = message;

        if(messageContentType == IMAGE_TYPE){
            const {thumbnailUrl, path} = metadata.images[0];
            thumbnail = thumbnailUrl;
            pathUrl = path;
            widget = `<img id="message_image" style="width: auto; height: auto; max-width: 300px;max-height: 200px; cursor: pointer;" src="${thumbnail}" alt="Image" class="clickable-image">`;
        } else if(messageContentType == VIDEO_TYPE) {
            const {thumbnailUrl, path, size, name} = metadata.videos[0];
            thumbnail = thumbnailUrl;
            pathUrl = path;
            widget = `<div class="video-container">
                    <video id="video-player" class="video-player" controls>
                        <source src="${path}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                   <!-- <div class="video-controls">
                        <button class="control-button" onclick="toggleFullScreen('video-player')"><i class="fas fa-expand"></i></button>
                        <a href="${path}" class="control-button" download><i class="fas fa-download"></i></a>
                    </div> -->
                </div>`;
        } else if(messageContentType == FILE_TYPE) {
            const {thumbnailUrl, path, name, size} = metadata.files[0];
            thumbnail = thumbnailUrl;
            pathUrl = path;
            widget = `<div class="file-bubble">
                    <img style="width: auto;height: auto;max-width: 40px;max-height: 40px; margin-right: 10px; border-radius: 5px;" src="${thumbnail}" alt="Image" class="clickable-image">
                        <div class="file-info">
                            <div class="file-details">
                                <p class="file-name">${name}</p>
                                <p class="file-size">${formatFileSize(size)}</p>
                            </div>
                        </div>
                    <!--<a href="${path}" class="file-download" target="_blank"><i class="fas fa-download"></i></a>--> <!-- ปุ่มดาวน์โหลด -->
                </div>
            `;
        }

        // ฟังก์ชันเปิด fullscreen mode
        function toggleFullScreen(videoId) {
            const videoElement = document.getElementById(videoId);

            if (videoElement.requestFullscreen) {
                videoElement.requestFullscreen();
            } else if (videoElement.mozRequestFullScreen) { /* Firefox */
                videoElement.mozRequestFullScreen();
            } else if (videoElement.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                videoElement.webkitRequestFullscreen();
            } else if (videoElement.msRequestFullscreen) { /* IE/Edge */
                videoElement.msRequestFullscreen();
            }
        }

        let user = "";
        const chatBody = document.getElementById('chat-body');
        const messageElement = document.createElement('div');
        if(fromUserId == sessionId){
            user = 'user-message';
        } else {
            user = 'bot-message';
        }
        messageElement.classList.add('message', user);
        messageElement.innerHTML = widget;
        messageElement.addEventListener('click', function() {
            window.open(pathUrl, '_blank'); // เปิดลิงก์ในแท็บใหม่
        });
        hideSendingAnimation();
        messageElement.style.background = 'none';
        chatBody.appendChild(messageElement);
        scrollToBottom();
    }

    // ฟังก์ชันเพื่อตรวจสอบว่า URL นั้นเป็นไฟล์ประเภทที่ accept หรือไม่
    function isAcceptedFile(url) {
        // ดึง extension จาก url
        const fileExtension = url.split('.').pop().toLowerCase();

        if(ACCEPT_IMAGE_EXTENSION.includes(fileExtension)) {
            return {'isAccept': true, 'contentType': IMAGE_TYPE};
        } else if(ACCEPT_VIDEO_EXTENSION.includes(fileExtension)){
            return {'isAccept': true, 'contentType': VIDEO_TYPE};
        } else if(ACCEPT_FILE_EXTENSION.includes(fileExtension)){
            return {'isAccept': true, 'contentType': FILE_TYPE};
        } else {
            return {'isAccept': false, 'contentType': -1}
        }
    }
    
    // ฟังก์ชันส่งภาพไปยังเซิร์ฟเวอร์ (ยังเป็นตัวอย่าง)
    function sendMediaMessage(file) {
        const { isAccept, contentType } = isAcceptedFile(file.name);

        if(!isAccept) return;
        showSendingAnimation();

        const formData = new FormData();
        formData.append('image', file);
    
        // ใช้ fetch เพื่ออัปโหลดรูปภาพไปยังเซิร์ฟเวอร์
        fetch(`${BASE_URL}${UPLOAD_IMAGE_URI}`, {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            sendMessage(prepareMessagedata(contentType, '', data));
        })
        .catch(error => {
            console.error('Error uploading image:', error);
        });
    }

    // -----------------------------
    // Event Listener
    // -----------------------------

    const chatButton = document.createElement('button');
    chatButton.id = 'chat-button';
    chatButton.innerHTML = `<i class="fas fa-comments"></i> <span id="unread-badge" class="badge">${unreadCount}</span><span id="status-badge" class="badge status online"></span> <!-- Badge แสดงจำนวนข้อความที่ยังไม่ได้อ่าน -->`;
    document.body.appendChild(chatButton);

    const chatOverlay = document.createElement('div');
    chatOverlay.id = 'chat-overlay';
    chatOverlay.innerHTML = `
        <div id="chat-header">
            <div id="header-content">
                <h2>TECHBERRY Assistant Bot</h2>
                <p>Our sales reps are online</p>
            </div>
            <button id="clear-cookie-button"><i class="fas fa-trash"></i></button>
            <button id="close-button"><i class="fas fa-window-minimize"></i></button>
        </div>
        <div id="chat-body"></div>
        <div id="chat-footer">
            <button id="attach-file-button"><i class="fas fa-paperclip"></i></button>
            <input type="file" id="file-input" accept="image/*" style="display:none;">
            <input type="text" placeholder="Ask a question" id="chat-input">
            <button id="send-button"><i class="fas fa-paper-plane"></i></button>
        </div>
        
        <div id="resize-handle" class="resize-handle"></div>
    `;
    document.body.appendChild(chatOverlay);

    chatButton.addEventListener('click', toggleChat);
    document.getElementById('close-button').addEventListener('click', toggleChat);
    document.getElementById('clear-cookie-button').addEventListener('click', onClearCookieClick);
    document.getElementById('send-button').addEventListener('click', () => sendMessage(prepareMessagedata(MESSAGE_TYPE, document.getElementById('chat-input').value.trim(), {})));
    document.getElementById('chat-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') sendMessage(prepareMessagedata(MESSAGE_TYPE, document.getElementById('chat-input').value.trim(), {}));
    });

    // สร้าง drop icon และเพิ่มเข้าไปใน chat body
    const dropIcon = document.createElement('i');
    dropIcon.id = 'drop-icon';
    dropIcon.className = 'fas fa-paste'; // ใช้ไอคอน paste จาก Font Awesome
    document.getElementById('chat-body').appendChild(dropIcon);

    // ตัวแปรเพื่อจัดการกับการลาก (dragging)
    let isDragging = false;
    let offsetX, offsetY;

    // เริ่มการลากเมื่อกดเมาส์ลงที่หัวแชท
    chatOverlay.addEventListener('mousedown', function(e) {
        if (e.target.id !== 'chat-header') return; // เริ่มลากเฉพาะเมื่อกดที่หัวแชท
        isDragging = true;
        offsetX = e.clientX - chatOverlay.offsetLeft;
        offsetY = e.clientY - chatOverlay.offsetTop;

        var chatHeader = document.getElementById('chat-header');
        chatHeader.style.cursor = 'grabbing';
    });

    // ปรับตำแหน่งของแชทตามการเคลื่อนไหวของเมาส์
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        chatOverlay.style.left = `${e.clientX - offsetX}px`;
        chatOverlay.style.top = `${e.clientY - offsetY}px`;
    });

    // หยุดการลากเมื่อปล่อยเมาส์
    document.addEventListener('mouseup', function() {
        isDragging = false;
        var chatHeader = document.getElementById('chat-header');
        chatHeader.style.cursor = 'grab';
    });

    // กำหนดพื้นที่ขอบสำหรับการขยายความกว้าง (ด้านขวา)
    chatOverlay.addEventListener('mousedown', function (e) {
        if (e.target === chatOverlay && e.offsetX >= chatOverlay.clientWidth - 10) {
            isResizingWidth = true;
            document.body.style.cursor = 'ew-resize'; // เปลี่ยน cursor เป็น resize
        } else if (e.target === chatOverlay && e.offsetY >= chatOverlay.clientHeight - 10) {
            isResizingHeight = true;
            document.body.style.cursor = 'ns-resize'; // เปลี่ยน cursor เป็น resize
        }
    });

    // ตรวจสอบการขยายขนาดหน้าต่างตามการเคลื่อนไหวของเมาส์
    document.addEventListener('mousemove', function (e) {
        if (isResizingWidth) {
            const newWidth = e.clientX - chatOverlay.getBoundingClientRect().left;
            chatOverlay.style.width = `${newWidth}px`;
        } else if (isResizingHeight) {
            const newHeight = e.clientY - chatOverlay.getBoundingClientRect().top;
            chatOverlay.style.height = `${newHeight}px`;
        }
    });

    // ยกเลิกการ resize เมื่อปล่อยปุ่มเมาส์
    document.addEventListener('mouseup', function () {
        isResizingWidth = false;
        isResizingHeight = false;
        document.body.style.cursor = 'default'; // คืนค่า cursor กลับเป็นปกติ
    });

    // function showInitialMessage() {
        const chatBody = document.getElementById('chat-body');
        const initialMessage = `
            <div id="initial_bubble" class="message bot-message">
                <p>What would you like us to call you?</p>
                <input id="chat-name" type="text" placeholder="Your name's" />
                <div class="options">
                    <button id="name-confirm" class="option-button">Confirm</button>
                </div>
            </div>
        `;
        chatBody.innerHTML = initialMessage;
        scrollToBottom();

        document.getElementById('name-confirm').addEventListener('click', onRegisterClick);
    // }

    // ฟังก์ชันแนบไฟล์และแสดงเป็น bubble
    document.getElementById('attach-file-button').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', function() {
        if(this.files[0] == null) return;
        const file = this.files[0];
        if (file 
            // && file.type.startsWith('image/')
        ) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageUrl = event.target.result;
                // addImageMessage(imageUrl, true);
                // ฟังก์ชันนี้จะเป็นตัวส่งภาพไปยังเซิร์ฟเวอร์ถ้าต้องการ
                sendMediaMessage(file); 
            };
            reader.readAsDataURL(file);
        }
    });

    // Event listeners สำหรับการ drag & drop ไฟล์ลงใน chat window
    // ป้องกันการโหลดหน้าใหม่เมื่อมีการลากไฟล์มาทิ้ง
    document.addEventListener('dragover', function (e) {
        e.preventDefault();
    }, false);

    document.addEventListener('drop', function (e) {
        e.preventDefault();
    }, false);

    // จัดการ drag & drop เมื่อไฟล์ถูกลากมาทิ้งใน chat body
    chatBody.addEventListener('dragover', function (e) {
        e.preventDefault();
        chatBody.style.backgroundColor = '#f0f0f0'; // เปลี่ยนสีพื้นหลังเมื่อไฟล์ถูกลากเข้า
    });

    chatBody.addEventListener('dragleave', function (e) {
        e.preventDefault();
        chatBody.style.backgroundColor = ''; // คืนค่า background เมื่อไฟล์ถูกลากออก
    });

    chatBody.addEventListener('drop', function (e) {
        e.preventDefault();
        chatBody.style.backgroundColor = ''; // คืนค่า background เมื่อไฟล์ถูกปล่อย
        const file = e.dataTransfer.files[0]; // ดึงไฟล์ที่ถูก drop
        // handleFileUpload(file); // ส่งไฟล์ไปประมวลผลและอัปโหลด
        sendMediaMessage(file);
    });


    // ฟังก์ชันแสดง animation ของ dots เมื่อเริ่มส่งไฟล์หรือรูป
    function showSendingAnimation() {
        // const chatBody = document.getElementById('chat-body');
        
        // สร้าง container ของ animation
        const animationContainer = document.createElement('div');
        animationContainer.id = 'sending-animation';
        animationContainer.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        
        chatBody.appendChild(animationContainer);
        scrollToBottom(); // ให้ scroll ลงไปที่ด้านล่างสุดเพื่อดู animation
    }

    // ฟังก์ชันลบ animation ออกเมื่อส่งไฟล์สำเร็จ
    function hideSendingAnimation() {
        const animation = document.getElementById('sending-animation');
        if (animation) {
            animation.remove();
        }
    }

})();
