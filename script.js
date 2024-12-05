document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    const API_KEY = "0b71b728a6a3132d29dc3b04e53e22a6.cD792IHzZoNLwqvo";
    const API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

    // 缓存 token
    let cachedToken = null;
    let tokenExpireTime = 0;

    // 消息历史缓存
    const messageHistory = [];
    const MAX_HISTORY = 10;

    // 获取或生成 token
    function getToken() {
        const now = Date.now();
        if (cachedToken && now < tokenExpireTime) {
            return cachedToken;
        }

        try {
            const [id, secret] = API_KEY.split('.');
            const header = {
                alg: 'HS256',
                sign_type: 'SIGN'
            };

            const payload = {
                api_key: id,
                exp: now + 3600000,
                timestamp: now
            };

            cachedToken = KJUR.jws.JWS.sign('HS256', 
                JSON.stringify(header), 
                JSON.stringify(payload), 
                secret
            );
            tokenExpireTime = now + 3500000; // 提前100秒过期
            return cachedToken;
        } catch (error) {
            console.error('Token generation error:', error);
            throw error;
        }
    }

    // 发送消息到AI
    async function sendMessageToAI(message) {
        try {
            const token = getToken();
            
            // 构建消息历史
            messageHistory.push({ role: "user", content: message });
            if (messageHistory.length > MAX_HISTORY) {
                messageHistory.shift();
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    "model": "glm-4",
                    "messages": messageHistory,
                    "stream": false,
                    "temperature": 0.7,
                    "top_p": 0.95,
                    "max_tokens": 1024
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            messageHistory.push({ role: "assistant", content: aiResponse });
            return aiResponse;

        } catch (error) {
            console.error('Error in sendMessageToAI:', error);
            throw error;
        }
    }

    // 添加消息到界面
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                ${content}
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 处理用户消息
    let isProcessing = false;
    async function handleUserMessage() {
        if (isProcessing) return;

        const message = userInput.value.trim();
        if (!message) return;

        try {
            isProcessing = true;
            sendButton.disabled = true;
            userInput.disabled = true;

            addMessage(message, true);
            userInput.value = '';

            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'message ai loading';
            loadingMessage.textContent = '正在思考...';
            chatMessages.appendChild(loadingMessage);

            const response = await sendMessageToAI(message);
            chatMessages.removeChild(loadingMessage);
            addMessage(response);

        } catch (error) {
            chatMessages.removeChild(loadingMessage);
            addMessage('抱歉，发生了错误：' + error.message);
        } finally {
            isProcessing = false;
            sendButton.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        }
    }

    // 绑定事件监听器
    sendButton.onclick = handleUserMessage;
    userInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserMessage();
        }
    };

    // 导航功能
    function showSection(sectionId) {
        // 获取目标区域
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            // 平滑滚动到目标区域
            targetSection.scrollIntoView({ behavior: 'smooth' });
        }

        // 更新导航链接状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + sectionId) {
                link.classList.add('active');
            }
        });
    }

    // 监听滚动事件，更新导航状态
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('.section');
        const scrollPosition = window.scrollY;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });

    // 默认显示首页
    showSection('home');

    // 添加初始消息
    addMessage('你好！我是AI助手，有什么我可以帮你的吗？');
}); 